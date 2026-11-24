import { Router } from 'express';
import controller from '../controllers/auth.controller.js';
import authenticate from '../middleware/authenticate.js';
import {
    availabilityRateLimiter, credentialsRateLimiter, loginAccountRateLimiter, sessionRefreshRateLimiter,
} from '../middleware/rate-limit.js';

const router = Router();

router.post('/availability', availabilityRateLimiter, controller.checkAvailability);
router.post('/register', credentialsRateLimiter, controller.register);
router.post('/login', credentialsRateLimiter, loginAccountRateLimiter, controller.login);
// Swaps a still-valid token for a fresh one, so active users aren't logged out after an hour.
router.post('/refresh', authenticate, sessionRefreshRateLimiter, controller.refresh);

export default router;
