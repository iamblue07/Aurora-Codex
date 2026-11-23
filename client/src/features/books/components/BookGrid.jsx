import clsx from 'clsx';
import BookCard, { BookCardSkeleton } from './BookCard';
import styles from './BookGrid.module.css';

/** Responsive grid of book cards, with a matching skeleton while loading. */
export default function BookGrid({ books, loading = false, skeletonCount = 12, className }) {
    return (
        <div className={clsx(styles.grid, className)} aria-busy={loading || undefined}>
            {loading
                ? Array.from({ length: skeletonCount }, (_, index) => <BookCardSkeleton key={index} />)
                : books.map((book) => <BookCard key={book.id} book={book} />)}
        </div>
    );
}
