import { Router } from 'express';
import controller from '../controllers/chat.controller.js';
import authenticate from '../middleware/authenticate.js';
import { contentRateLimiter, uploadRateLimiter } from '../middleware/rate-limit.js';
import { uploadChatMedia } from '../middleware/upload.js';

/** Marketplace conversations (list your own via GET /api/me/chats). */
const router = Router();

router.use(authenticate);

router.get('/:chatId', controller.getChat);
router.patch('/:chatId', controller.update);
router.get('/:chatId/messages', controller.getMessages);
router.post('/:chatId/messages', contentRateLimiter, controller.sendMessage);
router.post('/:chatId/media', uploadRateLimiter, uploadChatMedia('file'), controller.sendMedia);
router.get('/:chatId/messages/:messageId/media', controller.getMedia);

export default router;
