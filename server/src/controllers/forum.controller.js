import { serializeForum, serializeForumMessage } from '../serializers/index.js';
import * as forumService from '../services/forum.service.js';
import { wrapController } from '../utils/async-handler.js';
import { paginated } from '../utils/collections.js';
import HttpError from '../utils/http-error.js';
import { optionalString, parseBoolean, parseId, parsePagination, requireString } from '../utils/validation.js';

const forumIdParam = (req) => parseId(req.params.forumId, 'forumId');
const parseTitle = (value) => requireString(value, 'title', { minLength: 3, maxLength: 255 });

export default wrapController({
    async list(req, res) {
        const pagination = parsePagination(req.query.page, req.query.limit);
        const { forums, total } = await forumService.listForums({
            ...pagination,
            search: optionalString(req.query.search, 'search', { maxLength: 255 }),
        });
        res.json(paginated(forums.map(serializeForum), { ...pagination, total }));
    },

    async create(req, res) {
        const forum = await forumService.createForum(req.user.id, parseTitle(req.body?.title));
        res.status(201).json(serializeForum(forum));
    },

    async getForum(req, res) {
        res.json(serializeForum(await forumService.getForum(forumIdParam(req))));
    },

    /** PATCH /api/forums/:forumId — owner can rename and open/close the forum. */
    async update(req, res) {
        const body = req.body ?? {};
        const changes = {};
        if (body.title !== undefined) changes.title = parseTitle(body.title);
        if (body.isOpen !== undefined) changes.isOpen = parseBoolean(body.isOpen, 'isOpen');
        if (Object.keys(changes).length === 0) throw HttpError.badRequest('Nothing to update (allowed: title, isOpen)');

        res.json(serializeForum(await forumService.updateForum(req.user.id, forumIdParam(req), changes)));
    },

    async listMessages(req, res) {
        const pagination = parsePagination(req.query.page, req.query.limit);
        const { messages, total } = await forumService.listMessages(forumIdParam(req), pagination);
        res.json(paginated(messages.map(serializeForumMessage), { ...pagination, total }));
    },

    async postMessage(req, res) {
        const content = requireString(req.body?.content, 'content', { maxLength: 2000 });
        const message = await forumService.postMessage(req.user.id, forumIdParam(req), content);
        res.status(201).json(serializeForumMessage(message));
    },
});
