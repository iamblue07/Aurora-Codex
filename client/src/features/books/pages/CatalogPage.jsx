import { BookSearch, SlidersHorizontal, Sparkles, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import useAuth from '@/features/auth/useAuth';
import RecommendationsPanel from '@/features/recommendations/components/RecommendationsPanel';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { plural } from '@/shared/lib/format';
import { Button, Card, EmptyState, ErrorState, IconButton, Input, PageHeader, Pagination, SegmentedControl } from '@/shared/ui';
import BookGrid from '../components/BookGrid';
import CatalogFilters from '../components/CatalogFilters';
import { useBookSearch } from '../hooks';
import styles from './CatalogPage.module.css';

const PAGE_SIZE = 24;
const DEFAULT_FILTERS = { q: '', genres: [], min: '', max: '', sort: '', page: 1, tab: 'all' };

export default function CatalogPage() {
    useDocumentTitle('Cărți');
    const { isAuthenticated } = useAuth();
    const [filters, setFilters, resetFilters] = useSearchParamsState(DEFAULT_FILTERS);
    const [searchDraft, setSearchDraft] = useState(filters.q);
    const [filtersOpen, setFiltersOpen] = useState(false);

    useEffect(() => setSearchDraft(filters.q), [filters.q]);

    const search = useBookSearch({
        search: filters.q,
        genres: filters.genres,
        minPrice: filters.min,
        maxPrice: filters.max,
        sort: filters.sort,
        page: filters.page,
        limit: PAGE_SIZE,
    });

    const showRecommendations = isAuthenticated && filters.tab === 'ai';
    const resetAll = () => { resetFilters(); setSearchDraft(''); };

    return (
        <div>
            <PageHeader
                eyebrow="Catalog"
                title="Găsește-ți următoarea carte"
                subtitle="Peste 50.000 de titluri, cu cele mai bune prețuri din librăriile din România."
            />

            <form className={styles.searchBar} onSubmit={(event) => { event.preventDefault(); setFilters({ q: searchDraft.trim(), tab: 'all' }); }} role="search">
                <Input
                    aria-label="Caută după titlu"
                    placeholder="Caută după titlu…"
                    leadingIcon={<Search />}
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    trailing={searchDraft && (
                        <IconButton label="Șterge căutarea" size="sm" onClick={() => { setSearchDraft(''); setFilters({ q: '' }); }}>
                            <X />
                        </IconButton>
                    )}
                    className={styles.searchInput}
                />
                <Button type="submit" size="lg">Caută</Button>
            </form>

            {isAuthenticated && (
                <SegmentedControl
                    className={styles.tabs}
                    label="Vizualizare"
                    value={filters.tab}
                    onChange={(tab) => setFilters({ tab })}
                    options={[
                        { value: 'all', label: 'Toate cărțile', icon: <BookSearch /> },
                        { value: 'ai', label: 'Recomandate pentru tine', icon: <Sparkles /> },
                    ]}
                />
            )}

            {showRecommendations ? (
                <RecommendationsPanel />
            ) : (
                <div className={styles.layout}>
                    <aside className={styles.sidebar}>
                        <Button
                            variant="secondary"
                            leftIcon={<SlidersHorizontal />}
                            className={styles.filtersToggle}
                            onClick={() => setFiltersOpen((open) => !open)}
                            aria-expanded={filtersOpen}
                        >
                            {filtersOpen ? 'Ascunde filtrele' : 'Filtre'}
                        </Button>
                        <Card className={filtersOpen ? styles.filtersOpen : styles.filtersCard} padding="md">
                            <CatalogFilters filters={filters} onChange={setFilters} onReset={resetAll} />
                        </Card>
                    </aside>

                    <section className={styles.results} aria-live="polite">
                        <p className={styles.resultsMeta}>
                            {search.data
                                ? `${plural(search.data.total, 'carte găsită', 'cărți găsite')}${filters.q ? ` pentru „${filters.q}”` : ''}`
                                : ' '}
                        </p>

                        {search.isError ? (
                            <ErrorState onRetry={search.refetch} />
                        ) : search.data?.total === 0 ? (
                            <EmptyState
                                icon={<BookSearch />}
                                title="Nicio carte nu se potrivește"
                                description="Încearcă alte cuvinte-cheie sau renunță la câteva filtre."
                                action={<Button variant="secondary" onClick={resetAll}>Resetează căutarea</Button>}
                            />
                        ) : (
                            <BookGrid
                                books={search.data?.items ?? []}
                                loading={search.isPending}
                                className={search.isPlaceholderData ? styles.stale : undefined}
                            />
                        )}

                        <Pagination
                            page={filters.page}
                            totalPages={search.data?.totalPages}
                            onPageChange={(page) => { setFilters({ page }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        />
                    </section>
                </div>
            )}
        </div>
    );
}
