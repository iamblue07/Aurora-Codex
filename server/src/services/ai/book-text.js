/**
 * The text that represents a book for semantic search, and its fingerprint. Pure functions.
 */
import crypto from 'node:crypto';
import { genreLabel } from '../../constants/genres.js';

const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim();

/**
 * Title, author and genre first (they carry a lot of meaning for short or missing descriptions),
 * then the description cut at a sentence (or else word) boundary within `maxChars`. Labels are
 * Romanian to match the language of the catalogue and of most queries.
 */
export const buildBookText = (book, maxChars) => {
    const lines = [`Titlu: ${clean(book.title)}`];
    if (book.author) lines.push(`Autor: ${clean(book.author)}`);
    if (book.genre) lines.push(`Gen: ${genreLabel(book.genre)}`);

    const header = lines.join('\n');
    let description = clean(book.description);
    const room = maxChars - header.length - 'Descriere: '.length - 1;
    if (description && room > 0) {
        if (description.length > room) {
            const cut = description.slice(0, room);
            const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
            const wordEnd = cut.lastIndexOf(' ');
            if (sentenceEnd > room * 0.6) description = cut.slice(0, sentenceEnd + 1);
            else description = wordEnd > 0 ? cut.slice(0, wordEnd) : cut;
        }
        lines.push(`Descriere: ${description}`);
    }
    return lines.join('\n');
};

/** Fingerprint of the embedded text: unchanged books are skipped when embeddings are refreshed. */
export const contentHash = (text) => crypto.createHash('sha256').update(text).digest('hex');

/** Search query in the instruction format used by Qwen3-Embedding (documents get no instruction). */
export const buildQueryText = (query, instruction) => (
    instruction ? `Instruct: ${instruction}\nQuery: ${query.trim()}` : query.trim()
);
