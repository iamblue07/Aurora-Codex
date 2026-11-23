import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import useGenres from '@/shared/hooks/useGenres';
import { Button, Chip, PriceRange, Select, Skeleton } from '@/shared/ui';
import styles from './CatalogFilters.module.css';

const BOOK_SORT_OPTIONS = [
    { value: '', label: 'Relevanță' },
    { value: 'price_asc', label: 'Preț crescător' },
    { value: 'price_desc', label: 'Preț descrescător' },
    { value: 'title_asc', label: 'Titlu A–Z' },
    { value: 'title_desc', label: 'Titlu Z–A' },
];

const COLLAPSED_GENRES = 10;

/** Sidebar filters for the catalogue: genres (multi-select), price range and sorting. */
export default function CatalogFilters({ filters, onChange, onReset }) {
    const { genres, isPending } = useGenres();
    const [showAllGenres, setShowAllGenres] = useState(false);

    const toggleGenre = (code) => {
        const selected = filters.genres.includes(code)
            ? filters.genres.filter((genre) => genre !== code)
            : [...filters.genres, code];
        onChange({ genres: selected });
    };

    // Selected genres stay visible even when the list is collapsed.
    const visibleGenres = showAllGenres
        ? genres
        : genres.filter((genre, index) => index < COLLAPSED_GENRES || filters.genres.includes(genre.code));

    const hasActiveFilters = filters.genres.length > 0 || filters.min || filters.max || filters.sort;

    return (
        <div className={styles.filters}>
            <section className={styles.section}>
                <h2 className={styles.heading}>Sortare</h2>
                <Select value={filters.sort} onChange={(event) => onChange({ sort: event.target.value })} aria-label="Sortează după">
                    {BOOK_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>Preț</h2>
                <PriceRange min={filters.min} max={filters.max} onChange={({ min, max }) => onChange({ min, max })} />
            </section>

            <section className={styles.section}>
                <h2 className={styles.heading}>
                    Gen literar
                    {filters.genres.length > 0 && <span className={styles.count}>{filters.genres.length}</span>}
                </h2>
                <div className={styles.chips}>
                    {isPending
                        ? Array.from({ length: 8 }, (_, index) => <Skeleton key={index} width={`${50 + (index % 3) * 20}%`} height="2rem" radius="var(--radius-full)" />)
                        : visibleGenres.map((genre) => (
                            <Chip key={genre.code} selected={filters.genres.includes(genre.code)} onClick={() => toggleGenre(genre.code)}>
                                {genre.label}
                            </Chip>
                        ))}
                </div>
                {genres.length > COLLAPSED_GENRES && (
                    <button type="button" className={styles.more} onClick={() => setShowAllGenres((value) => !value)}>
                        {showAllGenres ? 'Arată mai puține' : `Arată toate cele ${genres.length} genuri`}
                    </button>
                )}
            </section>

            {hasActiveFilters && (
                <Button variant="ghost" size="sm" leftIcon={<RotateCcw />} onClick={onReset}>
                    Resetează filtrele
                </Button>
            )}
        </div>
    );
}
