import { MessagesSquare, Star, Users } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import BookCover from '@/features/books/components/BookCover';
import { prettyGenreLabel } from '@/shared/hooks/useGenres';
import { formatDecimal } from '@/shared/lib/format';
import { ErrorState, Skeleton } from '@/shared/ui';
import { useCommunityStatistics } from '../api';
import ChartCard from './ChartCard';
import { RankedBarChart } from './charts';
import StatTile from './StatTile';
import styles from './Statistics.module.css';

const starsLabel = (stars) => (stars === 1 ? '1 stea' : `${stars} stele`);

/** Readers, their ratings, the best-rated books and where the forum conversation happens. */
export default function CommunityStatistics() {
    const stats = useCommunityStatistics();

    if (stats.isError) return <ErrorState onRetry={stats.refetch} />;
    if (stats.isPending) {
        return (
            <div className={styles.grid}>
                {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height="7rem" radius="var(--radius-lg)" />)}
                <Skeleton className={styles.wide} height="18rem" radius="var(--radius-lg)" />
            </div>
        );
    }

    const data = stats.data;
    const ratingRows = data.ratingDistribution.map((row) => ({ ...row, label: starsLabel(row.stars) }));
    const genres = data.favoriteGenres.map((row) => ({ ...row, label: prettyGenreLabel(row.genre.label) }));

    return (
        <div className={styles.grid}>
            <StatTile accent icon={<Users />} label="Cititori" value={data.members} hint={data.newMembers > 0 ? `+${data.newMembers} în ultimele 30 de zile` : undefined} />
            <StatTile icon={<Star />} label="Note date cărților" value={data.ratings} />
            <StatTile
                icon={<Star />}
                label="Nota medie"
                value={data.averageRating ?? '—'}
                decimals={2}
                format={(value) => `${formatDecimal(value, 2)} / 5`}
            />
            <StatTile icon={<MessagesSquare />} label="Mesaje pe forum" value={data.forum.posts} hint={`în ${data.forum.threads} discuții`} />

            {data.topRatedBooks.length > 0 && (
                <ChartCard className={styles.wide} title="Cele mai apreciate cărți" description="Media notelor date de cititori (cel puțin 2 note).">
                    <ol className={styles.topBooks}>
                        {data.topRatedBooks.map((book) => (
                            <li key={book.id} className={styles.topBook}>
                                <Link to={paths.book(book.id)} className={styles.topBook}>
                                    <BookCover src={book.coverUrl} title={book.title} author={book.author} className={styles.topBookCover} />
                                    <strong className={styles.topBookTitle}>{book.title}</strong>
                                </Link>
                                <span className={styles.topBookMeta}>
                                    <Star aria-hidden="true" /> {formatDecimal(book.averageRating, 2)} · {book.ratings} note
                                </span>
                            </li>
                        ))}
                    </ol>
                </ChartCard>
            )}

            <ChartCard
                className={styles.half}
                title="Cum notează cititorii"
                description="Câte note de fiecare fel s-au dat cărților."
                table={{ columns: ['Nota', 'Note'], rows: ratingRows.map((row) => [row.label, row.count]) }}
            >
                <RankedBarChart data={ratingRows} labelKey="label" valueKey="count" formatValue={(value) => `${value}`} />
            </ChartCard>

            <ChartCard
                className={styles.half}
                title="Genurile preferate"
                description="Alese de cititori în profilul lor."
                table={{ columns: ['Gen', 'Cititori'], rows: genres.map((row) => [row.label, row.count]) }}
            >
                <RankedBarChart data={genres} labelKey="label" valueKey="count" formatValue={(value) => `${value}`} />
            </ChartCard>

            <ChartCard
                className={styles.wide}
                title="Unde se discută"
                description={`Mesaje pe categorii de forum · ${data.forum.posters} cititori au scris cel puțin un mesaj.`}
                table={{ columns: ['Categorie', 'Discuții', 'Mesaje'], rows: data.forumCategories.map((row) => [row.name, row.threads, row.posts]) }}
            >
                <RankedBarChart data={data.forumCategories} labelKey="name" valueKey="posts" formatValue={(value) => `${value} mesaje`} />
            </ChartCard>

        </div>
    );
}
