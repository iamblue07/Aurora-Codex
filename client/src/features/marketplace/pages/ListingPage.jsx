import {
    ArrowLeft, BadgePercent, BookOpen, CalendarDays, Eye, Heart, MapPin, MessageCircle, PackageCheck, PackageX, Send,
    Share2, ShieldCheck, Store, Truck, UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import BookCover from '@/features/books/components/BookCover';
import ReportButton from '@/features/reports/components/ReportButton';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useGoBack from '@/shared/hooks/useGoBack';
import { prettyGenreLabel } from '@/shared/hooks/useGenres';
import { formatCount, formatDate, formatPrice, formatRelativeTime } from '@/shared/lib/format';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Skeleton, SkeletonText, Textarea } from '@/shared/ui';
import FavoriteButton from '../components/FavoriteButton';
import { ListingGrid } from '../components/ListingCard';
import ListingGallery from '../components/ListingGallery';
import ListingOwnerActions from '../components/ListingOwnerActions';
import { conditionLabel, discountPercent } from '../constants';
import { useListing, useListingSearch, useMyChatForListing, useSimilarListings, useStartChat } from '../hooks';
import styles from './ListingPage.module.css';

function ContactSeller({ listing }) {
    const { isAuthenticated, permissions } = useAuth();
    const existingChat = useMyChatForListing(listing.id, isAuthenticated);
    const startChat = useStartChat(listing.id);
    const [message, setMessage] = useState(`Bună! Mai este disponibilă „${listing.title}”?`);

    if (!isAuthenticated) {
        return <Button to={`${paths.login}?next=${encodeURIComponent(paths.listing(listing.id))}`} fullWidth>Conectează-te pentru a contacta vânzătorul</Button>;
    }
    if (existingChat.isPending) return <Skeleton height="2.75rem" radius="var(--radius-full)" />;

    const chat = existingChat.data?.chat;
    if (chat) {
        return <Button to={paths.chat(chat.id)} leftIcon={<MessageCircle />} fullWidth>Continuă conversația</Button>;
    }
    if (!listing.isAvailable) return <p className={styles.note}>Cartea a fost vândută. Anunțul nu mai acceptă mesaje.</p>;
    if (permissions.canSendMessages === false) {
        return <p className={styles.note}>Dreptul tău de a trimite mesaje a fost retras de un administrator.</p>;
    }

    return (
        <form className={styles.contact} onSubmit={(event) => { event.preventDefault(); startChat.mutate(message.trim()); }}>
            {listing.isReserved && <p className={styles.note}>Cartea este rezervată pentru alt cumpărător, dar poți întreba dacă se eliberează.</p>}
            <Textarea
                label="Scrie-i vânzătorului"
                value={message}
                maxLength={2000}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
            />
            <Button type="submit" leftIcon={<Send />} loading={startChat.isPending} disabled={!message.trim()} fullWidth>
                Trimite mesajul
            </Button>
        </form>
    );
}

/** "37% cheaper than at Cărturești (160 lei)" when the listing is linked to a catalogue book. */
function PriceComparison({ listing }) {
    const { storePrice } = listing;
    if (!storePrice) return null;
    const discount = discountPercent(listing.price, storePrice.price);
    return (
        <Link to={`${paths.book(listing.bookId)}#oferte`} className={styles.compare}>
            <BadgePercent aria-hidden="true" />
            <span>
                {discount
                    ? <><strong>Cu {discount}% mai ieftin</strong> decât în librării</>
                    : <>Prețul din librării</>}
                <span className={styles.compareStore}>
                    de la {formatPrice(storePrice.price)} la {storePrice.store}
                </span>
            </span>
        </Link>
    );
}

async function share(listing) {
    const url = window.location.href;
    try {
        if (navigator.share) {
            await navigator.share({ title: listing.title, text: `${listing.title} – ${formatPrice(listing.price)}`, url });
            return;
        }
        await navigator.clipboard.writeText(url);
        toast.success('Linkul anunțului a fost copiat.');
    } catch (error) {
        if (error?.name !== 'AbortError') toast.error('Nu am putut copia linkul.');
    }
}

