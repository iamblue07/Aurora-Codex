import { coverUrl } from '../serializers/index.js';
import * as statisticsService from '../services/statistics.service.js';
import { wrapController } from '../utils/async-handler.js';
import { optionalString, parsePagination } from '../utils/validation.js';

// Aggregations over the whole catalogue are fairly expensive and change slowly.
const CACHE_HEADER = 'public, max-age=300';

export default wrapController({
    async getListingStatistics(_req, res) {
        res.set('Cache-Control', CACHE_HEADER).json(await statisticsService.getListingStatistics());
    },

    async getBookStatistics(_req, res) {
        res.set('Cache-Control', CACHE_HEADER).json(await statisticsService.getBookStatistics());
    },

    async getCommunityStatistics(_req, res) {
        const stats = await statisticsService.getCommunityStatistics();
        const topRatedBooks = stats.topRatedBooks.map((book) => {
            const { coverImage: _cover, ...rest } = book;
            return { ...rest, coverUrl: coverUrl(book) };
        });
        res.set('Cache-Control', CACHE_HEADER).json({ ...stats, topRatedBooks });
    },

    /** GET /api/statistics/authors?search=&limit= — per-author stats, most prolific first. */
    async getAuthorStatistics(req, res) {
        const { limit } = parsePagination(1, req.query.limit, { defaultLimit: 10, maxLimit: 25 });
        const search = optionalString(req.query.search, 'search', { maxLength: 255 });
        res.set('Cache-Control', CACHE_HEADER).json(await statisticsService.getAuthorStatistics({ search, limit }));
    },
});
