import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import useGoBack from './useGoBack';

const renderAt = (entries, initialIndex) => renderHook(
    () => ({ goBack: useGoBack('/bazar'), location: useLocation() }),
    { wrapper: ({ children }) => <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>{children}</MemoryRouter> },
);

describe('useGoBack', () => {
    it('steps back through in-app history', () => {
        const { result } = renderAt(['/carti', '/bazar/anunt/4'], 1);
        act(() => result.current.goBack());
        expect(result.current.location.pathname).toBe('/carti');
    });

    it('opens the fallback when the page was opened directly', () => {
        const { result } = renderAt(['/bazar/anunt/4'], 0);
        act(() => result.current.goBack());
        expect(result.current.location.pathname).toBe('/bazar');
    });
});
