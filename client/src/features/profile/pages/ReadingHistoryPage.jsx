import { BookMarked, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import BookCover from '@/features/books/components/BookCover';
import { useRateBook, useRemoveRating } from '@/features/books/hooks';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import { formatDecimal } from '@/shared/lib/format';
import { Button, Card, EmptyState, ErrorState, IconButton, Input, PageHeader, Pagination, Skeleton, StarRating } from '@/shared/ui';
import { useReadingHistory } from '../hooks';
import styles from './ReadingHistoryPage.module.css';

const PAGE_SIZE = 12;

function HistoryRow({ entry }) {
    const bookId = String(entry.book.id);
    const rate = useRateBook(bookId);
    const remove = useRemoveRating(bookId);
    return (
        <li className={styles.row}>
            <Link to={paths.book(entry.book.id)} className={styles.thumb} tabIndex={-1} aria-hidden="true">
                <BookCover src={entry.book.coverUrl} title={entry.book.title} size="sm" />
            </Link>
            <div className={styles.book}>
                <Link to={paths.book(entry.book.id)} className={styles.title}>{entry.book.title}</Link>
                <span className={styles.author}>{entry.book.author ?? 'Autor necunoscut'}</span>
            </div>
            <StarRating value={entry.rating} onChange={(rating) => rate.mutate(rating)} disabled={rate.isPending} label={`Nota pentru ${entry.book.title}`} />
            <IconButton label="Elimină din istoric" onClick={() => remove.mutate()} disabled={remove.isPending}>
                <Trash2 />
            </IconButton>
        </li>
    );
}

export default function ReadingHistoryPage() {
    useDocumentTitle('Istoricul de lectură');
    const history = useReadingHistory();
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);

    const entries = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase('ro');
        return (history.data ?? []).filter((entry) => !normalized
            || entry.book.title.toLocaleLowerCase('ro').includes(normalized)
            || entry.book.author?.toLocaleLowerCase('ro').includes(normalized));
    }, [history.data, query]);

    const rated = (history.data ?? []).filter((entry) => entry.rating > 0);
    const average = rated.length ? rated.reduce((sum, entry) => sum + entry.rating, 0) / rated.length : 0;
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    const visible = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div>
            <PageHeader eyebrow="Profil" title="Istoricul de lectură" subtitle="Notele tale ajută recomandatorul să-ți înțeleagă gusturile." />

            {history.isError && <ErrorState onRetry={history.refetch} />}
            {history.isSuccess && history.data.length === 0 && (
                <EmptyState
                    icon={<BookMarked />}
                    title="Încă nu ai marcat nicio carte ca citită"
                    description="Deschide pagina unei cărți și dă-i o notă pentru a o adăuga aici."
                    action={<Button to={paths.catalog}>Explorează catalogul</Button>}
                />
            )}

            {(history.isPending || history.data?.length > 0) && (
                <>
                    <div className={styles.stats}>
                        <Card padding="sm" className={styles.stat}>
                            <span className={styles.statValue}>{history.data?.length ?? '–'}</span>
                            <span className={styles.statLabel}>{history.data?.length === 1 ? 'carte citită' : 'cărți citite'}</span>
                        </Card>
                        <Card padding="sm" className={styles.stat}>
                            <span className={styles.statValue}>{average ? formatDecimal(average) : '–'}</span>
                            <span className={styles.statLabel}>nota medie</span>
                        </Card>
                    </div>

                    <Input
                        className={styles.search}
                        aria-label="Caută în istoric"
                        placeholder="Caută după titlu sau autor…"
                        leadingIcon={<Search />}
                        value={query}
                        onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                    />

                    <Card padding="none">
                        <ul className={styles.list} role="list">
                            {history.isPending
                                ? Array.from({ length: 5 }, (_, index) => <li key={index} className={styles.row}><Skeleton height="3.75rem" /></li>)
                                : visible.map((entry) => <HistoryRow key={entry.id} entry={entry} />)}
                        </ul>
                        {history.isSuccess && entries.length === 0 && <p className={styles.noMatch}>Nicio carte nu se potrivește căutării.</p>}
                    </Card>
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </>
            )}
        </div>
    );
}
