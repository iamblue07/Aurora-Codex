import { Router } from 'express';
import controller from '../controllers/admin.controller.js';
import authenticate from '../middleware/authenticate.js';
import { adminActionRateLimiter } from '../middleware/rate-limit.js';
import requireAdmin from '../middleware/require-admin.js';

/** Moderation and maintenance; every route requires an administrator. */
const router = Router();

router.use(authenticate, requireAdmin);

router.put('/users/:userId/permissions/:permission', controller.setPermission);
router.delete('/forum-messages/:messageId', controller.removeForumMessage);
router.delete('/listings/:listingId', controller.deleteListing);
router.delete('/forums/:forumId', controller.deleteForum);

// AI features, tunable settings and background jobs (scraper, embeddings, emotion analysis).
router.get('/ai', controller.getAiStatus);
router.post('/ai/test', adminActionRateLimiter, controller.testAiConnection);
router.get('/settings', controller.getSettings);
router.patch('/settings', controller.updateSettings);
router.get('/jobs', controller.listJobs);
router.post('/jobs', adminActionRateLimiter, controller.startJob);
router.get('/jobs/:jobId', controller.getJob);
router.post('/jobs/:jobId/cancel', controller.cancelJob);

export default router;
