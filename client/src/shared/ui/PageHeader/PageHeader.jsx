import clsx from 'clsx';
import styles from './PageHeader.module.css';

/** Consistent page title block: optional eyebrow, title, subtitle and actions on the right. */
export default function PageHeader({ eyebrow, title, subtitle, actions, className }) {
    return (
        <header className={clsx(styles.header, className)}>
            <div className={styles.text}>
                {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
                <h1 className={styles.title}>{title}</h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {actions && <div className={styles.actions}>{actions}</div>}
        </header>
    );
}
