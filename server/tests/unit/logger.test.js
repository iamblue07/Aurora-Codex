import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Fake secrets for this test process only.
process.env.DEEPINFRA_API_KEY = 'fake-deepinfra-key-123456';
process.env.SECRET_KEY = 'fake-jwt-secret-abcdef';

const { redact } = await import('../../src/utils/logger.js');

describe('log redaction', () => {
    it('removes configured secrets wherever they appear', () => {
        const line = redact('key=fake-deepinfra-key-123456 secret=fake-jwt-secret-abcdef ok');
        assert.equal(line, 'key=[redacted] secret=[redacted] ok');
    });

    it('removes bearer tokens', () => {
        assert.equal(redact('Authorization: Bearer eyJhbGciOi.payload.sig'), 'Authorization: Bearer [redacted]');
    });

    it('leaves ordinary text alone', () => {
        assert.equal(redact('Server listening on port 3000'), 'Server listening on port 3000');
    });
});
