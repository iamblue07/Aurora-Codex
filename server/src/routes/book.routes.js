import { Router } from 'express';
import controller from '../controllers/book.controller.js';
import authenticate from '../middleware/authenticate.js';

const router = Router();

router.get('/', controller.search);
router.get('/lookup', controller.lookup);
router.get('/random', controller.random);
router.get('/:bookId', controller.getBook);
router.get('/:bookId/cover', controller.getCover);
router.get('/:bookId/offers', controller.getOffers);
router.get('/:bookId/listings', controller.getListings);
router.get('/:bookId/external-info', controller.getExternalInfo);

router.get('/:bookId/rating', authenticate, controller.getRating);
router.put('/:bookId/rating', authenticate, controller.rate);
router.delete('/:bookId/rating', authenticate, controller.removeRating);

export default router;
