import { useEffect, useState } from 'react';
import styles from './PriceRange.module.css';

const toNumberOrEmpty = (value) => {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    return cleaned;
};

/**
 * Min/max price inputs (RON). Values are committed on blur or Enter, not on every keystroke,
 * so typing "120" doesn't trigger three searches.
 */
export default function PriceRange({ min, max, onChange }) {
    const [draft, setDraft] = useState({ min: min ?? '', max: max ?? '' });

    useEffect(() => setDraft({ min: min ?? '', max: max ?? '' }), [min, max]);

    const commit = () => {
        const next = { min: draft.min === '' ? '' : String(Number(draft.min)), max: draft.max === '' ? '' : String(Number(draft.max)) };
        if (next.min !== '' && next.max !== '' && Number(next.min) > Number(next.max)) [next.min, next.max] = [next.max, next.min];
        if (next.min !== String(min ?? '') || next.max !== String(max ?? '')) onChange(next);
    };

    const field = (key, placeholder, label) => (
        <label className={styles.field}>
            <span className="visually-hidden">{label}</span>
            <input
                className={styles.input}
                inputMode="decimal"
                placeholder={placeholder}
                value={draft[key]}
                onChange={(event) => setDraft((current) => ({ ...current, [key]: toNumberOrEmpty(event.target.value) }))}
                onBlur={commit}
                onKeyDown={(event) => event.key === 'Enter' && commit()}
            />
            <span className={styles.suffix} aria-hidden="true">lei</span>
        </label>
    );

    return (
        <div className={styles.range}>
            {field('min', 'Min', 'Preț minim')}
            <span className={styles.dash} aria-hidden="true">–</span>
            {field('max', 'Max', 'Preț maxim')}
        </div>
    );
}
