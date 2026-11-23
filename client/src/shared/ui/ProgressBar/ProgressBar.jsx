import clsx from 'clsx';
import styles from './ProgressBar.module.css';

/**
 * Horizontal progress bar. Without a `max` (unknown total) it shows an indeterminate animation.
 * `tone`: primary | success | neutral.
 */
export default function ProgressBar({ value = 0, max, label, tone = 'primary', size = 'md', className }) {
    const determinate = typeof max === 'number' && max > 0;
    const percent = determinate ? Math.min(100, Math.max(0, (value / max) * 100)) : null;

    return (
        <div
            className={clsx(styles.track, styles[tone], styles[size], !determinate && styles.indeterminate, className)}
            role="progressbar"
            aria-label={label}
            aria-valuemin={determinate ? 0 : undefined}
            aria-valuemax={determinate ? max : undefined}
            aria-valuenow={determinate ? value : undefined}
        >
            <span className={styles.fill} style={determinate ? { width: `${percent}%` } : undefined} />
        </div>
    );
}
