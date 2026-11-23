import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router';
import useClickOutside from '@/shared/hooks/useClickOutside';
import styles from './Menu.module.css';

/**
 * Simple dropdown menu. `trigger` is a render prop receiving `{ open, toggle }`;
 * `items`: [{ label, icon?, to? , onClick?, tone? }] or the string 'divider'.
 */
export default function Menu({ trigger, items, align = 'end', className }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const close = useCallback(() => setOpen(false), []);
    useClickOutside(ref, close, open);

    return (
        <div ref={ref} className={clsx(styles.menu, className)}>
            {trigger({ open, toggle: () => setOpen((value) => !value) })}
            {open && (
                <div className={clsx(styles.panel, styles[align])} role="menu">
                    {items.map((item, index) => {
                        if (item === 'divider') return <hr key={`divider-${index}`} className={styles.divider} />;
                        const content = (
                            <>
                                {item.icon}
                                <span>{item.label}</span>
                            </>
                        );
                        const itemClass = clsx(styles.item, item.tone === 'danger' && styles.danger);
                        return item.to ? (
                            <Link key={item.label} to={item.to} role="menuitem" className={itemClass} onClick={close}>
                                {content}
                            </Link>
                        ) : (
                            <button
                                key={item.label}
                                type="button"
                                role="menuitem"
                                className={itemClass}
                                onClick={() => { close(); item.onClick?.(); }}
                            >
                                {content}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
