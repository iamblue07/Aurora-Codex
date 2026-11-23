import { toStoredPath, UPLOAD_FOLDERS } from '../config/paths.js';
import { serializeChat, serializeChatMessage } from '../serializers/index.js';
import * as chatService from '../services/chat.service.js';
import { wrapController } from '../utils/async-handler.js';
import { sendStoredFile } from '../utils/files.js';
import HttpError from '../utils/http-error.js';
import { parseBoolean, parseId, requireString } from '../utils/validation.js';

const chatIdParam = (req) => parseId(req.params.chatId, 'chatId');

/** Marketplace conversations. Every route requires authentication. */
export default wrapController({
    async getChat(req, res) {
        res.json(serializeChat(await chatService.getChat(req.user.id, chatIdParam(req)), req.user.id));
    },

    async update(req, res) {
        const isOpen = parseBoolean(req.body?.isOpen, 'isOpen');
        res.json(serializeChat(await chatService.setChatOpen(req.user.id, chatIdParam(req), isOpen), req.user.id));
    },

    async getMessages(req, res) {
        const messages = await chatService.getMessages(req.user.id, chatIdParam(req));
        res.json(messages.map((message) => serializeChatMessage(message, req.user.id)));
    },

    async sendMessage(req, res) {
        const content = requireString(req.body?.content, 'content', { maxLength: 2000 });
        const message = await chatService.postMessage(req.user.id, chatIdParam(req), { content });
        res.status(201).json(serializeChatMessage(message, req.user.id));
    },

    /** POST /api/chats/:chatId/media (multipart/form-data with a `file`). */
    async sendMedia(req, res) {
        if (!req.file) throw HttpError.badRequest('No file uploaded');
        const mediaPath = toStoredPath(UPLOAD_FOLDERS.chatMedia, req.file.filename);
        const message = await chatService.postMessage(req.user.id, chatIdParam(req), { mediaPath });
        res.status(201).json(serializeChatMessage(message, req.user.id));
    },

    async getMedia(req, res) {
        const mediaPath = await chatService.getMessageMediaPath(
            req.user.id,
            chatIdParam(req),
            parseId(req.params.messageId, 'messageId'),
        );
        res.set('Cache-Control', 'private, max-age=3600');
        await sendStoredFile(res, mediaPath, 'File not found');
    },
});
