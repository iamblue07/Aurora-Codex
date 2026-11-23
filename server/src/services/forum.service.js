import { Op } from 'sequelize';
import { PERMISSIONS } from '../constants/domain.js';
import { Forum, ForumMessage, User, USER_SUMMARY_ATTRIBUTES } from '../models/index.js';
import HttpError from '../utils/http-error.js';
import { toLikePattern } from '../utils/validation.js';
import { findUserWithPermission } from './user.service.js';

const withAuthor = { model: User, as: 'author', attributes: [...USER_SUMMARY_ATTRIBUTES] };

export const findForumOrThrow = async (forumId, options = {}) => {
    const forum = await Forum.findByPk(forumId, options);
    if (!forum) throw HttpError.notFound('Forum not found');
    return forum;
};

const findOwnedForumOrThrow = async (userId, forumId) => {
    const forum = await findForumOrThrow(forumId);
    if (forum.authorId !== userId) throw HttpError.forbidden('You do not own this forum');
    return forum;
};

/** Paginated forum list, newest first, optionally filtered by title and/or author. */
export const listForums = async ({ search, authorId, limit, offset }) => {
    const where = {};
    if (search) where.title = { [Op.like]: toLikePattern(search) };
    if (authorId) where.authorId = authorId;

    const { rows, count } = await Forum.findAndCountAll({
        where,
        include: [withAuthor],
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit,
        offset,
    });
    return { forums: rows, total: count };
};

export const getForum = (forumId) => findForumOrThrow(forumId, { include: [withAuthor] });

export const createForum = async (userId, title) => {
    await findUserWithPermission(userId, PERMISSIONS.createForums, 'Your permission to create forums has been revoked');
    const forum = await Forum.create({ title, authorId: userId });
    return getForum(forum.id);
};

/** Owner-only update of the title and/or open status. */
export const updateForum = async (userId, forumId, changes) => {
    const forum = await findOwnedForumOrThrow(userId, forumId);
    await forum.update(changes);
    return getForum(forum.id);
};

export const listMessages = async (forumId, { limit, offset }) => {
    await findForumOrThrow(forumId, { attributes: ['id'] });
    const { rows, count } = await ForumMessage.findAndCountAll({
        where: { forumId },
        include: [{ model: User, as: 'author', attributes: [...USER_SUMMARY_ATTRIBUTES] }],
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit,
        offset,
    });
    return { messages: rows, total: count };
};

export const postMessage = async (userId, forumId, content) => {
    const [forum] = await Promise.all([
        findForumOrThrow(forumId),
        findUserWithPermission(userId, PERMISSIONS.sendMessages, 'Your permission to send messages has been revoked'),
    ]);
    if (!forum.isOpen) throw HttpError.forbidden('Forum is closed');

    const message = await ForumMessage.create({ forumId, authorId: userId, content });
    return ForumMessage.findByPk(message.id, {
        include: [{ model: User, as: 'author', attributes: [...USER_SUMMARY_ATTRIBUTES] }],
    });
};

/** Deletes a forum; its messages are removed by ON DELETE CASCADE. */
export const removeForum = (forum) => forum.destroy();
