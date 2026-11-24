import clsx from 'clsx';
import { MapPin, Truck } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { formatPrice, formatRelativeTime } from '@/shared/lib/format';
import { Avatar, Badge, Skeleton } from '@/shared/ui';
import { conditionLabel } from '../constants';
import FavoriteButton from './FavoriteButton';
import ListingImage from './ListingImage';
import styles from './ListingCard.module.css';

/** Marketplace product card: photo, status, price, title, author, condition, place and seller. */
export default function ListingCard({ listing, className }) {
    const sold = !listing.isAvailable;
    return (
        <article className={clsx(styles.card, sold && styles.sold, className)}>
            <Link to={paths.listing(listing.id)} className={styles.link} aria-label={listing.title} />
            <div className={styles.media}>
                <ListingImage src={listing.imageUrl} alt="" className={styles.image} />
                <div className={styles.badges}>
                    {sold && <Badge tone="neutral">Vândut</Badge>}
                    {!sold && listing.isReserved && <Badge tone="warning">Rezervat</Badge>}
                    {!sold && listing.isNegotiable && <Badge tone="success">Negociabil</Badge>}
                </div>
                {!sold && <FavoriteButton listing={listing} className={styles.favorite} />}
            </div>
            <div className={styles.body}>
                <p className={styles.price}>{formatPrice(listing.price)}</p>
                <h3 className={styles.title}>{listing.title}</h3>
                {listing.author && <p className={styles.author}>{listing.author}</p>}
                <ul className={styles.tags}>
                    {listing.condition && <li className={styles.condition}>{conditionLabel(listing.condition)}</li>}
                    {listing.city && <li><MapPin aria-hidden="true" /> {listing.city}</li>}
                    {listing.offersShipping && <li title="Trimite prin curier"><Truck aria-hidden="true" /> Curier</li>}
                </ul>
                <div className={styles.footer}>
                    {listing.seller && (
                        <span className={styles.seller}>
                            <Avatar src={listing.seller.avatarUrl} name={listing.seller.username} size="xs" />
                            <span>{listing.seller.username}</span>
                        </span>
                    )}
                    <time className={styles.date} dateTime={listing.createdAt}>{formatRelativeTime(listing.createdAt)}</time>
                </div>
            </div>
        </article>
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
export function ListingGrid({ listings, loading = false, skeletonCount = 6, compact = false }) {
    return (
        <div className={clsx(styles.grid, compact && styles.compact)} aria-busy={loading || undefined}>
            {loading
                ? Array.from({ length: skeletonCount }, (_, index) => <ListingCardSkeleton key={index} />)
                : listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
    );
}
