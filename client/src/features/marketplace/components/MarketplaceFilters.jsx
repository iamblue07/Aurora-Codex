import { RotateCcw } from 'lucide-react';
import useGenres from '@/shared/hooks/useGenres';
import { Button, Chip, PriceRange, Select } from '@/shared/ui';
import { CONDITIONS, toggleInList } from '../constants';
import { useListingCities } from '../hooks';
import styles from './MarketplaceFilters.module.css';

/**
 * Bazaar filters: genre, condition, price, city and delivery. Controlled by the URL-backed
 * `filters` ({ genre, condition, min, max, city, shipping }); `onChange(partial)` updates them.
 */
export default function MarketplaceFilters({ filters, onChange, onReset, activeCount }) {
    const { genres } = useGenres();
    const cities = useListingCities();
    const conditions = filters.condition ? filters.condition.split(',') : [];

    return (
        <div className={styles.filters}>
            <section className={styles.group}>
                <h3 className={styles.title}>Gen literar</h3>
                <Select aria-label="Gen literar" value={filters.genre} onChange={(event) => onChange({ genre: event.target.value })}>
                    <option value="">Toate genurile</option>
                    {genres.map((genre) => <option key={genre.code} value={genre.code}>{genre.label}</option>)}
                </Select>
            </section>

            <section className={styles.group}>
                <h3 className={styles.title}>Starea cărții</h3>
                <div className={styles.chips}>
                    {CONDITIONS.map((condition) => (
                        <Chip
                            key={condition.value}
                            selected={conditions.includes(condition.value)}
                            onClick={() => onChange({ condition: toggleInList(filters.condition, condition.value) })}
                        >
                            {condition.label}
                        </Chip>
                    ))}
                </div>
            </section>

            <section className={styles.group}>
                <h3 className={styles.title}>Preț (lei)</h3>
                <PriceRange min={filters.min} max={filters.max} onChange={({ min, max }) => onChange({ min, max })} />
            </section>

            <section className={styles.group}>
                <h3 className={styles.title}>Localitate</h3>
                <Select aria-label="Localitate" value={filters.city} onChange={(event) => onChange({ city: event.target.value })}>
                    <option value="">Toate orașele</option>
                    {(cities.data ?? []).map(({ city, count }) => <option key={city} value={city}>{city} ({count})</option>)}
                </Select>
                <label className={styles.toggle}>
                    <input
                        type="checkbox"
                        checked={filters.shipping === '1'}
                        onChange={(event) => onChange({ shipping: event.target.checked ? '1' : '' })}
                    />
                    <span>Doar cu livrare prin curier</span>
                </label>
            </section>

            {activeCount > 0 && (
                <Button variant="ghost" size="sm" leftIcon={<RotateCcw />} onClick={onReset} className={styles.reset}>
                    Resetează filtrele ({activeCount})
                </Button>
            )}
        </div>
    );
}
