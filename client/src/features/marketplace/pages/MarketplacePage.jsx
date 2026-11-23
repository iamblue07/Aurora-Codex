import { MessagesSquare, PackageOpen, Plus, Search, ShieldCheck, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useGenres from '@/shared/hooks/useGenres';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { plural } from '@/shared/lib/format';
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, Pagination, PriceRange, Select } from '@/shared/ui';
import { LISTING_SORT_OPTIONS } from '../api';
import { ListingGrid } from '../components/ListingCard';
import { useListingSearch } from '../hooks';
import styles from './MarketplacePage.module.css';

const PAGE_SIZE = 12;
const DEFAULT_FILTERS = { q: '', genre: '', min: '', max: '', sort: 'newest', page: 1 };

export default function MarketplacePage() {
    useDocumentTitle('Bazar');
    const { isAuthenticated } = useAuth();
    const { genres } = useGenres();
    const [filters, setFilters, resetFilters] = useSearchParamsState(DEFAULT_FILTERS);
    const [searchDraft, setSearchDraft] = useState(filters.q);
    useEffect(() => setSearchDraft(filters.q), [filters.q]);

    const search = useListingSearch({
        search: filters.q,
        genre: filters.genre,
        minPrice: filters.min,
        maxPrice: filters.max,
        sort: filters.sort,
        page: filters.page,
        limit: PAGE_SIZE,
    });

    const hasFilters = filters.q || filters.genre || filters.min || filters.max;

    return (
        <div>
            <PageHeader
                eyebrow="Bazar"
                title="Cărți la mâna a doua"
                subtitle="Vinde cărțile pe care le-ai citit sau găsește-ți următoarea lectură direct de la alți cititori."
                actions={isAuthenticated && (
                    <>
                        <Button variant="ghost" leftIcon={<MessagesSquare />} to={paths.chats}>Conversații</Button>
                        <Button variant="secondary" leftIcon={<Store />} to={paths.myListings}>Anunțurile mele</Button>
                        <Button leftIcon={<Plus />} to={paths.createListing}>Publică un anunț</Button>
                    </>
                )}
            />

            <Card className={styles.toolbar} padding="sm">
                <form
                    className={styles.search}
                    role="search"
                    onSubmit={(event) => { event.preventDefault(); setFilters({ q: searchDraft.trim() }); }}
                >
                    <Input
                        aria-label="Caută în anunțuri"
                        placeholder="Caută după titlul anunțului…"
                        leadingIcon={<Search />}
                        value={searchDraft}
                        onChange={(event) => setSearchDraft(event.target.value)}
                    />
                    <Button type="submit">Caută</Button>
                </form>
                <div className={styles.filters}>
                    <Select aria-label="Gen literar" value={filters.genre} onChange={(event) => setFilters({ genre: event.target.value })}>
                        <option value="">Toate genurile</option>
                        {genres.map((genre) => <option key={genre.code} value={genre.code}>{genre.label}</option>)}
                    </Select>
                    <PriceRange min={filters.min} max={filters.max} onChange={({ min, max }) => setFilters({ min, max })} />
                    <Select aria-label="Sortează" value={filters.sort} onChange={(event) => setFilters({ sort: event.target.value })}>
                        {LISTING_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                </div>
            </Card>

            <p className={styles.meta} aria-live="polite">
                {search.data ? plural(search.data.total, 'anunț disponibil', 'anunțuri disponibile') : ' '}
            </p>

            {search.isError ? (
                <ErrorState onRetry={search.refetch} />
            ) : search.data?.total === 0 ? (
                <EmptyState
                    icon={<PackageOpen />}
                    title={hasFilters ? 'Niciun anunț nu se potrivește' : 'Bazarul e gol deocamdată'}
                    description={hasFilters ? 'Încearcă alte filtre.' : 'Fii primul care publică un anunț!'}
                    action={hasFilters
                        ? <Button variant="secondary" onClick={() => { resetFilters(); setSearchDraft(''); }}>Resetează filtrele</Button>
                        : isAuthenticated && <Button to={paths.createListing} leftIcon={<Plus />}>Publică un anunț</Button>}
                />
            ) : (
                <div className={search.isPlaceholderData ? styles.stale : undefined}>
                    <ListingGrid listings={search.data?.items ?? []} loading={search.isPending} skeletonCount={PAGE_SIZE} />
                </div>
            )}

            <Pagination
                page={filters.page}
                totalPages={search.data?.totalPages}
                onPageChange={(page) => { setFilters({ page }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />

            <aside className={styles.safety}>
                <ShieldCheck aria-hidden="true" />
                <p>
                    <strong>Tranzacții în siguranță.</strong> Nu trimite niciodată datele cardului și păstrează discuțiile în
                    aplicație. Dacă ceva pare suspect, raportează anunțul.
                </p>
            </aside>
        </div>
    );
}
