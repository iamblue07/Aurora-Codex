import clsx from 'clsx';
import useCountUp from '@/shared/hooks/useCountUp';
import styles from './StatTile.module.css';

const defaultFormat = (value) => value.toLocaleString('ro-RO');

/**
 * A headline number with its label: when the story is one number, the number is the chart.
 * Numeric values count up gently when they appear (formatted with `format`); text is shown as is.
 */
export default function StatTile({ label, value, hint, accent = false, format = defaultFormat, decimals = 0, icon, className }) {
    const isNumber = typeof value === 'number' && Number.isFinite(value);
    const animated = useCountUp(isNumber ? value : 0, { decimals });
    return (
        <div className={clsx(styles.tile, accent && styles.accent, className)}>
            <span className={styles.label}>{icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}{label}</span>
            <span className={styles.value}>{isNumber ? format(animated) : value}</span>
            {hint && <span className={styles.hint}>{hint}</span>}
        </div>
    );
}
