import clsx from 'clsx';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { prettyGenreLabel } from '@/shared/hooks/useGenres';
import { formatPrice } from '@/shared/lib/format';
import { Skeleton } from '@/shared/ui';
import BookCover from './BookCover';
import styles from './BookCard.module.css';

/** Catalogue tile: cover, title, author and the lowest price across bookstores. */
export default function BookCard({ book, className }) {
    return (
        <Link to={paths.book(book.id)} className={clsx(styles.card, className)}>
            <BookCover src={book.coverUrl} title={book.title} author={book.author} className={styles.cover} />
            <div className={styles.body}>
                {book.genre && <span className={styles.genre}>{prettyGenreLabel(book.genre.label)}</span>}
                <h3 className={styles.title}>{book.title}</h3>
                <p className={styles.author}>{book.author ?? 'Autor necunoscut'}</p>
                {book.lowestPrice !== null && book.lowestPrice !== undefined && (
                    <p className={styles.price}>
                        <span className={styles.from}>de la</span> {formatPrice(book.lowestPrice)}
                    </p>
                )}
            </div>
        </Link>
    );
}

export function BookCardSkeleton() {
    return (
        <div className={styles.card} aria-hidden="true">
            <Skeleton className={styles.coverSkeleton} height="auto" />
            <div className={styles.body}>
                <Skeleton width="40%" height="0.7rem" />
                <Skeleton width="90%" height="1rem" />
                <Skeleton width="60%" height="0.8rem" />
            </div>
        </div>
    );
}
