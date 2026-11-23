import { BookOpen, Store } from 'lucide-react';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { PageHeader, SegmentedControl } from '@/shared/ui';
import BookStatistics from '../components/BookStatistics';
import ListingStatistics from '../components/ListingStatistics';
import styles from './StatisticsPage.module.css';

const DEFAULT_FILTERS = { view: 'books' };

export default function StatisticsPage() {
    useDocumentTitle('Statistici');
    const [filters, setFilters] = useSearchParamsState(DEFAULT_FILTERS);

    return (
        <div>
            <PageHeader
                eyebrow="Date deschise"
                title="Statistici"
                subtitle="Cum arată catalogul de cărți și bazarul comunității, în cifre."
            />
            <SegmentedControl
                className={styles.tabs}
                label="Setul de date"
                value={filters.view}
                onChange={(view) => setFilters({ view })}
                options={[
                    { value: 'books', label: 'Catalogul de cărți', icon: <BookOpen /> },
                    { value: 'listings', label: 'Bazarul', icon: <Store /> },
                ]}
            />
            {filters.view === 'listings' ? <ListingStatistics /> : <BookStatistics />}
        </div>
    );
}
