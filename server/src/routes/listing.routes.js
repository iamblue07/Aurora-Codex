import { Router } from 'express';
import { MAX_LISTING_IMAGES } from '../constants/domain.js';
import controller from '../controllers/listing.controller.js';
import authenticate from '../middleware/authenticate.js';
import optionalAuthenticate from '../middleware/optional-authenticate.js';
import { contentRateLimiter, uploadRateLimiter } from '../middleware/rate-limit.js';
import { uploadImages } from '../middleware/upload.js';

/** Marketplace listings. */
const router = Router();

router.get('/', optionalAuthenticate, controller.search);
router.get('/cities', controller.cities);
router.post('/', authenticate, uploadRateLimiter, uploadImages('images', MAX_LISTING_IMAGES), controller.create);
router.get('/:listingId', optionalAuthenticate, controller.getListing);
router.get('/:listingId/similar', optionalAuthenticate, controller.similar);
router.get('/:listingId/image', controller.getImage);
router.patch('/:listingId', authenticate, contentRateLimiter, controller.update);
router.post('/:listingId/close', authenticate, controller.close);
router.delete('/:listingId', authenticate, controller.remove);

router.post('/:listingId/images', authenticate, uploadRateLimiter, uploadImages('images', MAX_LISTING_IMAGES), controller.addImages);
router.delete('/:listingId/images/:imageId', authenticate, controller.removeImage);
router.put('/:listingId/images/:imageId/cover', authenticate, controller.setCover);

router.put('/:listingId/favorite', authenticate, controller.favorite);
router.delete('/:listingId/favorite', authenticate, controller.unfavorite);

router.get('/:listingId/chat', authenticate, controller.getMyChat);
router.post('/:listingId/chats', authenticate, contentRateLimiter, controller.startChat);

export default router;
