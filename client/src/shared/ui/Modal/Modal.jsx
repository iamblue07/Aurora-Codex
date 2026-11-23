import clsx from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import IconButton from '../IconButton/IconButton';
import styles from './Modal.module.css';

/**
 * Accessible modal built on the native <dialog> element: focus trapping, Escape to close and
 * the top layer come for free. Clicking the backdrop closes it as well.
 */
export default function Modal({ open, onClose, title, description, footer, size = 'md', className, children }) {
    const dialogRef = useRef(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    const handleClick = (event) => {
        // A click on the <dialog> itself (not its content) is a click on the backdrop.
        if (event.target === dialogRef.current) onClose();
    };

    return (
        <dialog
            ref={dialogRef}
            className={clsx(styles.dialog, styles[size], className)}
            onCancel={(event) => { event.preventDefault(); onClose(); }}
            onClick={handleClick}
            aria-labelledby={title ? titleId : undefined}
        >
            {open && (
                <div className={styles.panel}>
                    <header className={styles.header}>
                        <div>
                            {title && <h2 id={titleId} className={styles.title}>{title}</h2>}
                            {description && <p className={styles.description}>{description}</p>}
                        </div>
                        <IconButton label="Închide" size="sm" onClick={onClose}><X /></IconButton>
                    </header>
                    <div className={styles.body}>{children}</div>
                    {footer && <footer className={styles.footer}>{footer}</footer>}
                </div>
            )}
        </dialog>
    );
}
