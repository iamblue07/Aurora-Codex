import clsx from 'clsx';
import { Heart, MessagesSquare, PackageOpen, Plus, Search, ShieldCheck, SlidersHorizontal, Store, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useGenres, { prettyGenreLabel } from '@/shared/hooks/useGenres';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { formatPrice, plural } from '@/shared/lib/format';
import { Button, EmptyState, ErrorState, Input, PageHeader, Pagination, Select } from '@/shared/ui';
import { ListingGrid } from '../components/ListingCard';
import MarketplaceFilters from '../components/MarketplaceFilters';
import { conditionLabel, LISTING_SORT_OPTIONS, LISTINGS_PER_PAGE, toggleInList } from '../constants';
import { useListingSearch } from '../hooks';
import styles from './MarketplacePage.module.css';

const DEFAULT_FILTERS = { q: '', genre: '', condition: '', city: '', shipping: '', min: '', max: '', sort: 'newest', page: 1 };
const FILTER_KEYS = ['genre', 'condition', 'city', 'shipping', 'min', 'max'];

/** Removable pills for the filters in use, so they are visible even with the panel closed. */
function ActiveFilters({ filters, onChange, genres }) {
    const pills = [];
    if (filters.q) pills.push({ key: 'q', label: `„${filters.q}”`, clear: { q: '' } });
    if (filters.genre) {
        const genre = genres.find((item) => item.code === filters.genre);
        pills.push({ key: 'genre', label: genre ? prettyGenreLabel(genre.label) : filters.genre, clear: { genre: '' } });
    }
    for (const code of filters.condition ? filters.condition.split(',') : []) {
        pills.push({ key: `c-${code}`, label: conditionLabel(code), clear: { condition: toggleInList(filters.condition, code) } });
    }
    if (filters.min || filters.max) {
        const label = filters.min && filters.max
            ? `${formatPrice(filters.min)} – ${formatPrice(filters.max)}`
            : filters.min ? `de la ${formatPrice(filters.min)}` : `până la ${formatPrice(filters.max)}`;
        pills.push({ key: 'price', label, clear: { min: '', max: '' } });
    }
    if (filters.city) pills.push({ key: 'city', label: filters.city, clear: { city: '' } });
    if (filters.shipping) pills.push({ key: 'shipping', label: 'Livrare prin curier', clear: { shipping: '' } });
    if (pills.length === 0) return null;

    return (
        <ul className={styles.pills} aria-label="Filtre active">
            {pills.map((pill) => (
                <li key={pill.key}>
                    <button type="button" className={styles.pill} onClick={() => onChange(pill.clear)} aria-label={`Elimină filtrul ${pill.label}`}>
                        {pill.label} <X aria-hidden="true" />
                    </button>
                </li>
            ))}
        </ul>
    );
}

export default function MarketplacePage() {
    useDocumentTitle('Bazar');
    const { isAuthenticated } = useAuth();
    const { genres } = useGenres();
    const [filters, setFilters, resetFilters] = useSearchParamsState(DEFAULT_FILTERS);
    const [searchDraft, setSearchDraft] = useState(filters.q);
    const [filtersOpen, setFiltersOpen] = useState(false);
    useEffect(() => setSearchDraft(filters.q), [filters.q]);

    const search = useListingSearch({
        search: filters.q || undefined,
        genre: filters.genre || undefined,
        condition: filters.condition || undefined,
        city: filters.city || undefined,
        shipping: filters.shipping ? 'true' : undefined,
        minPrice: filters.min || undefined,
        maxPrice: filters.max || undefined,
        sort: filters.sort,
        page: filters.page,
        limit: LISTINGS_PER_PAGE,
    });

    const activeCount = FILTER_KEYS.filter((key) => filters[key]).length;
    const hasFilters = Boolean(filters.q) || activeCount > 0;
    const reset = () => { resetFilters(); setSearchDraft(''); };

    return (
        <div>
            <PageHeader
                eyebrow="Bazar"
                title="Cărți la mâna a doua"
                subtitle="Vinde cărțile pe care le-ai citit sau găsește-ți următoarea lectură direct de la alți cititori."
                actions={isAuthenticated && (
                    <div className={styles.headerActions}>
                        <Button variant="ghost" leftIcon={<MessagesSquare />} to={paths.chats}>Conversații</Button>
                        <Button variant="secondary" leftIcon={<Store />} to={paths.myListings}>Anunțurile mele</Button>
                        <Button leftIcon={<Plus />} to={paths.createListing}>Publică un anunț</Button>
                    </div>
                )}
            />

            <form
                className={styles.search}
                role="search"
                onSubmit={(event) => { event.preventDefault(); setFilters({ q: searchDraft.trim() }); }}
            >
                <Input
                    aria-label="Caută în anunțuri"
                    placeholder="Caută după titlu sau autor…"
                    leadingIcon={<Search />}
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                />
                <Button type="submit">Caută</Button>
            </form>

            <div className={styles.layout}>
                <aside className={clsx(styles.sidebar, filtersOpen && styles.sidebarOpen)} id="filtre-bazar" aria-label="Filtre">
                    <MarketplaceFilters filters={filters} onChange={setFilters} onReset={reset} activeCount={activeCount} />
                    <Button className={styles.applyButton} fullWidth onClick={() => setFiltersOpen(false)}>
                        Arată {search.data ? plural(search.data.total, 'anunț', 'anunțuri') : 'anunțurile'}
                    </Button>
                </aside>

                <section className={styles.results} aria-label="Anunțuri">
                    <div className={styles.resultsBar}>
                        <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<SlidersHorizontal />}
                            className={styles.filtersToggle}
                            aria-expanded={filtersOpen}
                            aria-controls="filtre-bazar"
                            onClick={() => setFiltersOpen((open) => !open)}
                        >
                            Filtre{activeCount > 0 && ` (${activeCount})`}
                        </Button>
                        <p className={styles.meta} aria-live="polite">
                            {search.data ? plural(search.data.total, 'anunț disponibil', 'anunțuri disponibile') : ' '}
                        </p>
                        <Select
                            aria-label="Sortează"
                            className={styles.sort}
                            value={filters.sort}
                            onChange={(event) => setFilters({ sort: event.target.value })}
                        >
                            {LISTING_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </Select>
                    </div>

                    <ActiveFilters filters={filters} onChange={setFilters} genres={genres} />

                    {search.isError ? (
                        <ErrorState onRetry={search.refetch} />
                    ) : search.data?.total === 0 ? (
                        <EmptyState
                            icon={<PackageOpen />}
                            title={hasFilters ? 'Niciun anunț nu se potrivește' : 'Bazarul e gol deocamdată'}
                            description={hasFilters ? 'Încearcă alte filtre sau caută după autor.' : 'Fii primul care publică un anunț!'}
                            action={hasFilters
                                ? <Button variant="secondary" onClick={reset}>Resetează filtrele</Button>
                                : isAuthenticated && <Button to={paths.createListing} leftIcon={<Plus />}>Publică un anunț</Button>}
                        />
                    ) : (
                        <div className={search.isPlaceholderData ? styles.stale : undefined}>
                            <ListingGrid listings={search.data?.items ?? []} loading={search.isPending} skeletonCount={LISTINGS_PER_PAGE} compact />
                        </div>
                    )}

                    <Pagination
                        page={filters.page}
                        totalPages={search.data?.totalPages}
                        onPageChange={(page) => { setFilters({ page }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    />
                </section>
            </div>

            <aside className={styles.safety}>
                <ShieldCheck aria-hidden="true" />
                <p>
                    <strong>Tranzacții în siguranță.</strong> Nu trimite niciodată datele cardului și păstrează discuțiile în
                    aplicație. Dacă ceva pare suspect, raportează anunțul.
                    {isAuthenticated && <> Anunțurile salvate cu <Heart aria-hidden="true" className={styles.inlineIcon} /> le găsești în <Link to={`${paths.myListings}?tab=salvate`}>Anunțurile mele</Link>.</>}
                </p>
            </aside>
        </div>
    );
}
