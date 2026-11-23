import { ArrowLeft, BookOpen, CalendarDays, MessageCircle, PackageX, Send, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import ReportButton from '@/features/reports/components/ReportButton';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useGoBack from '@/shared/hooks/useGoBack';
import { prettyGenreLabel } from '@/shared/hooks/useGenres';
import { apiUrl } from '@/shared/api/http-client';
import { formatDate, formatPrice } from '@/shared/lib/format';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Lightbox, Skeleton, SkeletonText, Textarea } from '@/shared/ui';
import ListingImage from '../components/ListingImage';
import ListingOwnerActions from '../components/ListingOwnerActions';
import { useListing, useMyChatForListing, useStartChat } from '../hooks';
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
    if (!listing.isAvailable) return <p className={styles.note}>Anunțul este închis și nu mai acceptă mesaje.</p>;
    if (permissions.canSendMessages === false) {
        return <p className={styles.note}>Dreptul tău de a trimite mesaje a fost retras de un administrator.</p>;
    }

    return (
        <form className={styles.contact} onSubmit={(event) => { event.preventDefault(); startChat.mutate(message.trim()); }}>
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

export default function ListingPage() {
    const { listingId } = useParams();
    const goBack = useGoBack(paths.marketplace);
    const listing = useListing(listingId);
    const [zoomed, setZoomed] = useState(false);
    useDocumentTitle(listing.data?.title ?? 'Anunț');

    if (listing.isError) {
        return listing.error.status === 404
            ? <EmptyState icon={<PackageX />} title="Anunțul nu mai există" description="Poate a fost șters de vânzător." action={<Button to={paths.marketplace}>Înapoi la bazar</Button>} />
            : <ErrorState onRetry={listing.refetch} />;
    }

    const data = listing.data;
    return (
        <div className={styles.page}>
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft />} onClick={goBack} className={styles.back}>Înapoi</Button>

            <div className={styles.layout}>
                <div className={styles.main}>
                    {listing.isPending ? (
                        <Skeleton className={styles.image} height="auto" radius="var(--radius-xl)" />
                    ) : (
                        <ListingImage src={data.imageUrl} alt={data.title} className={styles.image} onClick={() => setZoomed(true)} />
                    )}

                    <Card as="section">
                        {listing.isPending ? <SkeletonText lines={5} /> : (
                            <>
                                <h2 className={styles.sectionTitle}>Descriere</h2>
                                <p className={styles.description}>{data.description}</p>
                            </>
                        )}
                    </Card>
                </div>

                <aside className={styles.side}>
                    <Card padding="lg" className={styles.summary}>
                        {listing.isPending ? <SkeletonText lines={4} /> : (
                            <>
                                <div className={styles.badges}>
                                    {data.isAvailable ? <Badge tone="success" dot>Disponibil</Badge> : <Badge>Închis</Badge>}
                                    {data.isNegotiable && <Badge tone="primary">Preț negociabil</Badge>}
                                </div>
                                <h1 className={styles.title}>{data.title}</h1>
                                <p className={styles.price}>{formatPrice(data.price)}</p>
                                <ul className={styles.facts} role="list">
                                    {data.genre && <li><BookOpen aria-hidden="true" /> {prettyGenreLabel(data.genre.label)}</li>}
                                    <li><CalendarDays aria-hidden="true" /> Publicat pe {formatDate(data.createdAt)}</li>
                                </ul>
                                {data.bookId && (
                                    <Link to={paths.book(data.bookId)} className={styles.bookLink}>Vezi cartea în catalog și prețurile din librării →</Link>
                                )}
                            </>
                        )}
                    </Card>

                    {data && (
                        <Card padding="lg" className={styles.sellerCard}>
                            <Link to={paths.user(data.seller.id)} className={styles.seller}>
                                <Avatar src={data.seller.avatarUrl} name={data.seller.username} size="md" />
                                <span>
                                    <span className={styles.sellerLabel}>Vânzător</span>
                                    <span className={styles.sellerName}>{data.seller.username}</span>
                                </span>
                            </Link>
                            {data.isOwner ? <ListingOwnerActions listing={data} /> : <ContactSeller listing={data} />}
                            {!data.isOwner && (
                                <div className={styles.reportRow}>
                                    <ReportButton targetType="listing" targetId={data.id} variant="text" />
                                </div>
                            )}
                        </Card>
                    )}

                    <div className={styles.safety}>
                        <ShieldCheck aria-hidden="true" />
                        <p>Nu comunica date bancare. Păstrează discuția în aplicație pentru a beneficia de protecție și raportează orice comportament suspect.</p>
                    </div>
                </aside>
            </div>

            {data?.imageUrl && (
                <Lightbox open={zoomed} onClose={() => setZoomed(false)} src={apiUrl(data.imageUrl)} alt={data.title} caption={data.title} />
            )}
        </div>
    );
}
