import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import useSearchParamsState from './useSearchParamsState';

const DEFAULTS = { search: '', genres: [], page: 1, sort: 'title_asc' };

const renderWithUrl = (initialUrl) => renderHook(
    () => ({ filters: useSearchParamsState(DEFAULTS), location: useLocation() }),
    { wrapper: ({ children }) => <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter> },
);

describe('useSearchParamsState', () => {
    it('reads typed values from the URL and falls back to defaults', () => {
        const { result } = renderWithUrl('/carti?genres=fiction,history&page=3');
        const [state] = result.current.filters;
        expect(state).toEqual({ search: '', genres: ['fiction', 'history'], page: 3, sort: 'title_asc' });
    });

    it('ignores an invalid page number', () => {
        const { result } = renderWithUrl('/carti?page=abc');
        expect(result.current.filters[0].page).toBe(1);
    });

    it('writes changes, omits defaults and resets the page when a filter changes', () => {
        const { result } = renderWithUrl('/carti?page=4');

        act(() => result.current.filters[1]({ search: 'dune', genres: ['fiction'] }));
        expect(result.current.location.search).toBe('?search=dune&genres=fiction');

        act(() => result.current.filters[1]({ page: 2 }));
        expect(result.current.location.search).toBe('?search=dune&genres=fiction&page=2');

        act(() => result.current.filters[1]({ sort: 'title_asc', search: '' }));
        expect(result.current.location.search).toBe('?genres=fiction');
    });

    it('resets every filter', () => {
        const { result } = renderWithUrl('/carti?search=dune&page=2');
        act(() => result.current.filters[2]());
        expect(result.current.location.search).toBe('');
    });
});
