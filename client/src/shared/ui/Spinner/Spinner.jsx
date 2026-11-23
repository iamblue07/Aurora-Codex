import clsx from 'clsx';
import styles from './Spinner.module.css';

export default function Spinner({ size = 'md', label, className }) {
    return (
        <span className={clsx(styles.wrapper, className)} role={label ? 'status' : undefined}>
            <span className={clsx(styles.spinner, styles[size])} aria-hidden="true" />
            {label && <span className={styles.label}>{label}</span>}
        </span>
    );
}
