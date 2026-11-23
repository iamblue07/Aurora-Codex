import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPageItems } from './page-items';
import styles from './Pagination.module.css';

/** Page navigation. Renders nothing when there is a single page. */
export default function Pagination({ page, totalPages, onPageChange, className }) {
    if (!totalPages || totalPages <= 1) return null;

    const go = (target) => {
        if (target >= 1 && target <= totalPages && target !== page) onPageChange(target);
    };

    return (
        <nav className={clsx(styles.pagination, className)} aria-label="Paginare">
            <button type="button" className={styles.arrow} onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Pagina anterioară">
                <ChevronLeft />
            </button>
            <ol className={styles.pages} role="list">
                {getPageItems(page, totalPages).map((item) => (
                    <li key={item}>
                        {typeof item === 'number' ? (
                            <button
                                type="button"
                                className={clsx(styles.page, item === page && styles.current)}
                                onClick={() => go(item)}
                                aria-current={item === page ? 'page' : undefined}
                                aria-label={`Pagina ${item}`}
                            >
                                {item}
                            </button>
                        ) : (
                            <span className={styles.ellipsis} aria-hidden="true">…</span>
                        )}
                    </li>
                ))}
            </ol>
            <button type="button" className={styles.arrow} onClick={() => go(page + 1)} disabled={page >= totalPages} aria-label="Pagina următoare">
                <ChevronRight />
            </button>
        </nav>
    );
}
