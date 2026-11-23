/**
 * Generates a listing photo for demo data: a book on a table, drawn as SVG and encoded as WebP.
 * Deterministic for a given title, so re-seeding produces the same pictures.
 */
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 900;

const COVER_PALETTES = [
    ['#7a1f2b', '#b23a48'], ['#1f3b5a', '#355c7d'], ['#2f4f3a', '#4f7c5a'], ['#5b3a29', '#8a5a3c'],
    ['#3d2c5c', '#6a4c93'], ['#14213d', '#274472'], ['#8c2f1b', '#c4512f'], ['#2b2b2b', '#4a4a4a'],
];
const TABLES = [['#c9a27a', '#a97c50'], ['#d8c3a5', '#b89b72'], ['#e6dfd3', '#cbbfa9'], ['#8d6e53', '#6b4f3a']];

/** FNV-1a: spreads similar titles across palettes (a plain *31 hash cycles modulo 8). */
const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;
const hash = (text) => [...text].reduce(
    (value, char) => Math.imul(value ^ char.charCodeAt(0), FNV_PRIME) >>> 0,
    FNV_OFFSET,
);

const XML_ESCAPES = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
const escapeXml = (text) => text.replace(/[<>&'"]/g, (c) => XML_ESCAPES[c]);

/** Greedy word wrap into lines of at most `max` characters (at most `lines` lines). */
const wrap = (text, max, lines) => {
    const result = [];
    let current = '';
    for (const word of text.split(/\s+/)) {
        if ((current ? `${current} ${word}` : word).length > max && current) {
            result.push(current);
            current = word;
        } else {
            current = current ? `${current} ${word}` : word;
        }
    }
    if (current) result.push(current);
    if (result.length > lines) {
        result.length = lines;
        result[lines - 1] = `${result[lines - 1].replace(/\s*\S*$/, '')}…`;
    }
    return result;
};

/** @returns {Promise<Buffer>} a WebP image */
export const renderListingImage = ({ title, author }) => {
    const seed = hash(title);
    const [coverDark, coverLight] = COVER_PALETTES[seed % COVER_PALETTES.length];
    const [tableLight, tableDark] = TABLES[(seed >>> 3) % TABLES.length];
    const tilt = ((seed % 9) - 4) * 1.2; // -4.8° … 4.8°

    const bookWidth = 470;
    const bookHeight = 680;
    const x = (WIDTH - bookWidth) / 2;
    const y = (HEIGHT - bookHeight) / 2;
    const titleLines = wrap(title, 14, 4);
    // Bold serif glyphs average ~0.6em: size the text so the longest line fits the cover.
    const longest = Math.max(...titleLines.map((line) => line.length));
    const titleSize = Math.min(58, Math.floor((bookWidth - 100) / (longest * 0.6)));

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="table" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${tableLight}"/><stop offset="1" stop-color="${tableDark}"/>
    </linearGradient>
    <linearGradient id="cover" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${coverLight}"/><stop offset="1" stop-color="${coverDark}"/>
    </linearGradient>
    <linearGradient id="spine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="light" cx="0.3" cy="0.2" r="0.9">
      <stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="18" dy="26" stdDeviation="22" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#table)"/>
  ${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${80 + i * 95} Q ${WIDTH / 2} ${60 + i * 95 + (seed % 30)} ${WIDTH} ${90 + i * 95}" stroke="#000" stroke-opacity="0.05" stroke-width="3" fill="none"/>`).join('')}
  <g transform="rotate(${tilt} ${WIDTH / 2} ${HEIGHT / 2})" filter="url(#shadow)">
    <rect x="${x + 8}" y="${y + 8}" width="${bookWidth}" height="${bookHeight}" rx="6" fill="#f4efe6"/>
    <rect x="${x}" y="${y}" width="${bookWidth}" height="${bookHeight}" rx="6" fill="url(#cover)"/>
    <rect x="${x}" y="${y}" width="34" height="${bookHeight}" rx="4" fill="url(#spine)"/>
    <rect x="${x + 60}" y="${y + 70}" width="${bookWidth - 110}" height="3" fill="#f4e3c3" opacity="0.8"/>
    ${titleLines.map((line, i) => `<text x="${x + bookWidth / 2 + 12}" y="${y + 170 + i * (titleSize + 12)}" font-family="Georgia, 'Times New Roman', serif" font-size="${titleSize}" font-weight="700" fill="#fbf4e6" text-anchor="middle">${escapeXml(line)}</text>`).join('\n    ')}
    <rect x="${x + 60}" y="${y + bookHeight - 150}" width="${bookWidth - 110}" height="3" fill="#f4e3c3" opacity="0.8"/>
    <text x="${x + bookWidth / 2 + 12}" y="${y + bookHeight - 95}" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-style="italic" fill="#f4e3c3" text-anchor="middle">${escapeXml(author ?? '')}</text>
  </g>
  <rect width="100%" height="100%" fill="url(#light)"/>
</svg>`;

    return sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
};
