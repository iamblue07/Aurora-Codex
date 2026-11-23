import { Router } from 'express';
import controller from '../controllers/forum.controller.js';
import authenticate from '../middleware/authenticate.js';
import { contentRateLimiter } from '../middleware/rate-limit.js';

const router = Router();

router.get('/', controller.list);
router.post('/', authenticate, contentRateLimiter, controller.create);
router.get('/:forumId', controller.getForum);
router.patch('/:forumId', authenticate, controller.update);
router.get('/:forumId/messages', controller.listMessages);
router.post('/:forumId/messages', authenticate, contentRateLimiter, controller.postMessage);

export default router;
