import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearToken, getToken, setToken } from './auth-token';
import { getErrorMessage } from './error-messages';
import { ApiError, apiUrl, http } from './http-client';

const jsonResponse = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

describe('http client', () => {
    let fetchMock;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        clearToken();
    });

    it('builds absolute URLs and skips empty query values', async () => {
        fetchMock.mockResolvedValue(jsonResponse(200, []));
        await http.get('/api/books', { query: { search: 'dune', genres: ['fiction', 'history'], page: '', sort: null } });

        expect(fetchMock).toHaveBeenCalledWith(
            `${apiUrl('/api/books')}?search=dune&genres=fiction%2Chistory`,
            expect.objectContaining({ method: 'GET' }),
        );
        expect(apiUrl('https://cdn.example/cover.jpg')).toBe('https://cdn.example/cover.jpg');
    });

    it('sends JSON bodies and the bearer token', async () => {
        setToken('token-123');
        fetchMock.mockResolvedValue(jsonResponse(201, { id: 1 }));

        await expect(http.post('/api/forums', { title: 'Salut' })).resolves.toEqual({ id: 1 });
        const [, init] = fetchMock.mock.calls[0];
        expect(init.headers).toEqual({ Authorization: 'Bearer token-123', 'Content-Type': 'application/json' });
        expect(init.body).toBe('{"title":"Salut"}');
    });

    it('sends FormData untouched so the browser sets the multipart boundary', async () => {
        fetchMock.mockResolvedValue(jsonResponse(200, {}));
        const form = new FormData();
        await http.post('/api/listings', form, { auth: false });

        const [, init] = fetchMock.mock.calls[0];
        expect(init.body).toBe(form);
        expect(init.headers).toEqual({});
    });

    it('returns null for 204 responses', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
        await expect(http.delete('/api/listings/1')).resolves.toBeNull();
    });

    it('throws ApiError with the status and server message', async () => {
        fetchMock.mockResolvedValue(jsonResponse(404, { error: 'Listing not found' }));
        const error = await http.get('/api/listings/99').catch((caught) => caught);

        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(404);
        expect(error.message).toBe('Listing not found');
    });

    it('clears an expired session on 401', async () => {
        setToken('stale-token');
        fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Invalid token' }));

        await expect(http.get('/api/me')).rejects.toMatchObject({ status: 401 });
        expect(getToken()).toBeNull();
    });

    it('reports network failures as status 0', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
        await expect(http.get('/api/books')).rejects.toMatchObject({ status: 0 });
    });
});

describe('getErrorMessage', () => {
    it('uses the caller fallback for validation errors', () => {
        expect(getErrorMessage(new ApiError(400, 'Bad'), 'Verifică datele.')).toBe('Verifică datele.');
        expect(getErrorMessage(new Error('boom'), 'Altceva.')).toBe('Altceva.');
    });

    it('explains well-known statuses in Romanian', () => {
        expect(getErrorMessage(new ApiError(0, 'Network error'))).toMatch(/conecta la server/);
        expect(getErrorMessage(new ApiError(429, 'Too many'))).toMatch(/Prea multe încercări/);
    });
});
