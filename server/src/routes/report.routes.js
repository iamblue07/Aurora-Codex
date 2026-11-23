import { Router } from 'express';
import controller from '../controllers/report.controller.js';
import authenticate from '../middleware/authenticate.js';
import { contentRateLimiter } from '../middleware/rate-limit.js';
import requireAdmin from '../middleware/require-admin.js';

const router = Router();

router.use(authenticate);

router.post('/', contentRateLimiter, controller.create);
router.get('/', requireAdmin, controller.list);
router.get('/:reportId', requireAdmin, controller.getReport);
router.patch('/:reportId', requireAdmin, controller.update);

export default router;
