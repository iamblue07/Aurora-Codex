import { conditionLabel } from '@/features/marketplace/constants';
import { prettyGenreLabel } from '@/shared/hooks/useGenres';
import { formatPrice } from '@/shared/lib/format';
import { ErrorState, Skeleton } from '@/shared/ui';
import { useListingStatistics } from '../api';
import { bucketPrices } from '../lib/buckets';
import ChartCard from './ChartCard';
import { HistogramChart, RankedBarChart } from './charts';
import StatTile from './StatTile';
import styles from './Statistics.module.css';

const TOP_GENRES = 10;

export default function ListingStatistics() {
    const stats = useListingStatistics();

    if (stats.isError) return <ErrorState onRetry={stats.refetch} />;
    if (stats.isPending) {
        return (
            <div className={styles.grid}>
                {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height="7rem" radius="var(--radius-lg)" />)}
                <Skeleton className={styles.wide} height="20rem" radius="var(--radius-lg)" />
            </div>
        );
    }

    const data = stats.data;
    const histogram = bucketPrices(data.priceDistribution);
    const genres = data.genres.map((row) => ({ ...row, label: prettyGenreLabel(row.genre.label) }));
    const byCount = [...genres].sort((a, b) => b.count - a.count).slice(0, TOP_GENRES);
    const byPrice = [...genres].sort((a, b) => b.averagePrice - a.averagePrice).slice(0, TOP_GENRES);
    const box = data.priceBoxPlot;
    const conditions = (data.conditions ?? []).map((row) => ({ ...row, label: conditionLabel(row.condition) }));

    return (
        <div className={styles.grid}>
            <StatTile accent label="Anunțuri publicate" value={data.totalListings} />
            <StatTile
                label="Disponibile acum"
                value={data.availableListings}
                hint={data.reservedListings > 0 ? `din care ${data.reservedListings} rezervate` : undefined}
            />
            <StatTile label="Cărți vândute" value={data.closedListings} />
            <StatTile label="Preț median" value={box.median} decimals={2} format={formatPrice} hint={`${data.totalFavorites} salvări la favorite`} />

            <ChartCard
                className={styles.wide}
                title="Distribuția prețurilor"
                description="Câte anunțuri există în fiecare interval de preț (lei)."
                table={{ columns: ['Interval (lei)', 'Anunțuri'], rows: histogram.map((bucket) => [bucket.label, bucket.count]) }}
            >
                <HistogramChart
                    data={histogram}
                    labelKey="label"
                    valueKey="count"
                    formatLabel={(label) => `${label} lei`}
                    formatValue={(value) => `${value} anunțuri`}
                />
            </ChartCard>

            <ChartCard className={styles.wide} title="Rezumatul prețurilor" description="Jumătate dintre anunțuri au prețul între Q1 și Q3.">
                <dl className={styles.summary}>
                    {[
                        ['Minim', box.min], ['Q1 (25%)', box.q1], ['Mediana', box.median], ['Q3 (75%)', box.q3], ['Maxim', box.max],
                    ].map(([label, value]) => (
                        <div key={label} className={styles.summaryItem}>
                            <dt>{label}</dt>
                            <dd>{formatPrice(value)}</dd>
                        </div>
                    ))}
                </dl>
            </ChartCard>

            <ChartCard
                className={styles.half}
                title="Starea cărților"
                description="Anunțurile disponibile, după starea declarată."
                table={{ columns: ['Stare', 'Anunțuri'], rows: conditions.map((row) => [row.label, row.count]) }}
            >
                <RankedBarChart data={conditions} labelKey="label" valueKey="count" formatValue={(value) => `${value}`} />
            </ChartCard>

            <ChartCard
                className={styles.half}
                title="Unde se vând"
                description={`Orașele cu cele mai multe anunțuri · ${data.shippingListings} trimit și prin curier.`}
                table={{ columns: ['Oraș', 'Anunțuri'], rows: data.cities.map((row) => [row.city, row.count]) }}
            >
                {data.cities.length > 0
                    ? <RankedBarChart data={data.cities} labelKey="city" valueKey="count" formatValue={(value) => `${value}`} />
                    : <p className={styles.muted}>Niciun anunț nu are încă orașul completat.</p>}
            </ChartCard>

            <ChartCard
                className={styles.half}
                title="Cele mai populare genuri"
                description={`Numărul de anunțuri, top ${TOP_GENRES}.`}
                table={{ columns: ['Gen', 'Anunțuri'], rows: byCount.map((row) => [row.label, row.count]) }}
            >
                <RankedBarChart data={byCount} labelKey="label" valueKey="count" formatValue={(value) => `${value}`} />
            </ChartCard>

            <ChartCard
                className={styles.half}
                title="Prețul mediu pe gen"
                description="Genurile cu cele mai scumpe anunțuri."
                table={{ columns: ['Gen', 'Preț mediu'], rows: byPrice.map((row) => [row.label, formatPrice(row.averagePrice)]) }}
            >
                <RankedBarChart data={byPrice} labelKey="label" valueKey="averagePrice" formatValue={(value) => formatPrice(value)} />
            </ChartCard>
        </div>
    );
}
