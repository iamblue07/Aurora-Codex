import { Info, Settings2, Sparkles, UserRound, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import useFeatures from '@/shared/hooks/useFeatures';
import { Button, Card, Chip, EmptyState, ErrorState, Input, Skeleton } from '@/shared/ui';
import BookGrid from '@/features/books/components/BookGrid';
import { EMOTIONS } from '../api';
import { useGenerateRecommendations, useRecommendations } from '../hooks';
import styles from './RecommendationsPanel.module.css';

/**
 * AI recommendations: generate from the user's profile (favourite genres + ratings) or from
 * keywords and an emotional tone, then show the recommended books.
 */
export default function RecommendationsPanel() {
    const [keywords, setKeywords] = useState('');
    /** null = any tone: rank by meaning only. */
    const [sentiment, setSentiment] = useState(null);
    const { isAdmin } = useAuth();
    const { features, isPending: featuresPending } = useFeatures();
    const recommendations = useRecommendations(features.recommendations);
    const generate = useGenerateRecommendations();

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

    return (
        <div className={styles.panel}>
            <Card className={styles.controls} padding="lg">
                <div className={styles.intro}>
                    <span className={styles.introIcon} aria-hidden="true"><Sparkles /></span>
                    <div>
                        <h2 className={styles.title}>Recomandări inteligente</h2>
                        <p className={styles.text}>
                            Căutăm cărțile cele mai apropiate ca sens de ce îți place sau de ce descrii, apoi le ordonăm
                            după tonul emoțional ales. Generarea durează câteva secunde.
                        </p>
                    </div>
                </div>

                <div className={styles.modes}>
                    <div className={styles.mode}>
                        <h3 className={styles.modeTitle}><UserRound /> După profilul tău</h3>
                        <p className={styles.modeText}>Folosim cărțile notate cu 4 sau 5 stele și genurile preferate.</p>
                        <Button
                            variant="neutral"
                            loading={isGenerating && !generate.variables?.query}
                            disabled={isGenerating}
                            onClick={() => generate.mutate({})}
                        >
                            Generează după profil
                        </Button>
                    </div>

                    <form
                        className={styles.mode}
                        onSubmit={(event) => { event.preventDefault(); generate.mutate({ query: keywords.trim(), sentiment: sentiment ?? undefined }); }}
                    >
                        <h3 className={styles.modeTitle}><Wand2 /> După ce cauți acum</h3>
                        <Input
                            aria-label="Cuvinte-cheie"
                            placeholder="ex: o poveste de dragoste în Parisul anilor '20"
                            value={keywords}
                            onChange={(event) => setKeywords(event.target.value)}
                        />
                        <div className={styles.emotions} role="group" aria-label="Tonul emoțional (opțional)">
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
                        <Button
                            type="submit"
                            loading={isGenerating && Boolean(generate.variables?.query)}
                            disabled={isGenerating || keywords.trim().length < 3}
                        >
                            Generează după cuvinte-cheie
                        </Button>
                    </form>
                </div>
            </Card>

            <section aria-live="polite">
                <h2 className={styles.resultsTitle}>Recomandate pentru tine</h2>
                {recommendations.isError ? (
                    <ErrorState onRetry={recommendations.refetch} compact />
                ) : recommendations.data?.length === 0 && !isGenerating ? (
                    <EmptyState
                        icon={<Sparkles />}
                        title="Încă nu ai recomandări"
                        description="Generează primele recomandări folosind una dintre opțiunile de mai sus."
                        compact
                    />
                ) : (
                    <BookGrid books={recommendations.data ?? []} loading={recommendations.isPending || isGenerating} skeletonCount={8} />
                )}
            </section>
        </div>
    );
}
