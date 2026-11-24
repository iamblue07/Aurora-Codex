import { Router } from 'express';
import controller from '../controllers/statistics.controller.js';

const router = Router();

router.get('/listings', controller.getListingStatistics);
router.get('/books', controller.getBookStatistics);
router.get('/community', controller.getCommunityStatistics);
router.get('/authors', controller.getAuthorStatistics);

export default router;
