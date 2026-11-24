import { Eye, Heart, PackageOpen, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { formatCount, formatDate, formatPrice } from '@/shared/lib/format';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, SegmentedControl, Skeleton } from '@/shared/ui';
import { ListingGrid } from '../components/ListingCard';
import ListingImage from '../components/ListingImage';
import ListingOwnerActions from '../components/ListingOwnerActions';
import { conditionLabel } from '../constants';
import { useFavoriteListings, useMyListings } from '../hooks';
import styles from './MyListingsPage.module.css';

const DEFAULT_FILTERS = { tab: 'active', page: 1 };
const FAVORITES_PER_PAGE = 24;

const TABS = [
    { value: 'active', label: 'Active', match: (listing) => listing.isAvailable && !listing.isReserved },
    { value: 'rezervate', label: 'Rezervate', match: (listing) => listing.isAvailable && listing.isReserved },
    { value: 'vandute', label: 'Vândute', match: (listing) => !listing.isAvailable },
    { value: 'salvate', label: 'Salvate' },
];

function OwnListing({ listing }) {
    return (
        <Card padding="none" className={styles.item}>
            <Link to={paths.listing(listing.id)} className={styles.thumbLink} tabIndex={-1}>
                <ListingImage src={listing.imageUrl} alt="" className={styles.thumb} />
            </Link>
            <div className={styles.body}>
                <div className={styles.header}>
                    <Link to={paths.listing(listing.id)} className={styles.title}>{listing.title}</Link>
                    {!listing.isAvailable
                        ? <Badge>Vândut</Badge>
                        : listing.isReserved ? <Badge tone="warning" dot>Rezervat</Badge> : <Badge tone="success" dot>Activ</Badge>}
                </div>
                <p className={styles.meta}>
                    <strong className={styles.price}>{formatPrice(listing.price)}</strong>
                    <span>{conditionLabel(listing.condition)}{listing.isNegotiable && ' · negociabil'}</span>
                    <span>publicat pe {formatDate(listing.createdAt)}</span>
                </p>
                <p className={styles.stats}>
                    <span title="Vizualizări"><Eye aria-hidden="true" /> {formatCount(listing.viewCount)}</span>
                    <span title="Salvări"><Heart aria-hidden="true" /> {formatCount(listing.favoriteCount)}</span>
                </p>
                <ListingOwnerActions listing={listing} compact onDeleted={() => {}} />
            </div>
        </Card>
    );
}

function SavedListings({ page, onPageChange }) {
    const favorites = useFavoriteListings({ page, limit: FAVORITES_PER_PAGE });
    if (favorites.isError) return <ErrorState onRetry={favorites.refetch} />;
    if (favorites.data?.total === 0) {
        return (
            <EmptyState
                icon={<Heart />}
                title="Nu ai salvat încă niciun anunț"
                description="Apasă pe inimioara unui anunț ca să-l găsești ușor aici."
                action={<Button to={paths.marketplace}>Răsfoiește bazarul</Button>}
            />
        );
    }
    return (
        <>
            <ListingGrid listings={favorites.data?.items ?? []} loading={favorites.isPending} skeletonCount={4} compact />
            <Pagination page={page} totalPages={favorites.data?.totalPages} onPageChange={onPageChange} />
        </>
    );
}

export default function MyListingsPage() {
    useDocumentTitle('Anunțurile mele');
    const [filters, setFilters] = useSearchParamsState(DEFAULT_FILTERS);
    const isSaved = filters.tab === 'salvate';
    const listings = useMyListings();
    const savedCount = useFavoriteListings({ page: 1, limit: FAVORITES_PER_PAGE }).data?.total;

    const all = listings.data ?? [];
    const tab = TABS.find((item) => item.value === filters.tab) ?? TABS[0];
    const visible = tab.match ? all.filter(tab.match) : [];

    return (
        <div>
            <PageHeader
                eyebrow="Bazar"
                title="Anunțurile mele"
                subtitle="Editează anunțurile, marchează cărțile rezervate sau vândute și revino la anunțurile salvate."
                actions={<Button leftIcon={<Plus />} to={paths.createListing}>Anunț nou</Button>}
            />

            <SegmentedControl
                className={styles.filter}
                label="Filtrează anunțurile"
                value={tab.value}
                onChange={(value) => setFilters({ tab: value })}
                options={TABS.map((option) => {
                    const count = option.match ? all.filter(option.match).length : savedCount;
                    return { value: option.value, label: count === undefined ? option.label : `${option.label} (${count})` };
                })}
            />

            {isSaved ? (
                <SavedListings page={filters.page} onPageChange={(page) => setFilters({ tab: filters.tab, page })} />
            ) : (
                <>
                    {listings.isError && <ErrorState onRetry={listings.refetch} />}
                    {listings.isPending && (
                        <div className={styles.list}>
                            {[1, 2, 3].map((key) => <Skeleton key={key} height="8rem" radius="var(--radius-lg)" />)}
                        </div>
                    )}
                    {listings.isSuccess && visible.length === 0 && (
                        <EmptyState
                            icon={<PackageOpen />}
                            title={all.length === 0 ? 'Nu ai publicat încă niciun anunț' : 'Niciun anunț aici'}
                            description={all.length === 0 ? 'Ai cărți citite pe raft? Dă-le o nouă viață.' : undefined}
                            action={all.length === 0 && <Button to={paths.createListing} leftIcon={<Plus />}>Publică primul anunț</Button>}
                        />
                    )}
                    <ul className={styles.list} role="list">
                        {visible.map((listing) => <li key={listing.id}><OwnListing listing={listing} /></li>)}
                    </ul>
                </>
            )}
        </div>
    );
}
