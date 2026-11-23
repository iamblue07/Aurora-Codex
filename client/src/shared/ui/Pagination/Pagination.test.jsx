import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination';
import { getPageItems } from './page-items';

describe('getPageItems', () => {
    it('lists every page when there are few', () => {
        expect(getPageItems(1, 1)).toEqual([1]);
        expect(getPageItems(2, 4)).toEqual([1, 2, 3, 4]);
    });

    it('collapses long gaps into ellipsis markers around the current page', () => {
        expect(getPageItems(6, 20)).toEqual([1, 'ellipsis-1', 5, 6, 7, 'ellipsis-7', 20]);
    });

    it('fills a single-page gap with the page instead of an ellipsis', () => {
        expect(getPageItems(4, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis-5', 20]);
    });

    it('handles the edges', () => {
        expect(getPageItems(1, 10)).toEqual([1, 2, 'ellipsis-2', 10]);
        expect(getPageItems(10, 10)).toEqual([1, 'ellipsis-1', 9, 10]);
    });
});

describe('<Pagination>', () => {
    it('renders nothing for a single page', () => {
        const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('marks the current page and moves between pages', async () => {
        const onPageChange = vi.fn();
        const user = userEvent.setup();
        render(<Pagination page={3} totalPages={10} onPageChange={onPageChange} />);

        expect(screen.getByRole('button', { name: 'Pagina 3' })).toHaveAttribute('aria-current', 'page');

        await user.click(screen.getByRole('button', { name: 'Pagina următoare' }));
        await user.click(screen.getByRole('button', { name: 'Pagina anterioară' }));
        await user.click(screen.getByRole('button', { name: 'Pagina 10' }));
        expect(onPageChange.mock.calls).toEqual([[4], [2], [10]]);
    });

    it('ignores clicks on the current page and disables arrows at the ends', async () => {
        const onPageChange = vi.fn();
        const user = userEvent.setup();
        render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />);

        expect(screen.getByRole('button', { name: 'Pagina anterioară' })).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'Pagina 1' }));
        expect(onPageChange).not.toHaveBeenCalled();
    });
});
