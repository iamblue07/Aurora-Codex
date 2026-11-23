import clsx from 'clsx';
import styles from './StatTile.module.css';

/** A headline number with its label: when the story is one number, the number is the chart. */
export default function StatTile({ label, value, hint, accent = false, className }) {
    return (
        <div className={clsx(styles.tile, accent && styles.accent, className)}>
            <span className={styles.label}>{label}</span>
            <span className={styles.value}>{value}</span>
            {hint && <span className={styles.hint}>{hint}</span>}
        </div>
    );
}