function Details({ listing }) {
    const delivery = [listing.offersPickup && 'predare personală', listing.offersShipping && 'curier'].filter(Boolean).join(' sau ');
    const rows = [
        { icon: <PackageCheck />, label: 'Stare', value: conditionLabel(listing.condition) },
        listing.author && { icon: <UserRound />, label: 'Autor', value: listing.author },
        listing.genre && { icon: <BookOpen />, label: 'Gen', value: prettyGenreLabel(listing.genre.label) },
        listing.city && { icon: <MapPin />, label: 'Localitate', value: listing.city },
        { icon: <Truck />, label: 'Livrare', value: delivery.charAt(0).toUpperCase() + delivery.slice(1) },
        { icon: <CalendarDays />, label: 'Publicat', value: formatDate(listing.createdAt) },
        { icon: <Eye />, label: 'Vizualizări', value: formatCount(listing.viewCount) },
        { icon: <Heart />, label: 'Salvat de', value: listing.favoriteCount === 1 ? '1 cititor' : `${formatCount(listing.favoriteCount)} cititori` },
    ].filter(Boolean);
    return (
        <dl className={styles.details}>
            {rows.map((row) => (
                <div key={row.label} className={styles.detail}>
                    <dt>{row.icon} {row.label}</dt>
                    <dd>{row.value}</dd>
                </div>
            ))}
        </dl>
    );
}

function SellerCard({ listing }) {
    const { seller, sellerStats } = listing;
    return (
        <Card padding="lg" className={styles.sellerCard}>
            <Link to={paths.user(seller.id)} className={styles.seller}>
                <Avatar src={seller.avatarUrl} name={seller.username} size="md" />
                <span>
                    <span className={styles.sellerLabel}>Vânzător</span>
                    <span className={styles.sellerName}>{seller.username}</span>
                </span>
            </Link>
            {sellerStats && (
                <dl className={styles.sellerStats}>
                    <div><dt>Membru din</dt><dd>{formatDate(sellerStats.memberSince)}</dd></div>
                    <div><dt>Anunțuri active</dt><dd>{formatCount(sellerStats.activeListings)}</dd></div>
                    <div><dt>Cărți vândute</dt><dd>{formatCount(sellerStats.soldListings)}</dd></div>
                </dl>
            )}
            {listing.isOwner ? <ListingOwnerActions listing={listing} /> : <ContactSeller listing={listing} />}
            {!listing.isOwner && (
                <div className={styles.reportRow}>
                    <ReportButton targetType="listing" targetId={listing.id} variant="text" />
                </div>
            )}
        </Card>
    );
}

function MoreListings({ listing }) {
    const fromSeller = useListingSearch({ seller: listing.seller.id, limit: 5, sort: 'newest' });
    const similar = useSimilarListings(listing.id);
    const others = (fromSeller.data?.items ?? []).filter((item) => item.id !== listing.id).slice(0, 4);
    return (
        <>
            {others.length > 0 && (
                <section className={styles.more}>
                    <div className={styles.moreHead}>
                        <h2 className={styles.sectionTitle}>Mai multe de la {listing.seller.username}</h2>
                        <Link to={paths.user(listing.seller.id)} className={styles.moreLink}>Vezi profilul →</Link>
                    </div>
                    <ListingGrid listings={others} compact />
                </section>
            )}
            {similar.data?.length > 0 && (
                <section className={styles.more}>
                    <div className={styles.moreHead}>
                        <h2 className={styles.sectionTitle}>Te-ar putea interesa</h2>
                        <Link to={`${paths.marketplace}${listing.genre ? `?genre=${listing.genre.code}` : ''}`} className={styles.moreLink}>
                            Vezi tot genul →
                        </Link>
                    </div>
                    <ListingGrid listings={similar.data} compact />
                </section>
            )}
        </>
    );
}

