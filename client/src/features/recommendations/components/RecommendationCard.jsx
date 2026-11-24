import { EyeOff, Heart, Search, Tags } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import BookCard from '@/features/books/components/BookCard';
import { prettyGenreLabel } from '@/shared/hooks/useGenres';
import { matchLevel } from '../api';
import styles from './RecommendationCard.module.css';

/** Why this book was recommended, in one short line. */
function Reason({ item }) {
    if (item.reason === 'liked' && item.reasonBook) {
        return (
            <>
                <Heart aria-hidden="true" />
                <span>Pentru că ți-a plăcut <Link to={paths.book(item.reasonBook.id)}>{item.reasonBook.title}</Link></span>
            </>
        );
    }
    if (item.reason === 'genre' && item.book.genre) {
        return <><Tags aria-hidden="true" /><span>Din genul tău preferat: {prettyGenreLabel(item.book.genre.label)}</span></>;
    }
    if (item.reason === 'query') return <><Search aria-hidden="true" /><span>Potrivită descrierii tale</span></>;
    return null;
}

/** A recommended book with the reason it was picked, how well it fits and a "not interested" button. */
export default function RecommendationCard({ item, onDismiss, dismissing }) {
    const match = matchLevel(item.score);
    return (
        <article className={styles.card}>
            <BookCard book={item.book} className={styles.book} />
            {match && (
                <span className={styles.match} data-tier={match.tier} title={`Potrivire ${match.label.toLowerCase()}`}>
                    <span className="visually-hidden">Potrivire </span>{match.label}
                </span>
            )}
            <button
                type="button"
                className={styles.dismiss}
                onClick={() => onDismiss(item.book.id)}
                disabled={dismissing}
                title="Nu mă interesează"
                aria-label={`Nu mă interesează: ${item.book.title}`}
            >
                <EyeOff aria-hidden="true" />
            </button>
            <p className={styles.reason}><Reason item={item} /></p>
        </article>
    );
}
