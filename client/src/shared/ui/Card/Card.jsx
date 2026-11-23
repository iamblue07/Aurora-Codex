import clsx from 'clsx';
import styles from './Card.module.css';

/** Surface container. `interactive` adds hover elevation; `as` changes the rendered element. */
export default function Card({ as: Component = 'div', padding = 'md', interactive = false, className, children, ...rest }) {
    return (
        <Component className={clsx(styles.card, styles[`padding-${padding}`], interactive && styles.interactive, className)} {...rest}>
            {children}
        </Component>
    );
}
