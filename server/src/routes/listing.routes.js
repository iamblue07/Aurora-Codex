import { Router } from 'express';
import controller from '../controllers/listing.controller.js';
import authenticate from '../middleware/authenticate.js';
import { contentRateLimiter, uploadRateLimiter } from '../middleware/rate-limit.js';
import optionalAuthenticate from '../middleware/optional-authenticate.js';
import { uploadImage } from '../middleware/upload.js';

/** Marketplace listings. */
const router = Router();

router.get('/', controller.search);
router.post('/', authenticate, uploadRateLimiter, uploadImage('image'), controller.create);
router.get('/:listingId', optionalAuthenticate, controller.getListing);
router.get('/:listingId/image', controller.getImage);
router.patch('/:listingId', authenticate, controller.update);
router.post('/:listingId/close', authenticate, controller.close);
router.delete('/:listingId', authenticate, controller.remove);

router.get('/:listingId/chat', authenticate, controller.getMyChat);
router.post('/:listingId/chats', authenticate, contentRateLimiter, controller.startChat);

export default router;
