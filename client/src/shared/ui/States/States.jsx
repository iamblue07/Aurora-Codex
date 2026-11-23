import clsx from 'clsx';
import { CircleAlert, Inbox } from 'lucide-react';
import Button from '../Button/Button';
import Spinner from '../Spinner/Spinner';
import styles from './States.module.css';

/** Friendly placeholder for "nothing here yet" situations. */
export function EmptyState({ icon = <Inbox />, title, description, action, compact = false, className }) {
    return (
        <div className={clsx(styles.state, compact && styles.compact, className)}>
            <span className={styles.icon} aria-hidden="true">{icon}</span>
            {title && <h3 className={styles.title}>{title}</h3>}
            {description && <p className={styles.description}>{description}</p>}
            {action && <div className={styles.action}>{action}</div>}
        </div>
    );
}

/** Error placeholder with an optional retry button. */
export function ErrorState({
    title = 'Ceva nu a funcționat',
    description = 'Nu am putut încărca datele. Încearcă din nou.',
    onRetry,
    compact = false,
    className,
}) {
    return (
        <div className={clsx(styles.state, styles.error, compact && styles.compact, className)} role="alert">
            <span className={styles.icon} aria-hidden="true"><CircleAlert /></span>
            <h3 className={styles.title}>{title}</h3>
            {description && <p className={styles.description}>{description}</p>}
            {onRetry && (
                <div className={styles.action}>
                    <Button variant="secondary" size="sm" onClick={onRetry}>Reîncearcă</Button>
                </div>
            )}
        </div>
    );
}

/** Centered spinner for sections that cannot sensibly show a skeleton. */
export function LoadingState({ label = 'Se încarcă…', className }) {
    return (
        <div className={clsx(styles.loading, className)}>
            <Spinner size="lg" label={label} />
        </div>
    );
}
