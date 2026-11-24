import { describe, expect, it } from 'vitest';
import { parseBlocks, parseInline, toPlainText } from './rich-text';

describe('parseInline', () => {
    it('splits bold, italic, code and plain text', () => {
        expect(parseInline('a **b** *c* `d` e')).toEqual([
            { type: 'text', value: 'a ' },
            { type: 'bold', value: 'b' },
            { type: 'text', value: ' ' },
            { type: 'italic', value: 'c' },
            { type: 'text', value: ' ' },
            { type: 'code', value: 'd' },
            { type: 'text', value: ' e' },
        ]);
    });

    it('keeps trailing punctuation out of links', () => {
        expect(parseInline('vezi https://example.com/x.')).toEqual([
            { type: 'text', value: 'vezi ' },
            { type: 'link', value: 'https://example.com/x', href: 'https://example.com/x' },
            { type: 'text', value: '.' },
        ]);
    });

    it('does not link other schemes and leaves markup as text', () => {
        expect(parseInline('javascript:alert(1) <b>x</b>')).toEqual([
            { type: 'text', value: 'javascript:alert(1) <b>x</b>' },
        ]);
    });

    it('treats a lone asterisk as text', () => {
        expect(parseInline('5 * 3 = 15')).toEqual([{ type: 'text', value: '5 * 3 = 15' }]);
    });
});

describe('parseBlocks', () => {
    it('groups paragraphs, quotes and lists', () => {
        const blocks = parseBlocks('Salut\nrândul doi\n\n> citat\n> continuare\n- unu\n- doi\nfinal');
        expect(blocks).toEqual([
            { type: 'paragraph', lines: ['Salut', 'rândul doi'] },
            { type: 'quote', blocks: [{ type: 'paragraph', lines: ['citat', 'continuare'] }] },
            { type: 'list', items: ['unu', 'doi'] },
            { type: 'paragraph', lines: ['final'] },
        ]);
    });

    it('handles empty input and Windows line endings', () => {
        expect(parseBlocks('')).toEqual([]);
        expect(parseBlocks(null)).toEqual([]);
        expect(parseBlocks('a\r\nb')).toEqual([{ type: 'paragraph', lines: ['a', 'b'] }]);
    });
});

describe('toPlainText', () => {
    it('strips formatting and quoted lines', () => {
        expect(toPlainText('> vechi\n**Nou** și *cursiv*\n- punct')).toBe('Nou și cursiv • punct');
    });

    it('truncates with an ellipsis', () => {
        expect(toPlainText('abcdefghij', 5)).toBe('abcd…');
    });
});
