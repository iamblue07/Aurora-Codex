/**
 * Tiny, safe formatting for forum posts (a Markdown subset). The text is parsed into a tree that
 * React renders, so user content is never interpreted as HTML.
 *
 * Blocks: paragraphs (separated by a blank line; single line breaks are kept), `> ` quotes and
 * `- ` / `* ` lists. Inline: **bold**, *italic*, `code` and http(s) links.
 */

const INLINE = /(\*\*[^*\n]+?\*\*|\*[^*\s][^*\n]*?\*|`[^`\n]+`|https?:\/\/[^\s<>"]+)/g;
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;

/** @returns {Array<{ type: 'text'|'bold'|'italic'|'code'|'link', value: string, href?: string }>} */
export const parseInline = (text) => {
    const nodes = [];
    let last = 0;
    for (const match of text.matchAll(INLINE)) {
        const token = match[0];
        if (match.index > last) nodes.push({ type: 'text', value: text.slice(last, match.index) });
        if (token.startsWith('**')) nodes.push({ type: 'bold', value: token.slice(2, -2) });
        else if (token.startsWith('*')) nodes.push({ type: 'italic', value: token.slice(1, -1) });
        else if (token.startsWith('`')) nodes.push({ type: 'code', value: token.slice(1, -1) });
        else {
            // "see https://example.com." → the final dot is punctuation, not part of the link.
            const trailing = token.match(TRAILING_PUNCTUATION)?.[0] ?? '';
            const href = token.slice(0, token.length - trailing.length);
            nodes.push({ type: 'link', value: href, href });
            if (trailing) nodes.push({ type: 'text', value: trailing });
        }
        last = match.index + token.length;
    }
    if (last < text.length) nodes.push({ type: 'text', value: text.slice(last) });
    return nodes;
};

const isQuote = (line) => /^>\s?/.test(line);
const isListItem = (line) => /^\s*[-*]\s+/.test(line);

/** @returns {Array<{ type: 'paragraph'|'quote'|'list', lines?: string[], items?: string[], blocks?: object[] }>} */
export const parseBlocks = (text) => {
    const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n');
    const blocks = [];
    let index = 0;
    while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
            index += 1;
        } else if (isQuote(line)) {
            const quoted = [];
            while (index < lines.length && isQuote(lines[index])) quoted.push(lines[index++].replace(/^>\s?/, ''));
            blocks.push({ type: 'quote', blocks: parseBlocks(quoted.join('\n')) });
        } else if (isListItem(line)) {
            const items = [];
            while (index < lines.length && isListItem(lines[index])) items.push(lines[index++].replace(/^\s*[-*]\s+/, ''));
            blocks.push({ type: 'list', items });
        } else {
            const paragraph = [];
            while (index < lines.length && lines[index].trim() && !isQuote(lines[index]) && !isListItem(lines[index])) {
                paragraph.push(lines[index++]);
            }
            blocks.push({ type: 'paragraph', lines: paragraph });
        }
    }
    return blocks;
};

/** Plain-text excerpt (formatting markers removed), e.g. for quotes and previews. */
export const toPlainText = (text, maxLength = 200) => {
    const plain = (text ?? '')
        .replace(/^>\s?.*$/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^\s*[-*]\s+/gm, '• ')
        .replace(/\s+/g, ' ')
        .trim();
    return plain.length > maxLength ? `${plain.slice(0, maxLength - 1).trimEnd()}…` : plain;
};
