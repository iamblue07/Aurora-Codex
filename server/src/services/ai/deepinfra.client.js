/**
 * Minimal client for DeepInfra's OpenAI-compatible API (embeddings + chat completions).
 * Plain fetch, no SDK: retries rate limits and transient errors with exponential backoff.
 * The API key never leaves this module (it is not logged or returned by the API).
 */
import config from '../../config/env.js';
import HttpError from '../../utils/http-error.js';
import logger from '../../utils/logger.js';

const RETRYABLE_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 1000;

export const isAiConfigured = () => Boolean(config.ai.apiKey);

const sleep = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) {
        reject(signal.reason);
        return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(signal.reason);
    }, { once: true });
});

/** Error from the AI provider; `retryable` tells the caller whether trying later could help. */
export class AiProviderError extends Error {
    constructor(message, { status = null, retryable = false } = {}) {
        super(message);
        this.name = 'AiProviderError';
        this.status = status;
        this.retryable = retryable;
    }
}

/** Removes the API key from any text that could end up in a log, a job record or a response. */
export const redactSecret = (text) => (config.ai.apiKey ? String(text).split(config.ai.apiKey).join('[redacted]') : String(text));

const post = async (path, body, { signal, timeoutMs = config.ai.timeoutMs } = {}) => {
    if (!isAiConfigured()) {
        throw HttpError.serviceUnavailable('AI features are disabled: DEEPINFRA_API_KEY is not set');
    }

    for (let attempt = 1; ; attempt += 1) {
        const timeout = AbortSignal.timeout(timeoutMs);
        let response;
        try {
            response = await fetch(`${config.ai.baseUrl}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.ai.apiKey}` },
                body: JSON.stringify(body),
                signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
            });
        } catch (error) {
            if (signal?.aborted) throw error;
            if (attempt >= MAX_ATTEMPTS) {
                throw new AiProviderError(`AI provider unreachable: ${redactSecret(error.message)}`, { retryable: true });
            }
            await sleep(BASE_DELAY_MS * 2 ** (attempt - 1), signal);
            continue;
        }

        if (response.ok) return response.json();

        const text = await response.text().catch(() => '');
        const retryable = RETRYABLE_STATUSES.has(response.status);
        if (!retryable || attempt >= MAX_ATTEMPTS) {
            // Provider messages can be long HTML pages; keep logs and job messages readable.
            const detail = redactSecret(text).replace(/\s+/g, ' ').slice(0, 300);
            throw new AiProviderError(`AI provider answered ${response.status}: ${detail}`, { status: response.status, retryable });
        }
        const retryAfterSeconds = Number(response.headers.get('retry-after'));
        const delay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds * 1000
            : BASE_DELAY_MS * 2 ** (attempt - 1);
        logger.warn(`[ai] ${path} answered ${response.status}, retrying in ${delay} ms (attempt ${attempt}/${MAX_ATTEMPTS})`);
        await sleep(delay, signal);
    }
};

/**
 * Embeds several texts in one request.
 * @returns {Promise<{ vectors: number[][], tokens: number }>} vectors in input order
 */
export const embed = async (texts, { model, signal } = {}) => {
    const data = await post('/embeddings', { model, input: texts, encoding_format: 'float' }, { signal });
    const rows = [...(data.data ?? [])].sort((a, b) => a.index - b.index);
    if (rows.length !== texts.length) {
        throw new AiProviderError(`Expected ${texts.length} embeddings, received ${rows.length}`);
    }
    return { vectors: rows.map((row) => row.embedding), tokens: data.usage?.prompt_tokens ?? 0 };
};

/**
 * Chat completion that must answer with a JSON object.
 * @returns {Promise<{ value: object, tokens: number }>}
 */
export const completeJson = async (messages, {
    model, temperature = 0, maxTokens = 300, signal, timeoutMs,
} = {}) => {
    const data = await post('/chat/completions', {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
    }, { signal, timeoutMs });
    const content = data.choices?.[0]?.message?.content ?? '';
    // Some models wrap JSON in prose or code fences; take the outermost object.
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new AiProviderError('The model did not answer with JSON');
    try {
        return { value: JSON.parse(match[0]), tokens: data.usage?.total_tokens ?? 0 };
    } catch {
        throw new AiProviderError('The model answered with invalid JSON');
    }
};
