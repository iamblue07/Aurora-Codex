import { BookOpen, Store, Users } from 'lucide-react';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { PageHeader, SegmentedControl } from '@/shared/ui';
import BookStatistics from '../components/BookStatistics';
import CommunityStatistics from '../components/CommunityStatistics';
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
                subtitle="Catalogul de cărți, bazarul și comunitatea Aurora Codex, în cifre."
            />
            <SegmentedControl
                className={styles.tabs}
                label="Setul de date"
                value={filters.view}
                onChange={(view) => setFilters({ view })}
                options={[
                    { value: 'books', label: 'Catalogul de cărți', icon: <BookOpen /> },
                    { value: 'listings', label: 'Bazarul', icon: <Store /> },
                    { value: 'community', label: 'Comunitatea', icon: <Users /> },
                ]}
            />
            {filters.view === 'listings' && <ListingStatistics />}
            {filters.view === 'community' && <CommunityStatistics />}
            {filters.view !== 'listings' && filters.view !== 'community' && <BookStatistics />}
        </div>
    );
}
