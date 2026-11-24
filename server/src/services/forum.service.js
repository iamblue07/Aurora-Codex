/**
 * The forum board: categories → threads (`Forum`) → posts (`ForumMessage`).
 *
 * A thread's first post is its opening post. Each thread stores its post count and last activity
 * (`messageCount`, `lastMessageAt`, `lastMessageAuthorId`); every write that adds posts keeps them
 * up to date, so lists sort by activity cheaply. Posts are read in chronological order.
 */
import { Op, QueryTypes, Sequelize } from 'sequelize';
import { PERMISSIONS } from '../constants/domain.js';
import {
    Book, Forum, ForumCategory, ForumMessage, ForumMessageLike, sequelize, User, USER_SUMMARY_ATTRIBUTES,
} from '../models/index.js';
import HttpError from '../utils/http-error.js';
import { createViewCounter } from '../utils/view-counter.js';
import { toLikePattern } from '../utils/validation.js';
import { findUserOrThrow, findUserWithPermission } from './user.service.js';

export const FORUM_SORTS = Object.freeze(['activity', 'newest', 'replies', 'views']);

const SORT_ORDER = {
    activity: [['lastMessageAt', 'DESC']],
    newest: [['createdAt', 'DESC']],
    replies: [['messageCount', 'DESC'], ['lastMessageAt', 'DESC']],
    views: [['viewCount', 'DESC'], ['lastMessageAt', 'DESC']],
};

/** Author shown next to a post: name, avatar, role and seniority. */
const POST_AUTHOR_ATTRIBUTES = [...USER_SUMMARY_ATTRIBUTES, 'isAdmin', 'createdAt'];

const threadIncludes = [
    { model: User, as: 'author', attributes: [...USER_SUMMARY_ATTRIBUTES] },
    { model: User, as: 'lastMessageAuthor', attributes: [...USER_SUMMARY_ATTRIBUTES] },
    { model: ForumCategory, as: 'category' },
    { model: Book, as: 'book', attributes: ['id', 'title', 'author', 'coverImage'] },
];

const NO_FORUM_RIGHTS = 'Your permission to create forums has been revoked';
const NO_MESSAGE_RIGHTS = 'Your permission to send messages has been revoked';

// --- Categories ---------------------------------------------------------------------------------

/** Every category with its thread and post counts and the most recently active thread. */
export const listCategories = async () => {
    const [categories, totals] = await Promise.all([
        ForumCategory.findAll({ order: [['position', 'ASC'], ['id', 'ASC']] }),
        sequelize.query(
            `SELECT category_id AS categoryId, COUNT(*) AS threads, COALESCE(SUM(message_count), 0) AS posts
             FROM forums GROUP BY category_id`,
            { type: QueryTypes.SELECT },
        ),
    ]);
    const totalsById = new Map(totals.map((row) => [row.categoryId, row]));
    const latest = await Promise.all(categories.map((category) => Forum.findOne({
        where: { categoryId: category.id },
        attributes: ['id', 'title', 'lastMessageAt'],
        include: [{ model: User, as: 'lastMessageAuthor', attributes: [...USER_SUMMARY_ATTRIBUTES] }],
        order: [['lastMessageAt', 'DESC'], ['id', 'DESC']],
    })));
    return categories.map((category, index) => ({
        category,
        threadCount: Number(totalsById.get(category.id)?.threads ?? 0),
        postCount: Number(totalsById.get(category.id)?.posts ?? 0),
        latestThread: latest[index],
    }));
};

export const findCategoryOrThrow = async (where) => {
    const category = await ForumCategory.findOne({ where });
    if (!category) throw HttpError.notFound('Forum category not found');
    return category;
};

/** Totals for the board header. */
export const getBoardStats = async () => {
    const [[row]] = await sequelize.query(`SELECT
        (SELECT COUNT(*) FROM forums) AS threads,
        (SELECT COUNT(*) FROM forum_messages) AS posts,
        (SELECT COUNT(DISTINCT author_id) FROM forum_messages) AS members`);
    return { threads: Number(row.threads), posts: Number(row.posts), members: Number(row.members) };
};

// --- Threads -----------------------------------------------------------------------------------

export const findForumOrThrow = async (forumId, options = {}) => {
    const forum = await Forum.findByPk(forumId, options);
    if (!forum) throw HttpError.notFound('Forum not found');
    return forum;
};

/**
 * Paginated threads, pinned first (within a category), then by `sort`.
 * Filters: category, title search, author.
 */
