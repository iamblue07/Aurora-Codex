import { ExternalLink, Store } from 'lucide-react';
import { formatPrice } from '@/shared/lib/format';
import { Badge, EmptyState, Skeleton } from '@/shared/ui';
import styles from './OffersList.module.css';

/** Bookstore offers for a book, cheapest first; the cheapest one is highlighted. */
export default function OffersList({ offers, googleOffer, loading }) {
    if (loading) {
        return (
            <div className={styles.list}>
                {[1, 2].map((key) => <Skeleton key={key} height="4.25rem" radius="var(--radius-md)" />)}
            </div>
        );
    }

    const rows = [
        ...offers.map((offer) => ({ id: offer.id, store: offer.store, url: offer.url, label: formatPrice(offer.price), price: offer.price })),
        ...(googleOffer
            ? [{ id: 'google', store: 'Google Books', url: googleOffer.url, label: `${googleOffer.amount} ${googleOffer.currency}`, price: null }]
            : []),
    ];

    if (rows.length === 0) {
        return <EmptyState icon={<Store />} title="Nicio ofertă momentan" description="Nu am găsit această carte în librăriile partenere." compact />;
    }

    return (
        <ul className={styles.list} role="list">
            {rows.map((row, index) => (
                <li key={row.id}>
                    <a href={row.url} target="_blank" rel="noopener noreferrer" className={styles.offer}>
                        <span className={styles.storeIcon} aria-hidden="true">{row.store.charAt(0)}</span>
                        <span className={styles.store}>
                            {row.store}
                            {index === 0 && row.price !== null && <Badge tone="success">Cel mai bun preț</Badge>}
                        </span>
                        <span className={styles.price}>{row.label}</span>
                        <ExternalLink className={styles.external} aria-hidden="true" />
                    </a>
                </li>
            ))}
        </ul>
    );
}
