import { serializeForum, serializeListingSummary, serializePublicProfile } from '../serializers/index.js';
import * as forumService from '../services/forum.service.js';
import * as listingService from '../services/listing.service.js';
import * as userService from '../services/user.service.js';
import { wrapController } from '../utils/async-handler.js';
import { paginated } from '../utils/collections.js';
import { sendStoredFile } from '../utils/files.js';
import { parseId, parsePagination } from '../utils/validation.js';

/** Public information about any user. */
export default wrapController({
    async getProfile(req, res) {
        const { user, favoriteGenres } = await userService.getPublicProfile(parseId(req.params.userId, 'userId'));
        res.json(serializePublicProfile(user, favoriteGenres));
    },

    async getAvatar(req, res) {
        const avatarPath = await userService.getAvatarPath(parseId(req.params.userId, 'userId'));
        await sendStoredFile(res, avatarPath, 'Avatar not found');
    },

    async getListings(req, res) {
        const listings = await listingService.getListingsBySeller(parseId(req.params.userId, 'userId'));
        res.json(listings.map(serializeListingSummary));
    },

    async getForums(req, res) {
        const pagination = parsePagination(req.query.page, req.query.limit);
        const { forums, total } = await forumService.listForums({
            ...pagination,
            authorId: parseId(req.params.userId, 'userId'),
        });
        res.json(paginated(forums.map(serializeForum), { ...pagination, total }));
    },
});
