import { Router } from 'express';
import controller from '../controllers/forum.controller.js';
import authenticate from '../middleware/authenticate.js';
import optionalAuthenticate from '../middleware/optional-authenticate.js';
import { contentRateLimiter } from '../middleware/rate-limit.js';

const router = Router();

// Fixed paths first, so "categories" and "messages" are never read as a thread id.
router.get('/categories', controller.listCategories);
router.patch('/messages/:messageId', authenticate, contentRateLimiter, controller.editMessage);
router.delete('/messages/:messageId', authenticate, controller.deleteMessage);
router.put('/messages/:messageId/like', authenticate, contentRateLimiter, controller.like);
router.delete('/messages/:messageId/like', authenticate, controller.unlike);

router.get('/', controller.list);
router.post('/', authenticate, contentRateLimiter, controller.create);
router.get('/:forumId', optionalAuthenticate, controller.getForum);
router.patch('/:forumId', authenticate, controller.update);
router.get('/:forumId/messages', optionalAuthenticate, controller.listMessages);
router.post('/:forumId/messages', authenticate, contentRateLimiter, controller.postMessage);

export default router;
