import { describe, expect, it } from 'vitest';
import { paths } from '@/app/paths';
import { safeNextPath } from './redirect';

describe('safeNextPath', () => {
    it('keeps same-site paths, including their query string', () => {
        expect(safeNextPath('/bazar/anunt/4')).toBe('/bazar/anunt/4');
        expect(safeNextPath('/carti?genres=fiction&page=2')).toBe('/carti?genres=fiction&page=2');
    });

    it.each([
        ['protocol-relative URL', '//evil.example/login'],
        ['backslash trick', '/\\evil.example'],
        ['absolute URL', 'https://evil.example'],
        ['javascript: URL', 'javascript:alert(1)'],
        ['relative path', 'bazar'],
        ['missing value', null],
    ])('falls back to home for a %s', (_case, next) => {
        expect(safeNextPath(next)).toBe(paths.home);
    });
});