export const listForums = async ({ categoryId, bookId, search, authorId, sort = 'activity', limit, offset }) => {
    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) where.title = { [Op.like]: toLikePattern(search) };
    if (authorId) where.authorId = authorId;
    if (bookId) where.bookId = bookId;

    const order = [...(categoryId ? [['isPinned', 'DESC']] : []), ...SORT_ORDER[sort], ['id', 'DESC']];
    const { rows, count } = await Forum.findAndCountAll({
        where, include: threadIncludes, order, limit, offset, distinct: true,
    });
    return { forums: rows, total: count };
};

export const getForum = (forumId) => findForumOrThrow(forumId, { include: threadIncludes });

/** Views are counted at most once per visitor and thread every 30 minutes. */
const shouldCountView = createViewCounter();

export const recordView = async (forumId, viewerKey) => {
    if (!shouldCountView(`${forumId}:${viewerKey}`)) return false;
    await Forum.increment('viewCount', { where: { id: forumId } });
    return true;
};

/** Recomputes the stored post count and last activity of the given threads. */
export const refreshForumStats = async (forumIds, transaction) => {
    if (forumIds.length === 0) return;
    await sequelize.query(`UPDATE forums f SET
        message_count = (SELECT COUNT(*) FROM forum_messages m WHERE m.forum_id = f.id),
        last_message_at = COALESCE((SELECT MAX(m.created_at) FROM forum_messages m WHERE m.forum_id = f.id), f.created_at),
        last_message_author_id = (
            SELECT m.author_id FROM forum_messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1
        )
        WHERE f.id IN (:forumIds)`, { replacements: { forumIds }, transaction });
};

/** Opens a thread together with its opening post. */
export const createForum = async (userId, { title, content, categoryId, bookId = null }) => {
    await Promise.all([
        findUserWithPermission(userId, PERMISSIONS.createForums, NO_FORUM_RIGHTS),
        findCategoryOrThrow({ id: categoryId }),
        bookId ? Book.count({ where: { id: bookId } }).then((n) => {
            if (!n) throw HttpError.badRequest('The linked book does not exist');
        }) : null,
    ]);

    const forumId = await sequelize.transaction(async (transaction) => {
        const now = new Date();
        const forum = await Forum.create({
            title, categoryId, bookId, authorId: userId,
            messageCount: 1, lastMessageAt: now, lastMessageAuthorId: userId,
        }, { transaction });
        await ForumMessage.create({ forumId: forum.id, authorId: userId, content }, { transaction });
        return forum.id;
    });
    return getForum(forumId);
};

/**
 * Updates a thread. The author may rename it and close/reopen it; administrators may also pin
 * it and move it to another category.
 */
export const updateForum = async (userId, forumId, changes) => {
    const [forum, user] = await Promise.all([
        findForumOrThrow(forumId),
        findUserOrThrow(userId, { attributes: ['id', 'isAdmin'] }),
    ]);
    const isOwner = forum.authorId === userId;
    if (!isOwner && !user.isAdmin) throw HttpError.forbidden('You do not own this forum');
    if ((changes.isPinned !== undefined || changes.categoryId !== undefined) && !user.isAdmin) {
        throw HttpError.forbidden('Only administrators can pin threads or move them');
    }
    if (changes.categoryId !== undefined) await findCategoryOrThrow({ id: changes.categoryId });

    await forum.update(changes);
    return getForum(forum.id);
};

/** Deletes a thread; its posts are removed by ON DELETE CASCADE. */
export const removeForum = (forum) => forum.destroy();

// --- Posts -------------------------------------------------------------------------------------

const messageIncludes = [
    { model: User, as: 'author', attributes: POST_AUTHOR_ATTRIBUTES },
    {
        model: ForumMessage,
        as: 'replyTo',
        attributes: ['id', 'content', 'isRemoved', 'authorId'],
        include: [{ model: User, as: 'author', attributes: ['id', 'username'] }],
    },
];