export default function ListingPage() {
    const { listingId } = useParams();
    const goBack = useGoBack(paths.marketplace);
    const listing = useListing(listingId);
    useDocumentTitle(listing.data?.title ?? 'Anunț');

    if (listing.isError) {
        return listing.error.status === 404
            ? <EmptyState icon={<PackageX />} title="Anunțul nu mai există" description="Poate a fost șters de vânzător." action={<Button to={paths.marketplace}>Înapoi la bazar</Button>} />
            : <ErrorState onRetry={listing.refetch} />;
    }

    const data = listing.data;
    const sold = data && !data.isAvailable;
    return (
        <div className={styles.page}>
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft />} onClick={goBack} className={styles.back}>Înapoi</Button>

            <div className={styles.layout}>
                <div className={styles.main}>
                    {listing.isPending
                        ? <Skeleton className={styles.imageSkeleton} height="auto" radius="var(--radius-xl)" />
                        : <ListingGallery images={data.images} title={data.title} sold={sold} />}

                    <Card as="section">
                        {listing.isPending ? <SkeletonText lines={5} /> : (
                            <>
                                <h2 className={styles.sectionTitle}>Descriere</h2>
                                <p className={styles.description}>{data.description}</p>
                            </>
                        )}
                    </Card>

                    {data && (
                        <Card as="section">
                            <h2 className={styles.sectionTitle}>Detalii</h2>
                            <Details listing={data} />
                        </Card>
                    )}

                    {data?.book && (
                        <Link to={paths.book(data.book.id)} className={styles.book}>
                            <BookCover src={data.book.coverUrl} title={data.book.title} size="sm" className={styles.bookCover} />
                            <span className={styles.bookText}>
                                <span className={styles.bookLabel}><BookOpen aria-hidden="true" /> Cartea în catalog</span>
                                <strong>{data.book.title}</strong>
                                <span>{data.book.author ?? 'Autor necunoscut'} · recenzii, prețuri din librării și recomandări</span>
                            </span>
                        </Link>
                    )}
                </div>

                <aside className={styles.side}>
                    <Card padding="lg" className={styles.summary}>
                        {listing.isPending ? <SkeletonText lines={4} /> : (
                            <>
                                <div className={styles.badges}>
                                    {sold
                                        ? <Badge>Vândut</Badge>
                                        : data.isReserved ? <Badge tone="warning" dot>Rezervat</Badge> : <Badge tone="success" dot>Disponibil</Badge>}
                                    {!sold && data.isNegotiable && <Badge tone="primary">Preț negociabil</Badge>}
                                    <Badge tone="neutral">{conditionLabel(data.condition)}</Badge>
                                </div>
                                <h1 className={styles.title}>{data.title}</h1>
                                {data.author && <p className={styles.author}>{data.author}</p>}
                                <p className={styles.price}>{formatPrice(data.price)}</p>
                                <PriceComparison listing={data} />
                                <ul className={styles.facts} role="list">
                                    {data.city && <li><MapPin aria-hidden="true" /> {data.city}</li>}
                                    {data.offersShipping && <li><Truck aria-hidden="true" /> Trimite și prin curier</li>}
                                    <li><CalendarDays aria-hidden="true" /> Publicat {formatRelativeTime(data.createdAt)}</li>
                                </ul>
                                <div className={styles.summaryActions}>
                                    {!sold && <FavoriteButton listing={data} variant="pill" />}
                                    <Button variant="ghost" size="sm" leftIcon={<Share2 />} onClick={() => share(data)}>Distribuie</Button>
                                </div>
                            </>
                        )}
                    </Card>

                    {data && <SellerCard listing={data} />}

                    <div className={styles.safety}>
                        <ShieldCheck aria-hidden="true" />
                        <p>Nu comunica date bancare. Păstrează discuția în aplicație, verifică starea cărții la predare și raportează orice comportament suspect.</p>
                    </div>
                </aside>
            </div>

            {data && <MoreListings listing={data} />}

            {data && !data.isOwner && (
                <p className={styles.sellCta}>
                    <Store aria-hidden="true" /> Ai și tu cărți pe care nu le mai citești?{' '}
                    <Link to={paths.createListing}>Publică un anunț</Link>
                </p>
            )}
        </div>
    );
}
