import { BookHeart, Info, RotateCcw, Settings2, Sparkles, Star, UserRound, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import { BookCardSkeleton } from '@/features/books/components/BookCard';
import useFeatures from '@/shared/hooks/useFeatures';
import { formatRelativeTime, plural } from '@/shared/lib/format';
import { Button, Card, Chip, EmptyState, ErrorState, SegmentedControl, Skeleton, Textarea } from '@/shared/ui';
import { EMOTIONS, QUERY_IDEAS } from '../api';
import { useClearDismissals, useDismissRecommendation, useGenerateRecommendations, useRecommendations } from '../hooks';
import RecommendationCard from './RecommendationCard';
import styles from './RecommendationsPanel.module.css';

const MODES = [
    { value: 'profile', label: 'După gusturile mele', icon: <UserRound /> },
    { value: 'query', label: 'Descriu ce caut', icon: <Wand2 /> },
];

const emotionLabel = (value) => EMOTIONS.find((emotion) => emotion.value === value)?.label.toLowerCase();

/** One line saying how the current list was made. */
function RunSummary({ run }) {
    if (!run) return null;
    const when = formatRelativeTime(run.createdAt);
    let how;
    if (run.source === 'query') {
        how = <>pentru „{run.query}”{run.sentiment && <>, ton {emotionLabel(run.sentiment)}</>}{run.personalized && ', adaptate gusturilor tale'}</>;
    } else if (run.basedOn === 'ratings') {
        how = <>după gusturile tale, pe baza a {plural(run.seedCount, 'carte apreciată', 'cărți apreciate')}</>;
    } else {
        how = 'după genurile tale preferate (notează cărți pentru recomandări mai bune)';
    }
    return <p className={styles.runSummary}>Generate {when} {how}.</p>;
}

/**
 * AI recommendations: from the reader's taste (ratings, favourite genres) or from a description
 * and an emotional tone. Each result says why it was picked; "not interested" hides a book and
 * steers future lists away from similar ones.
 */
export default function RecommendationsPanel() {
    const [mode, setMode] = useState('profile');
    const [keywords, setKeywords] = useState('');
    /** null = any tone: rank by meaning only. */
    const [sentiment, setSentiment] = useState(null);
    const [personalized, setPersonalized] = useState(true);
    const { isAdmin } = useAuth();
    const { features, isPending: featuresPending } = useFeatures();
    const recommendations = useRecommendations(features.recommendations);
    const generate = useGenerateRecommendations();
    const dismiss = useDismissRecommendation();
    const clearDismissals = useClearDismissals();

    if (featuresPending) return <Skeleton height="16rem" radius="var(--radius-lg)" />;
    if (!features.recommendations) {
        return (
            <EmptyState
                icon={<Info />}
                title="Recomandările AI nu sunt încă disponibile"
                description={isAdmin
                    ? 'Adaugă cheia DeepInfra pe server și generează vectorii semantici ai cărților din panoul de administrare.'
                    : 'Recomandările vor apărea aici imediat ce un administrator pregătește catalogul pentru ele.'}
                action={isAdmin && <Button to={paths.admin} leftIcon={<Settings2 />}>Deschide panoul de administrare</Button>}
            />
        );
    }

    const isGenerating = generate.isPending;
    const data = recommendations.data;
    const items = data?.items ?? [];
    const submitQuery = (event) => {
        event.preventDefault();
        generate.mutate({ query: keywords.trim(), sentiment: sentiment ?? undefined, personalized });
    };

    return (
        <div className={styles.panel}>
            <Card className={styles.controls} padding="lg">
                <div className={styles.intro}>
                    <span className={styles.introIcon} aria-hidden="true"><Sparkles /></span>
                    <div>
                        <h2 className={styles.title}>Recomandări inteligente</h2>
                        <p className={styles.text}>
                            Inteligența artificială compară sensul descrierilor a mii de cărți cu ce îți place sau cu ce descrii,
                            apoi ține cont de tonul emoțional, de ce nu ți-a plăcut și de varietate.
                        </p>
                    </div>
                </div>

                <SegmentedControl options={MODES} value={mode} onChange={setMode} label="Cum vrei recomandările" className={styles.modeSwitch} />

                {mode === 'profile' ? (
                    <div className={styles.mode}>
                        <ul className={styles.howList}>
                            <li><Star aria-hidden="true" /> Pornim de la cărțile notate cu 4 sau 5 stele, fiecare separat, ca să nu se piardă niciun gen care îți place.</li>
                            <li><BookHeart aria-hidden="true" /> Evităm ce seamănă cu cărțile notate slab sau ascunse de tine.</li>
                            <li><Sparkles aria-hidden="true" /> Fără note? Folosim genurile preferate din profil.</li>
                        </ul>
                        <Button loading={isGenerating} onClick={() => generate.mutate({})} leftIcon={<UserRound />}>
                            Generează după gusturile mele
                        </Button>
                    </div>
                ) : (
                    <form className={styles.mode} onSubmit={submitQuery}>
                        <Textarea
                            label="Ce ai chef să citești?"
                            placeholder="ex: o poveste de dragoste în Parisul anilor '20, cu personaje complicate"
                            value={keywords}
                            rows={2}
                            maxLength={500}
                            onChange={(event) => setKeywords(event.target.value)}
                        />
                        <div className={styles.ideas} aria-label="Idei">
                            {QUERY_IDEAS.map((idea) => (
                                <button key={idea} type="button" className={styles.idea} onClick={() => setKeywords(idea)}>{idea}</button>
                            ))}
                        </div>
                        <div>
                            <p className={styles.groupLabel}>Tonul emoțional (opțional)</p>
                            <div className={styles.emotions} role="group" aria-label="Tonul emoțional">
                                {EMOTIONS.map((emotion) => (
                                    <Chip
                                        key={emotion.value}
                                        selected={sentiment === emotion.value}
                                        onClick={() => setSentiment((current) => (current === emotion.value ? null : emotion.value))}
                                    >
                                        <span aria-hidden="true">{emotion.emoji}</span> {emotion.label}
                                    </Chip>
                                ))}
                            </div>
                        </div>
                        <label className={styles.toggle}>
                            <input type="checkbox" checked={personalized} onChange={(event) => setPersonalized(event.target.checked)} />
                            <span>Ține cont și de gusturile mele</span>
                        </label>
                        <Button type="submit" loading={isGenerating} disabled={keywords.trim().length < 3} leftIcon={<Wand2 />}>
                            Caută recomandări
                        </Button>
                    </form>
                )}
            </Card>

            <section aria-live="polite" aria-busy={isGenerating || undefined}>
                <div className={styles.resultsHead}>
                    <h2 className={styles.resultsTitle}>Recomandate pentru tine</h2>
                    {data?.dismissedCount > 0 && (
                        <Button variant="ghost" size="sm" leftIcon={<RotateCcw />} loading={clearDismissals.isPending} onClick={() => clearDismissals.mutate()}>
                            {data.dismissedCount === 1 ? 'Readu cartea ascunsă' : `Readu cele ${data.dismissedCount} cărți ascunse`}
                        </Button>
                    )}
                </div>
                {!isGenerating && <RunSummary run={data?.run} />}

                {recommendations.isError ? (
                    <ErrorState onRetry={recommendations.refetch} compact />
                ) : items.length === 0 && !isGenerating && !recommendations.isPending ? (
                    <EmptyState
                        icon={<Sparkles />}
                        title={data?.run ? 'Ai trecut prin toate recomandările' : 'Încă nu ai recomandări'}
                        description={data?.run ? 'Generează o listă nouă: ține cont și de ce ai ascuns.' : 'Generează primele recomandări folosind una dintre opțiunile de mai sus.'}
                        compact
                    />
                ) : (
                    <div className={styles.grid}>
                        {recommendations.isPending || isGenerating
                            ? Array.from({ length: 8 }, (_, index) => <BookCardSkeleton key={index} />)
                            : items.map((item) => (
                                <RecommendationCard
                                    key={item.book.id}
                                    item={item}
                                    onDismiss={(bookId) => dismiss.mutate(bookId)}
                                    dismissing={dismiss.isPending && dismiss.variables === item.book.id}
                                />
                            ))}
                    </div>
                )}
                {items.length > 0 && !isGenerating && (
                    <p className={styles.hint}>
                        Nu-ți place o sugestie? Apasă pe <strong>ochiul tăiat</strong> și o ascundem, împreună cu cărțile prea asemănătoare.
                        Cu cât notezi mai multe cărți, cu atât recomandările devin mai bune.
                    </p>
                )}
            </section>
        </div>
    );
}
