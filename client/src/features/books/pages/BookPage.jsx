import { ArrowLeft, BookOpen, Calendar, FileText, Globe, Store } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { paths } from '@/app/paths';
import BookDiscussions from '@/features/forums/components/BookDiscussions';
import { ListingGrid } from '@/features/marketplace/components/ListingCard';
import SimilarBooks from '@/features/recommendations/components/SimilarBooks';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useGoBack from '@/shared/hooks/useGoBack';
import { prettyGenreLabel } from '@/shared/hooks/useGenres';
import { formatPrice } from '@/shared/lib/format';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, SkeletonText } from '@/shared/ui';
import BookCover from '../components/BookCover';
import BookRatingPanel from '../components/BookRatingPanel';
import EmotionProfile from '../components/EmotionProfile';
import OffersList from '../components/OffersList';
import { useBook, useBookListings, useBookOffers, useExternalBookInfo } from '../hooks';
import styles from './BookPage.module.css';

const DESCRIPTION_PREVIEW = 600;

function BookPageSkeleton() {
    return (
        <div className={styles.hero} aria-busy="true">
            <Skeleton className={styles.coverSkeleton} height="auto" radius="var(--radius-md)" />
            <div className={styles.info}>
                <Skeleton width="30%" height="1.2rem" />
                <Skeleton width="80%" height="2.5rem" />
                <Skeleton width="40%" height="1.2rem" />
                <SkeletonText lines={4} />
            </div>
        </div>
    );
}

function Description({ text }) {
    const [expanded, setExpanded] = useState(false);
    if (!text) return <p className={styles.muted}>Această carte nu are încă o descriere.</p>;
    const isLong = text.length > DESCRIPTION_PREVIEW;
    const shown = expanded || !isLong ? text : `${text.slice(0, DESCRIPTION_PREVIEW).trimEnd()}…`;
    return (
        <div className={styles.description}>
            {shown.split('\n').filter((paragraph) => paragraph.trim()).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {isLong && (
                <button type="button" className={styles.readMore} onClick={() => setExpanded((value) => !value)}>
                    {expanded ? 'Arată mai puțin' : 'Citește mai mult'}
                </button>
            )}
        </div>
    );
}

export default function BookPage() {
    const { bookId } = useParams();
    const goBack = useGoBack(paths.catalog);
    const book = useBook(bookId);
    const offers = useBookOffers(bookId);
    const [showListings, setShowListings] = useState(false);
    const listings = useBookListings(bookId, showListings);
    const google = useExternalBookInfo(bookId, Boolean(book.data?.isbn));
    useDocumentTitle(book.data?.title ?? 'Carte');

    if (book.isError) {
        return book.error.status === 404
            ? <EmptyState icon={<BookOpen />} title="Cartea nu există" description="Este posibil să fi fost eliminată din catalog." action={<Button onClick={goBack}>Înapoi</Button>} />
            : <ErrorState onRetry={book.refetch} />;
    }

    const data = book.data;
    const lowestPrice = offers.data?.[0]?.price;
    const meta = [
        google.data?.publisher && { icon: <BookOpen />, label: 'Editura', value: google.data.publisher },
        google.data?.year && { icon: <Calendar />, label: 'An apariție', value: google.data.year },
        google.data?.pageCount && { icon: <FileText />, label: 'Pagini', value: google.data.pageCount },
        google.data?.language && { icon: <Globe />, label: 'Limba', value: google.data.language },
    ].filter(Boolean);

    return (
        <article className={styles.page}>
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft />} onClick={goBack} className={styles.back}>
                Înapoi
            </Button>

            {book.isPending ? <BookPageSkeleton /> : (
                <div className={styles.hero}>
                    <div className={styles.coverColumn}>
                        <BookCover src={data.coverUrl} title={data.title} author={data.author} size="lg" />
                        {data.isbn && <p className={styles.isbn}>ISBN {data.isbn}</p>}
                    </div>

                    <div className={styles.info}>
                        {data.genre && <Badge tone="primary">{prettyGenreLabel(data.genre.label)}</Badge>}
                        <h1 className={styles.title}>{data.title}</h1>
                        <p className={styles.author}>{data.author ?? 'Autor necunoscut'}</p>

                        {lowestPrice !== undefined && (
                            <div className={styles.priceRow}>
                                <span className={styles.priceLabel}>Cel mai bun preț</span>
                                <span className={styles.price}>{formatPrice(lowestPrice)}</span>
                                <Button variant="soft" size="sm" href="#oferte">Vezi ofertele</Button>
                            </div>
                        )}

                        {meta.length > 0 && (
                            <dl className={styles.meta}>
                                {meta.map((item) => (
                                    <div key={item.label} className={styles.metaItem}>
                                        <dt>{item.icon}{item.label}</dt>
                                        <dd>{item.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}

                        <BookRatingPanel bookId={bookId} />
                    </div>
                </div>
            )}

            {data && (
                <div className={styles.sections}>
                    <Card as="section" className={styles.descriptionCard}>
                        <h2 className={styles.sectionTitle}>Despre carte</h2>
                        <Description text={data.description} />
                    </Card>

                    {Object.values(data.emotions ?? {}).some((value) => value !== null) && (
                        <Card as="section">
                            <h2 className={styles.sectionTitle}>Profil emoțional</h2>
                            <p className={styles.sectionHint}>Tonul descrierii, analizat de inteligența artificială.</p>
                            <EmotionProfile emotions={data.emotions} />
                        </Card>
                    )}

                    <section id="oferte" className={styles.fullWidth}>
                        <h2 className={styles.sectionTitle}>Oferte din librării</h2>
                        <OffersList offers={offers.data ?? []} googleOffer={google.data?.offer} loading={offers.isPending} />
                    </section>

                    <section className={styles.fullWidth}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>La mâna a doua, în bazar</h2>
                            <Button variant="secondary" size="sm" leftIcon={<Store />} onClick={() => setShowListings((value) => !value)}>
                                {showListings ? 'Ascunde anunțurile' : 'Vezi anunțurile'}
                            </Button>
                        </div>
                        {showListings && (
                            listings.data?.length === 0
                                ? <EmptyState icon={<Store />} title="Niciun anunț pentru această carte" description="Fii primul care o vinde în bazar!" compact />
                                : <ListingGrid listings={listings.data ?? []} loading={listings.isPending} skeletonCount={3} />
                        )}
                    </section>

                    <SimilarBooks bookId={data.id} titleClassName={styles.sectionTitle} />

                    <BookDiscussions bookId={data.id} titleClassName={styles.sectionTitle} />
                </div>
            )}
        </article>
    );
}
