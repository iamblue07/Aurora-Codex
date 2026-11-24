import { Router } from 'express';
import controller from '../controllers/me.controller.js';
import authenticate from '../middleware/authenticate.js';
import {
    aiGlobalRateLimiter, aiUserRateLimiters, passwordChangeRateLimiter, uploadRateLimiter,
} from '../middleware/rate-limit.js';
import { uploadImage } from '../middleware/upload.js';

/** The authenticated user's own account and data. */
const router = Router();

router.use(authenticate);

router.get('/', controller.getAccount);
router.patch('/', controller.updateAccount);
router.put('/password', passwordChangeRateLimiter, controller.changePassword);
router.put('/avatar', uploadRateLimiter, uploadImage('image'), controller.uploadAvatar);

router.get('/favorite-genres', controller.getFavoriteGenres);
router.put('/favorite-genres', controller.setFavoriteGenres);

router.get('/reading-history', controller.getReadingHistory);
router.get('/recommendations', controller.getRecommendations);
// Each request may call the paid AI provider: per-user and global budgets apply.
router.post('/recommendations', aiUserRateLimiters, aiGlobalRateLimiter, controller.generateRecommendations);

router.get('/listings', controller.getListings);
router.get('/favorite-listings', controller.getFavoriteListings);
router.get('/forums', controller.getForums);
router.get('/chats', controller.getChats);

export default router;
