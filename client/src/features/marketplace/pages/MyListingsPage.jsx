import { PackageOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import { formatDate, formatPrice } from '@/shared/lib/format';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, SegmentedControl, Skeleton } from '@/shared/ui';
import ListingImage from '../components/ListingImage';
import ListingOwnerActions from '../components/ListingOwnerActions';
import { useMyListings } from '../hooks';
import styles from './MyListingsPage.module.css';

const FILTERS = [
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Închise' },
    { value: 'all', label: 'Toate' },
];

export default function MyListingsPage() {
    useDocumentTitle('Anunțurile mele');
    const listings = useMyListings();
    const [filter, setFilter] = useState('active');

    const all = listings.data ?? [];
    const visible = all.filter((listing) => (
        filter === 'all' || (filter === 'active' ? listing.isAvailable : !listing.isAvailable)
    ));
    const counts = { active: all.filter((l) => l.isAvailable).length, closed: all.filter((l) => !l.isAvailable).length };

    return (
        <div>
            <PageHeader
                eyebrow="Bazar"
                title="Anunțurile mele"
                subtitle="Gestionează prețurile, marchează cărțile vândute sau șterge anunțurile vechi."
                actions={<Button leftIcon={<Plus />} to={paths.createListing}>Anunț nou</Button>}
            />

            <SegmentedControl
                className={styles.filter}
                label="Filtrează anunțurile"
                value={filter}
                onChange={setFilter}
                options={FILTERS.map((option) => ({
                    ...option,
                    label: option.value === 'all' ? `${option.label} (${all.length})` : `${option.label} (${counts[option.value]})`,
                }))}
            />

            {listings.isError && <ErrorState onRetry={listings.refetch} />}
            {listings.isPending && (
                <div className={styles.list}>
                    {[1, 2, 3].map((key) => <Skeleton key={key} height="8rem" radius="var(--radius-lg)" />)}
                </div>
            )}
            {listings.isSuccess && visible.length === 0 && (
                <EmptyState
                    icon={<PackageOpen />}
                    title={all.length === 0 ? 'Nu ai publicat încă niciun anunț' : 'Niciun anunț în această categorie'}
                    description={all.length === 0 ? 'Ai cărți citite pe raft? Dă-le o nouă viață.' : undefined}
                    action={all.length === 0 && <Button to={paths.createListing} leftIcon={<Plus />}>Publică primul anunț</Button>}
                />
            )}

            <ul className={styles.list} role="list">
                {visible.map((listing) => (
                    <li key={listing.id}>
                        <Card padding="none" className={styles.item}>
                            <Link to={paths.listing(listing.id)} className={styles.thumbLink}>
                                <ListingImage src={listing.imageUrl} alt={listing.title} className={styles.thumb} />
                            </Link>
                            <div className={styles.body}>
                                <div className={styles.header}>
                                    <Link to={paths.listing(listing.id)} className={styles.title}>{listing.title}</Link>
                                    {listing.isAvailable
                                        ? <Badge tone="success" dot>Activ</Badge>
                                        : <Badge>Închis</Badge>}
                                </div>
                                <p className={styles.meta}>
                                    <strong className={styles.price}>{formatPrice(listing.price)}</strong>
                                    {listing.isNegotiable && ' · negociabil'} · publicat pe {formatDate(listing.createdAt)}
                                </p>
                                <ListingOwnerActions listing={listing} compact onDeleted={() => {}} />
                            </div>
                        </Card>
                    </li>
                ))}
            </ul>
        </div>
    );
}
