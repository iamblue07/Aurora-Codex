import clsx from 'clsx';
import styles from './Badge.module.css';

/** Small status label. `tone`: neutral | primary | success | danger | warning. */
export default function Badge({ tone = 'neutral', dot = false, className, children, ...rest }) {
    return (
        <span className={clsx(styles.badge, styles[tone], className)} {...rest}>
            {dot && <span className={styles.dot} aria-hidden="true" />}
            {children}
        </span>
    );
}
