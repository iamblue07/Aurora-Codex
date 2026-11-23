import { BookCheck, BookPlus } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import { Button, Skeleton, StarRating } from '@/shared/ui';
import { useBookRating, useRateBook, useRemoveRating } from '../hooks';
import styles from './BookRatingPanel.module.css';

/** "Have you read it?" box: rate the book (marks it as read) or remove it from your history. */
export default function BookRatingPanel({ bookId }) {
    const { isAuthenticated } = useAuth();
    const rating = useBookRating(bookId, isAuthenticated);
    const rate = useRateBook(bookId);
    const remove = useRemoveRating(bookId);

    if (!isAuthenticated) {
        return (
            <div className={styles.panel}>
                <BookPlus className={styles.icon} aria-hidden="true" />
                <p className={styles.text}>
                    <Link to={paths.login} className={styles.link}>Conectează-te</Link> pentru a marca această carte ca citită și a o nota.
                </p>
            </div>
        );
    }

    if (rating.isPending) return <Skeleton height="4.5rem" radius="var(--radius-lg)" />;

    const isRead = rating.data?.isRead;
    return (
        <div className={styles.panel}>
            {isRead ? <BookCheck className={styles.iconRead} aria-hidden="true" /> : <BookPlus className={styles.icon} aria-hidden="true" />}
            <div className={styles.content}>
                <p className={styles.title}>{isRead ? 'Ai citit această carte' : 'Ai citit-o? Dă-i o notă'}</p>
                <StarRating
                    value={rating.data?.rating ?? 0}
                    onChange={(value) => rate.mutate(value)}
                    disabled={rate.isPending}
                    label="Nota ta"
                />
            </div>
            {isRead && (
                <Button variant="ghost" size="sm" onClick={() => remove.mutate()} loading={remove.isPending}>
                    Elimină din istoric
                </Button>
            )}
        </div>
    );
}
