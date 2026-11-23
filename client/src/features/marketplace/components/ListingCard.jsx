import clsx from 'clsx';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { prettyGenreLabel } from '@/shared/hooks/useGenres';
import { formatPrice, formatRelativeTime } from '@/shared/lib/format';
import { Avatar, Badge, Skeleton } from '@/shared/ui';
import ListingImage from './ListingImage';
import styles from './ListingCard.module.css';

/** Marketplace product card: photo, price, title, negotiable badge and seller. */
export default function ListingCard({ listing, className }) {
    return (
        <Link to={paths.listing(listing.id)} className={clsx(styles.card, className)}>
            <ListingImage src={listing.imageUrl} alt={listing.title} className={styles.image} />
            <div className={styles.badges}>
                {!listing.isAvailable && <Badge tone="neutral">Închis</Badge>}
                {listing.isAvailable && listing.isNegotiable && <Badge tone="success">Negociabil</Badge>}
            </div>
            <div className={styles.body}>
                <p className={styles.price}>{formatPrice(listing.price)}</p>
                <h3 className={styles.title}>{listing.title}</h3>
                {listing.genre && <p className={styles.genre}>{prettyGenreLabel(listing.genre.label)}</p>}
                <div className={styles.footer}>
                    {listing.seller && (
                        <span className={styles.seller}>
                            <Avatar src={listing.seller.avatarUrl} name={listing.seller.username} size="xs" />
                            {listing.seller.username}
                        </span>
                    )}
                    <time className={styles.date} dateTime={listing.createdAt}>{formatRelativeTime(listing.createdAt)}</time>
                </div>
            </div>
        </Link>
    );
}

export function ListingCardSkeleton() {
    return (
        <div className={styles.card} aria-hidden="true">
            <Skeleton className={styles.image} height="auto" radius="0" />
            <div className={styles.body}>
                <Skeleton width="35%" height="1.2rem" />
                <Skeleton width="85%" height="1rem" />
                <Skeleton width="50%" height="0.8rem" />
            </div>
        </div>
    );
}

/** Responsive grid of listing cards (or skeletons while loading). */
export function ListingGrid({ listings, loading = false, skeletonCount = 6 }) {
    return (
        <div className={styles.grid} aria-busy={loading || undefined}>
            {loading
                ? Array.from({ length: skeletonCount }, (_, index) => <ListingCardSkeleton key={index} />)
                : listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
    );
}
