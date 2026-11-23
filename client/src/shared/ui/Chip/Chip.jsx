import clsx from 'clsx';
import { Check } from 'lucide-react';
import styles from './Chip.module.css';

/** Toggleable pill used for multi-select filters (genres, emotions…). */
export default function Chip({ selected = false, onClick, disabled, className, children }) {
    return (
        <button
            type="button"
            className={clsx(styles.chip, selected && styles.selected, className)}
            aria-pressed={selected}
            onClick={onClick}
            disabled={disabled}
        >
            {selected && <Check className={styles.check} aria-hidden="true" />}
            {children}
        </button>
    );
}
