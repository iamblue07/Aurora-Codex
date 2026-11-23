import { ArrowRight, BookOpen, MessagesSquare, Search, Sparkles, Store } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import { useRandomBooks } from '@/features/books/hooks';
import libraryPhoto from '@/shared/assets/home-library.webp';
import readingPhoto from '@/shared/assets/home-reading.webp';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import { Button, Input } from '@/shared/ui';
import BookCarousel from '../components/BookCarousel';
import QuoteRotator from '../components/QuoteRotator';
import { FEATURES } from '../content';
import styles from './HomePage.module.css';

const FEATURE_META = {
    catalog: { icon: <BookOpen />, to: paths.catalog, cta: 'Explorează catalogul' },
    ai: { icon: <Sparkles />, to: `${paths.catalog}?tab=ai`, cta: 'Primește recomandări' },
    marketplace: { icon: <Store />, to: paths.marketplace, cta: 'Intră în bazar' },
    forums: { icon: <MessagesSquare />, to: paths.forums, cta: 'Alătură-te discuțiilor' },
};

export default function HomePage() {
    useDocumentTitle(null);
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const randomBooks = useRandomBooks();
    const [query, setQuery] = useState('');

    const search = (event) => {
        event.preventDefault();
        const q = query.trim();
        navigate(q ? `${paths.catalog}?q=${encodeURIComponent(q)}` : paths.catalog);
    };

    return (
        <div className={styles.page}>
            <section className={styles.hero}>
                <div className={styles.heroText}>
                    <p className={styles.eyebrow}>
                        {isAuthenticated && user ? `Bine ai revenit, ${user.username}!` : 'Comunitatea cititorilor din România'}
                    </p>
                    <h1 className={styles.headline}>
                        Următoarea ta carte preferată <span className={styles.highlight}>te așteaptă</span>.
                    </h1>
                    <p className={styles.lead}>
                        Compară prețurile din librării, primește recomandări create de inteligența artificială,
                        vinde cărțile citite și discută cu alți pasionați de lectură.
                    </p>
                    <form className={styles.search} onSubmit={search} role="search">
                        <Input
                            aria-label="Caută o carte"
                            placeholder="Caută un titlu…"
                            leadingIcon={<Search />}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <Button type="submit" size="lg">Caută</Button>
                    </form>
                    <div className={styles.quickLinks}>
                        <Link to={paths.marketplace}>Bazar</Link>
                        <Link to={paths.forums}>Forumuri</Link>
                        <Link to={paths.statistics}>Statistici</Link>
                    </div>
                </div>

                <div className={styles.heroVisual}>
                    <img src={readingPhoto} alt="O carte deschisă pe o masă" className={styles.heroPhoto} width="600" height="720" />
                    <div className={`${styles.floating} ${styles.floatingTop}`}>
                        <BookOpen aria-hidden="true" />
                        <span><strong>50.000+</strong> cărți în catalog</span>
                    </div>
                    <div className={`${styles.floating} ${styles.floatingBottom}`}>
                        <Sparkles aria-hidden="true" />
                        <span><strong>Recomandări AI</strong> după gusturile tale</span>
                    </div>
                </div>
            </section>

            <QuoteRotator />

            <section className={styles.section} aria-labelledby="discover-title">
                <div className={styles.sectionHeader}>
                    <h2 id="discover-title" className={styles.sectionTitle}>Descoperă ceva nou</h2>
                    <Link to={paths.catalog} className={styles.sectionLink}>Tot catalogul <ArrowRight aria-hidden="true" /></Link>
                </div>
                <BookCarousel
                    books={randomBooks.data ?? []}
                    loading={randomBooks.isPending}
                    error={randomBooks.isError}
                    onRetry={randomBooks.refetch}
                />
            </section>

            <section className={styles.section} aria-labelledby="features-title">
                <h2 id="features-title" className={styles.sectionTitle}>Tot ce îți trebuie ca cititor</h2>
                <div className={styles.features}>
                    {FEATURES.map((feature) => {
                        const meta = FEATURE_META[feature.id];
                        return (
                            <Link key={feature.id} to={meta.to} className={styles.feature}>
                                <span className={styles.featureIcon} aria-hidden="true">{meta.icon}</span>
                                <h3 className={styles.featureTitle}>{feature.title}</h3>
                                <p className={styles.featureText}>{feature.text}</p>
                                <span className={styles.featureCta}>{meta.cta} <ArrowRight aria-hidden="true" /></span>
                            </Link>
                        );
                    })}
                </div>
            </section>

            <section className={styles.split}>
                <img src={libraryPhoto} alt="Rafturi pline cu cărți într-o bibliotecă" className={styles.splitPhoto} loading="lazy" width="600" height="400" />
                <div className={styles.splitText}>
                    <h2 className={styles.sectionTitle}>Știi ce vrei să citești, dar nu și de unde?</h2>
                    <p>
                        Îți arătăm cele mai recente oferte din librăriile din România, iar în bazar găsești cărți la mâna a doua,
                        direct de la alți cititori. Vinde-le pe ale tale și dă-le o nouă viață.
                    </p>
                    <div className={styles.splitActions}>
                        <Button to={paths.catalog} rightIcon={<ArrowRight />}>Compară prețurile</Button>
                        <Button to={isAuthenticated ? paths.createListing : paths.login} variant="secondary">Vinde o carte</Button>
                    </div>
                </div>
            </section>

            {!isAuthenticated && (
                <section className={styles.cta}>
                    <h2 className={styles.ctaTitle}>Alătură-te comunității Aurora Codex</h2>
                    <p>Salvează-ți lecturile, primește recomandări personalizate și participă la discuții. E gratuit.</p>
                    <Button to={paths.login} size="lg" variant="neutral">Creează-ți contul</Button>
                </section>
            )}
        </div>
    );
}
