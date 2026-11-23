import '../helpers/env.js';
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

// A fake key and endpoint: these tests never reach the real provider (fetch is mocked).
process.env.DEEPINFRA_API_KEY = 'test-key';
process.env.DEEPINFRA_BASE_URL = 'https://ai.example.test/v1/openai';

const { AiProviderError, completeJson, embed, redactSecret } = await import('../../src/services/ai/deepinfra.client.js');

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
});

describe('DeepInfra client', () => {
    afterEach(() => mock.restoreAll());

    it('embeds a batch and returns vectors in input order', async () => {
        const fetchMock = mock.method(globalThis, 'fetch', () => json(200, {
            data: [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }],
            usage: { prompt_tokens: 7 },
        }));

        const result = await embed(['a', 'b'], { model: 'Qwen/Qwen3-Embedding-8B' });

        assert.deepEqual(result, { vectors: [[1, 0], [0, 1]], tokens: 7 });
        const [url, init] = fetchMock.mock.calls[0].arguments;
        assert.equal(url, 'https://ai.example.test/v1/openai/embeddings');
        assert.equal(init.headers.Authorization, 'Bearer test-key');
        assert.deepEqual(JSON.parse(init.body), { model: 'Qwen/Qwen3-Embedding-8B', input: ['a', 'b'], encoding_format: 'float' });
    });

    it('retries rate limits, honouring Retry-After', async () => {
        let calls = 0;
        mock.method(globalThis, 'fetch', () => {
            calls += 1;
            return calls === 1
                ? json(429, { error: 'slow down' }, { 'Retry-After': '0.01' })
                : json(200, { data: [{ index: 0, embedding: [1] }] });
        });
        assert.deepEqual((await embed(['a'], { model: 'm' })).vectors, [[1]]);
        assert.equal(calls, 2);
    });

    it('fails fast on errors a retry cannot fix', async () => {
        const fetchMock = mock.method(globalThis, 'fetch', () => json(401, { detail: 'invalid key' }));
        await assert.rejects(embed(['a'], { model: 'm' }), (error) => error instanceof AiProviderError && error.status === 401);
        assert.equal(fetchMock.mock.callCount(), 1);
    });

    it('rejects a response with the wrong number of vectors', async () => {
        mock.method(globalThis, 'fetch', () => json(200, { data: [] }));
        await assert.rejects(embed(['a'], { model: 'm' }), /Expected 1 embeddings/);
    });

    it('parses JSON answers, even when wrapped in prose', async () => {
        mock.method(globalThis, 'fetch', () => json(200, {
            choices: [{ message: { content: 'Sure! ```json\n{"joy": 0.8}\n```' } }],
            usage: { total_tokens: 40 },
        }));
        assert.deepEqual(await completeJson([{ role: 'user', content: 'x' }], { model: 'm' }), { value: { joy: 0.8 }, tokens: 40 });
    });

    it('never repeats the API key in error messages', async () => {
        mock.method(globalThis, 'fetch', () => json(400, { detail: 'bad request for key test-key' }));
        await assert.rejects(embed(['a'], { model: 'm' }), (error) => !error.message.includes('test-key'));
        assert.equal(redactSecret('Bearer test-key'), 'Bearer [redacted]');
    });

    it('stops immediately when the caller aborts', async () => {
        mock.method(globalThis, 'fetch', (_url, init) => new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(init.signal.reason));
        }));
        const controller = new AbortController();
        const pending = embed(['a'], { model: 'm', signal: controller.signal });
        controller.abort(new Error('cancelled'));
        await assert.rejects(pending, /cancelled/);
    });
});
