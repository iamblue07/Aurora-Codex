import BookCard, { BookCardSkeleton } from '@/features/books/components/BookCard';
import { ErrorState } from '@/shared/ui';
import styles from './BookCarousel.module.css';

/**
 * Endless marquee of books. The list is rendered twice and the track scrolls by exactly 50%,
 * so the loop is seamless for any number of books (the original hard-coded 10 books' width).
 * Pauses on hover/focus and stops for users who prefer reduced motion.
 */
export default function BookCarousel({ books, loading, error, onRetry }) {
    if (error) return <ErrorState compact onRetry={onRetry} />;

    if (loading) {
        return (
            <div className={styles.static}>
                {Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.item}><BookCardSkeleton /></div>)}
            </div>
        );
    }

    return (
        <div className={styles.viewport}>
            <ul className={styles.track} role="list" style={{ '--duration': `${Math.max(30, books.length * 4)}s` }}>
                {[...books, ...books].map((book, index) => (
                    <li key={`${book.id}-${index}`} className={styles.item} aria-hidden={index >= books.length || undefined}>
                        <BookCard book={book} />
                    </li>
                ))}
            </ul>
        </div>
    );
}
