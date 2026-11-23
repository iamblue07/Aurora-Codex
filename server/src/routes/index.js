import { Router } from 'express';
import { GENRES } from '../constants/genres.js';
import { getPublicFeatures } from '../services/ai/ai-status.service.js';
import asyncHandler from '../utils/async-handler.js';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import bookRoutes from './book.routes.js';
import chatRoutes from './chat.routes.js';
import forumRoutes from './forum.routes.js';
import listingRoutes from './listing.routes.js';
import meRoutes from './me.routes.js';
import reportRoutes from './report.routes.js';
import statisticsRoutes from './statistics.routes.js';
import userRoutes from './user.routes.js';

/** Everything mounted under /api. */
const api = Router();

api.use('/auth', authRoutes);
api.use('/me', meRoutes);
api.use('/users', userRoutes);
api.use('/books', bookRoutes);
api.use('/listings', listingRoutes);
api.use('/chats', chatRoutes);
api.use('/forums', forumRoutes);
api.use('/reports', reportRoutes);
api.use('/statistics', statisticsRoutes);
api.use('/admin', adminRoutes);

api.get('/genres', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=86400').json(GENRES);
});

/** Which optional features the client should show (e.g. recommendations once embeddings exist). */
api.get('/features', asyncHandler(async (_req, res) => {
    res.set('Cache-Control', 'no-store').json(await getPublicFeatures());
}));

export default api;
