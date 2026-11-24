import {
    serializeForum, serializeForumCategory, serializeForumCategorySummary, serializeForumMessage,
} from '../serializers/index.js';
import * as forumService from '../services/forum.service.js';
import { wrapController } from '../utils/async-handler.js';
import { paginated } from '../utils/collections.js';
import HttpError from '../utils/http-error.js';
import {
    optionalString, parseBoolean, parseId, parseOptionalEnum, parseOptionalId, parsePagination, requireString,
} from '../utils/validation.js';

const forumIdParam = (req) => parseId(req.params.forumId, 'forumId');
const messageIdParam = (req) => parseId(req.params.messageId, 'messageId');
const parseTitle = (value) => requireString(value, 'title', { minLength: 3, maxLength: 160 });
const parsePost = (value, minLength = 2) => requireString(value, 'content', { minLength, maxLength: 10_000 });
const MESSAGES_PAGE = { defaultLimit: 15, maxLimit: 50 };

export default wrapController({
    /** GET /api/forums/categories — the board: categories with counts and latest thread. */
    async listCategories(_req, res) {
        const [categories, stats] = await Promise.all([forumService.listCategories(), forumService.getBoardStats()]);
        res.json({ categories: categories.map(serializeForumCategorySummary), stats });
    },

    /** GET /api/forums?category=&search=&sort=activity|newest|replies|views&page=&limit= */
    async list(req, res) {
        const pagination = parsePagination(req.query.page, req.query.limit, { defaultLimit: 20, maxLimit: 50 });
        const slug = optionalString(req.query.category, 'category', { maxLength: 64 });
        const category = slug ? await forumService.findCategoryOrThrow({ slug }) : null;
        const { forums, total } = await forumService.listForums({
            ...pagination,
            categoryId: category?.id,
            bookId: req.query.book === undefined ? undefined : parseId(req.query.book, 'book'),
            search: optionalString(req.query.search, 'search', { maxLength: 255 }),
            sort: parseOptionalEnum(req.query.sort, 'sort', forumService.FORUM_SORTS, 'activity'),
        });
        res.json({
            ...paginated(forums.map(serializeForum), { ...pagination, total }),
            category: category ? serializeForumCategory(category) : null,
        });
    },

    /** POST /api/forums  body: { title, content, categoryId, bookId? } — thread + opening post. */
    async create(req, res) {
        const body = req.body ?? {};
        const forum = await forumService.createForum(req.user.id, {
            title: parseTitle(body.title),
            content: parsePost(body.content, 10),
            categoryId: parseId(body.categoryId, 'categoryId'),
            bookId: parseOptionalId(body.bookId, 'bookId'),
        });
        res.status(201).json(serializeForum(forum));
    },

    /** GET /api/forums/:forumId — also counts a view (once per visitor per half hour). */
    async getForum(req, res) {
        const forumId = forumIdParam(req);
        const forum = await forumService.getForum(forumId);
        const viewer = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
        if (await forumService.recordView(forumId, viewer)) forum.viewCount += 1;
        res.json(serializeForum(forum));
    },

    /** PATCH /api/forums/:forumId — author: title, isOpen; administrators also isPinned, categoryId. */
    async update(req, res) {
        const body = req.body ?? {};
        const changes = {};
        if (body.title !== undefined) changes.title = parseTitle(body.title);
        if (body.isOpen !== undefined) changes.isOpen = parseBoolean(body.isOpen, 'isOpen');
        if (body.isPinned !== undefined) changes.isPinned = parseBoolean(body.isPinned, 'isPinned');
        if (body.categoryId !== undefined) changes.categoryId = parseId(body.categoryId, 'categoryId');
        if (Object.keys(changes).length === 0) {
            throw HttpError.badRequest('Nothing to update (allowed: title, isOpen, isPinned, categoryId)');
        }
        res.json(serializeForum(await forumService.updateForum(req.user.id, forumIdParam(req), changes)));
    },

    /** GET /api/forums/:forumId/messages — chronological, with positions and likes. */
    async listMessages(req, res) {
        const pagination = parsePagination(req.query.page, req.query.limit, MESSAGES_PAGE);
        const { posts, total } = await forumService.listMessages(forumIdParam(req), pagination, req.user?.id ?? null);
        const items = posts.map(({ message, ...extras }) => serializeForumMessage(message, extras));
        res.json(paginated(items, { ...pagination, total }));
    },

    /** POST /api/forums/:forumId/messages  body: { content, replyToId? } → { id, position } */
    async postMessage(req, res) {
        const result = await forumService.postMessage(req.user.id, forumIdParam(req), {
            content: parsePost(req.body?.content),
            replyToId: parseOptionalId(req.body?.replyToId, 'replyToId'),
        });
        res.status(201).json(result);
    },

    /** PATCH /api/forums/messages/:messageId  body: { content } — the author edits their post. */
    async editMessage(req, res) {
        res.json(await forumService.editMessage(req.user.id, messageIdParam(req), parsePost(req.body?.content)));
    },

    /** DELETE /api/forums/messages/:messageId — the author deletes their post. */
    async deleteMessage(req, res) {
        await forumService.deleteOwnMessage(req.user.id, messageIdParam(req));
        res.status(204).end();
    },

    async like(req, res) {
        res.json(await forumService.setLike(req.user.id, messageIdParam(req), true));
    },

    async unlike(req, res) {
        res.json(await forumService.setLike(req.user.id, messageIdParam(req), false));
    },
});
