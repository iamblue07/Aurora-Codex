import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router';
import styles from './Breadcrumbs.module.css';

/** `items`: [{ label, to? }]; the last item is the current page. */
export default function Breadcrumbs({ items }) {
    return (
        <nav aria-label="Navigare" className={styles.breadcrumbs}>
            <ol>
                {items.map((item, index) => (
                    <Fragment key={`${item.label}-${index}`}>
                        {index > 0 && <li aria-hidden="true" className={styles.separator}><ChevronRight /></li>}
                        <li className={styles.item}>
                            {item.to && index < items.length - 1
                                ? <Link to={item.to}>{item.label}</Link>
                                : <span aria-current="page">{item.label}</span>}
                        </li>
                    </Fragment>
                ))}
            </ol>
        </nav>
    );
}