/** Like counts, the viewer's likes and the authors' post counts for a page of posts. */
const loadPostExtras = async (messages, viewerId) => {
    const messageIds = messages.map((message) => message.id);
    const authorIds = [...new Set(messages.map((message) => message.authorId).filter(Boolean))];
    if (messageIds.length === 0) return { likeCounts: new Map(), likedByViewer: new Set(), postCounts: new Map() };

    const [likeRows, viewerLikes, postRows] = await Promise.all([
        ForumMessageLike.findAll({
            attributes: ['messageId', [Sequelize.fn('COUNT', Sequelize.col('user_id')), 'count']],
            where: { messageId: messageIds },
            group: ['messageId'],
            raw: true,
        }),
        viewerId
            ? ForumMessageLike.findAll({ attributes: ['messageId'], where: { messageId: messageIds, userId: viewerId }, raw: true })
            : [],
        authorIds.length
            ? ForumMessage.findAll({
                attributes: ['authorId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
                where: { authorId: authorIds, isRemoved: false },
                group: ['authorId'],
                raw: true,
            })
            : [],
    ]);
    return {
        likeCounts: new Map(likeRows.map((row) => [row.messageId, Number(row.count)])),
        likedByViewer: new Set(viewerLikes.map((row) => row.messageId)),
        postCounts: new Map(postRows.map((row) => [row.authorId, Number(row.count)])),
    };
};

/**
 * A page of a thread's posts in chronological order, each with its position in the thread
 * (#1 is the opening post), like count, whether the viewer liked it and its author's post count.
 */
export const listMessages = async (forumId, { limit, offset }, viewerId = null) => {
    await findForumOrThrow(forumId, { attributes: ['id'] });
    const { rows, count } = await ForumMessage.findAndCountAll({
        where: { forumId },
        include: messageIncludes,
        order: [['createdAt', 'ASC'], ['id', 'ASC']],
        limit,
        offset,
        distinct: true,
    });
    const extras = await loadPostExtras(rows, viewerId);
    const posts = rows.map((message, index) => ({
        message,
        position: offset + index + 1,
        likeCount: extras.likeCounts.get(message.id) ?? 0,
        likedByViewer: extras.likedByViewer.has(message.id),
        authorPostCount: extras.postCounts.get(message.authorId) ?? 0,
    }));
    return { posts, total: count };
};

/** 1-based position of a post in its thread (chronological order). */
const positionOf = (message) => ForumMessage.count({
    where: {
        forumId: message.forumId,
        [Op.or]: [
            { createdAt: { [Op.lt]: message.createdAt } },
            { createdAt: message.createdAt, id: { [Op.lte]: message.id } },
        ],
    },
});

/** Posts a reply (optionally answering another post of the same thread). */
export const postMessage = async (userId, forumId, { content, replyToId = null }) => {
    const [forum] = await Promise.all([
        findForumOrThrow(forumId),
        findUserWithPermission(userId, PERMISSIONS.sendMessages, NO_MESSAGE_RIGHTS),
    ]);
    if (!forum.isOpen) throw HttpError.forbidden('Forum is closed');
    if (replyToId && !await ForumMessage.count({ where: { id: replyToId, forumId } })) {
        throw HttpError.badRequest('The quoted post is not in this thread');
    }

    const message = await sequelize.transaction(async (transaction) => {
        const created = await ForumMessage.create({ forumId, authorId: userId, content, replyToId }, { transaction });
        await forum.update({
            messageCount: forum.messageCount + 1,
            lastMessageAt: created.createdAt,
            lastMessageAuthorId: userId,
        }, { transaction });
        return created;
    });
    return { id: message.id, position: await positionOf(message) };
};

const findOwnPostOrThrow = async (userId, messageId) => {
    const message = await ForumMessage.findByPk(messageId, { include: [{ model: Forum, as: 'forum', attributes: ['id', 'isOpen'] }] });
    if (!message || message.isRemoved) throw HttpError.notFound('Message not found');
    if (message.authorId !== userId) throw HttpError.forbidden('You can only change your own posts');
    return message;
};

/** The author edits their post (not in closed threads). */
export const editMessage = async (userId, messageId, content) => {
    const [message] = await Promise.all([
        findOwnPostOrThrow(userId, messageId),
        findUserWithPermission(userId, PERMISSIONS.sendMessages, NO_MESSAGE_RIGHTS),
    ]);
    if (message.isRemoved) throw HttpError.notFound('Message not found');
    if (!message.forum.isOpen) throw HttpError.forbidden('Forum is closed');
    await message.update({ content, editedAt: new Date() });
    return { id: message.id, content: message.content, editedAt: message.editedAt };
};

/** The author deletes their post: it stays in the thread as "deleted" so numbering is kept. */
export const deleteOwnMessage = async (userId, messageId) => {
    const message = await findOwnPostOrThrow(userId, messageId);
    await message.update({ isRemoved: true });
};

/** Likes or unlikes a post (not one's own). */
export const setLike = async (userId, messageId, liked) => {
    const message = await ForumMessage.findByPk(messageId, { attributes: ['id', 'authorId', 'isRemoved'] });
    if (!message || message.isRemoved) throw HttpError.notFound('Message not found');
    if (message.authorId === userId) throw HttpError.badRequest('You cannot like your own post');

    if (liked) await ForumMessageLike.findOrCreate({ where: { messageId, userId } });
    else await ForumMessageLike.destroy({ where: { messageId, userId } });
    const likeCount = await ForumMessageLike.count({ where: { messageId } });
    return { likeCount, likedByMe: liked };
};
