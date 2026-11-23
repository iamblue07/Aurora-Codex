import '../helpers/env.js';
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { publicImageUrl, resolveStoredPath, UPLOADS_ROOT } from '../../src/config/paths.js';
import { orderByIds, paginated } from '../../src/utils/collections.js';

const { signToken, verifyToken } = await import('../../src/services/token.service.js');

describe('collections', () => {
    it('orderByIds follows the requested order and drops missing ids', () => {
        const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
        assert.deepEqual(orderByIds(rows, [3, 9, 1]), [{ id: 3 }, { id: 1 }]);
    });

    it('paginated computes totalPages (at least 1)', () => {
        assert.deepEqual(paginated([], { page: 1, limit: 10, total: 0 }), {
            items: [], page: 1, limit: 10, total: 0, totalPages: 1,
        });
        assert.equal(paginated([], { page: 1, limit: 10, total: 21 }).totalPages, 3);
    });
});

describe('stored file paths', () => {
    it('resolves paths inside the uploads folder only', () => {
        assert.equal(resolveStoredPath('images/a.jpg'), path.join(UPLOADS_ROOT, 'images', 'a.jpg'));
        assert.equal(resolveStoredPath('../.env'), null);
        assert.equal(resolveStoredPath('images/../../src/server.js'), null);
        assert.equal(resolveStoredPath(null), null);
    });

    it('exposes only public images as URLs', () => {
        assert.equal(publicImageUrl('images/a.jpg'), '/uploads/images/a.jpg');
        assert.equal(publicImageUrl('chat-media/a.jpg'), null);
        assert.equal(publicImageUrl('https://cdn.example/a.jpg'), null);
    });
});

describe('tokens', () => {
    it('round-trips the user id (the recommender reads the same `id` claim)', () => {
        assert.equal(verifyToken(signToken({ id: 7 })).id, 7);
    });

    it('rejects tampered tokens', () => {
        const token = signToken({ id: 7 });
        assert.throws(() => verifyToken(`${token.slice(0, -2)}xx`));
    });
});

describe('remote image allowlist', async () => {
    const { isAllowedImageUrl } = await import('../../src/utils/remote-image.js');
    const hosts = ['dc5.ro'];

    it('accepts HTTPS URLs on allowed hosts and their subdomains', () => {
        assert.equal(isAllowedImageUrl('https://cdn.dc5.ro/img/1.jpeg', hosts), true);
        assert.equal(isAllowedImageUrl('https://product-images.dc5.ro/1.jpeg', hosts), true);
    });

    it('rejects other hosts, look-alikes, plain HTTP, credentials and junk', () => {
        for (const url of [
            'https://evil.example/1.jpg',
            'https://dc5.ro.evil.example/1.jpg',
            'https://notdc5.ro/1.jpg',
            'http://cdn.dc5.ro/1.jpg',
            'https://user:pass@cdn.dc5.ro/1.jpg',
            'http://169.254.169.254/latest/meta-data',
            'file:///etc/passwd',
            'not a url',
        ]) {
            assert.equal(isAllowedImageUrl(url, hosts), false, url);
        }
    });
});
