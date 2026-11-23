import { Router } from 'express';
import controller from '../controllers/user.controller.js';

/** Public user profiles. */
const router = Router();

router.get('/:userId', controller.getProfile);
router.get('/:userId/avatar', controller.getAvatar);
router.get('/:userId/listings', controller.getListings);
router.get('/:userId/forums', controller.getForums);

export default router;
