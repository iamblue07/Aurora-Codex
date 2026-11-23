import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import useGenres from '@/shared/hooks/useGenres';
import { Button, Card, Chip, Skeleton } from '@/shared/ui';
import { useFavoriteGenres, useSaveFavoriteGenres } from '../hooks';
import styles from './ProfileCards.module.css';

const MAX_FAVORITES = 5;

/** Pick up to five favourite genres; they steer the AI recommendations. */
export default function FavoriteGenresCard() {
    const { genres, isPending: genresPending } = useGenres();
    const favorites = useFavoriteGenres();
    const save = useSaveFavoriteGenres();
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        if (favorites.data) setSelected(favorites.data);
    }, [favorites.data]);

    const toggle = (code) => setSelected((current) => (
        current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
    ));
    const isFull = selected.length >= MAX_FAVORITES;
    const isDirty = JSON.stringify(selected) !== JSON.stringify(favorites.data ?? []);

    return (
        <Card as="section" className={styles.card}>
            <header className={styles.cardHeader}>
                <span className={styles.cardIcon} aria-hidden="true"><Heart /></span>
                <div>
                    <h2 className={styles.cardTitle}>Genurile tale preferate</h2>
                    <p className={styles.cardHint}>Alege până la {MAX_FAVORITES}. Le folosim pentru recomandările personalizate.</p>
                </div>
                <span className={styles.counter}>{selected.length}/{MAX_FAVORITES}</span>
            </header>
            <div className={styles.chips}>
                {genresPending || favorites.isPending
                    ? Array.from({ length: 10 }, (_, index) => <Skeleton key={index} width="7rem" height="2rem" radius="var(--radius-full)" />)
                    : genres.map((genre) => {
                        const isSelected = selected.includes(genre.code);
                        return (
                            <Chip key={genre.code} selected={isSelected} disabled={!isSelected && isFull} onClick={() => toggle(genre.code)}>
                                {genre.label}
                            </Chip>
                        );
                    })}
            </div>
            <div className={styles.cardFooter}>
                <Button onClick={() => save.mutate(selected)} loading={save.isPending} disabled={!isDirty}>Salvează preferințele</Button>
            </div>
        </Card>
    );
}
