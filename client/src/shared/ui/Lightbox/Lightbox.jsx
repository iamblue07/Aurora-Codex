import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Spinner from '../Spinner/Spinner';
import styles from './Lightbox.module.css';

/**
 * Full-screen photo viewer on a dark backdrop. The whole image is shown (never cropped),
 * scaled to fit the screen. Escape, the close button or a click anywhere closes it.
 */
export default function Lightbox({ open, onClose, src, alt, caption }) {
    const dialogRef = useRef(null);
    const [loadedSrc, setLoadedSrc] = useState(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            className={styles.lightbox}
            onCancel={(event) => { event.preventDefault(); onClose(); }}
            onClick={onClose}
            aria-label={alt}
        >
            {open && (
                <>
                    <button type="button" className={styles.close} onClick={onClose} aria-label="Închide imaginea">
                        <X />
                    </button>
                    <figure className={styles.figure}>
                        {loadedSrc !== src && <Spinner className={styles.spinner} />}
                        <img
                            src={src}
                            alt={alt}
                            className={styles.image}
                            data-loaded={loadedSrc === src}
                            onLoad={() => setLoadedSrc(src)}
                        />
                        {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
                    </figure>
                </>
            )}
        </dialog>
    );
}
