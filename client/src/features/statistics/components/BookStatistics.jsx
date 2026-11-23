import { Search } from 'lucide-react';
import { useState } from 'react';
import useDebouncedValue from '@/shared/hooks/useDebouncedValue';
import { prettyGenreLabel } from '@/shared/hooks/useGenres';
import { formatPercent, formatPrice } from '@/shared/lib/format';
import { ErrorState, Input, Select, Skeleton } from '@/shared/ui';
import { useAuthorStatistics, useBookStatistics } from '../api';
import ChartCard from './ChartCard';
import { CurveChart, RankedBarChart } from './charts';
import StatTile from './StatTile';
import styles from './Statistics.module.css';

const TOP_GENRES = 12;

function AuthorTable({ authors }) {
    return (
        <div className={styles.tableWrap}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th scope="col">Autor</th>
                        <th scope="col">Cărți</th>
                        <th scope="col">Preț minim</th>
                        <th scope="col">Preț mediu</th>
                        <th scope="col">Preț maxim</th>
                    </tr>
                </thead>
                <tbody>
                    {authors.map((author) => (
                        <tr key={author.author}>
                            <td>{author.author}</td>
                            <td>{author.books}</td>
                            <td>{formatPrice(author.minPrice)}</td>
                            <td>{formatPrice(author.averagePrice)}</td>
                            <td>{formatPrice(author.maxPrice)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AuthorExplorer({ topAuthors }) {
    const [query, setQuery] = useState('');
    const search = useDebouncedValue(query.trim(), 400);
    const results = useAuthorStatistics(search);
    const authors = search.length >= 2 ? results.data ?? [] : topAuthors;

    return (
        <ChartCard
            className={styles.wide}
            title="Autori"
            description={search.length >= 2 ? `Rezultate pentru „${search}”.` : 'Cei mai prolifici autori din catalog.'}
            actions={(
                <Input
                    aria-label="Caută un autor"
                    placeholder="Caută un autor…"
                    leadingIcon={<Search />}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className={styles.authorSearch}
                />
            )}
        >
            {results.isFetching && search.length >= 2 ? <Skeleton height="10rem" /> : authors.length === 0
                ? <p className={styles.muted}>Niciun autor găsit.</p>
                : <AuthorTable authors={authors} />}
        </ChartCard>
    );
}

function GenrePriceExplorer({ genres }) {
    const sorted = [...genres].sort((a, b) => a.label.localeCompare(b.label, 'ro'));
    const [code, setCode] = useState(() => [...genres].sort((a, b) => b.offers - a.offers)[0]?.genre.code ?? '');
    const selected = genres.find((genre) => genre.genre.code === code);

    return (
        <ChartCard
            className={styles.wide}
            title="Prețurile pe gen literar"
            description="Distribuția normală estimată a prețurilor din librării pentru genul ales."
            actions={(
                <Select aria-label="Alege genul" value={code} onChange={(event) => setCode(event.target.value)} className={styles.genreSelect}>
                    {sorted.map((genre) => <option key={genre.genre.code} value={genre.genre.code}>{genre.label}</option>)}
                </Select>
            )}
        >
            {selected && (
                <>
                    <div className={styles.miniStats}>
                        <StatTile label="Oferte" value={selected.offers} />
                        <StatTile label="Minim" value={formatPrice(selected.minPrice)} />
                        <StatTile label="Mediu" value={formatPrice(selected.averagePrice)} />
                        <StatTile label="Maxim" value={formatPrice(selected.maxPrice)} />
                    </div>
                    {selected.normalDistribution.length > 0
                        ? <CurveChart data={selected.normalDistribution} xKey="price" yKey="density" formatX={(value) => formatPrice(value)} formatY={(value) => value.toExponential(2)} />
                        : <p className={styles.muted}>Prea puține prețuri diferite pentru o distribuție.</p>}
                </>
            )}
        </ChartCard>
    );
}

export default function BookStatistics() {
    const stats = useBookStatistics();

    if (stats.isError) return <ErrorState onRetry={stats.refetch} />;
    if (stats.isPending) {
        return (
            <div className={styles.grid}>
                {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height="7rem" radius="var(--radius-lg)" />)}
                <Skeleton className={styles.wide} height="24rem" radius="var(--radius-lg)" />
            </div>
        );
    }

    const data = stats.data;
    const genres = data.genres.map((row) => ({ ...row, label: prettyGenreLabel(row.genre.label) }));
    const shares = [...genres].sort((a, b) => b.percentOfBooks - a.percentOfBooks).slice(0, TOP_GENRES);

    return (
        <div className={styles.grid}>
            <StatTile accent label="Cărți în catalog" value={data.totalBooks.toLocaleString('ro-RO')} />
            <StatTile label="Genul dominant" value={data.topGenre ? prettyGenreLabel(data.topGenre.label) : '—'} hint={data.topGenre && `${formatPercent(data.topGenre.percentOfTotal)} din catalog`} />
            <StatTile label="Genuri literare" value={genres.length} />

            <ChartCard
                className={styles.wide}
                title="Ponderea genurilor în catalog"
                description={`Procentul din totalul cărților, top ${TOP_GENRES}.`}
                table={{ columns: ['Gen', '% din catalog'], rows: shares.map((row) => [row.label, formatPercent(row.percentOfBooks)]) }}
            >
                <RankedBarChart data={shares} labelKey="label" valueKey="percentOfBooks" formatValue={formatPercent} />
            </ChartCard>

            <GenrePriceExplorer genres={genres} />
            <AuthorExplorer topAuthors={data.topAuthors} />
        </div>
    );
}
