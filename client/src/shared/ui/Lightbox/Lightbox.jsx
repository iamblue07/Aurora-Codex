import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Spinner from '../Spinner/Spinner';
import styles from './Lightbox.module.css';

/**
 * Full-screen photo viewer on a dark backdrop. The whole image is shown (never cropped),
 * scaled to fit the screen. Escape, the close button or a click anywhere closes it.
 * With `onPrev` / `onNext` it gets arrow buttons (and arrow keys) to browse a set of photos.
 */
export default function Lightbox({ open, onClose, src, alt, caption, onPrev, onNext }) {
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
            onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' && onPrev) onPrev();
                if (event.key === 'ArrowRight' && onNext) onNext();
            }}
            onClick={onClose}
            aria-label={alt}
        >
            {open && (
                <>
                    <button type="button" className={styles.close} onClick={onClose} aria-label="Închide imaginea">
                        <X />
                    </button>
                    {onPrev && (
                        <button
                            type="button"
                            className={`${styles.close} ${styles.prev}`}
                            onClick={(event) => { event.stopPropagation(); onPrev(); }}
                            aria-label="Imaginea anterioară"
                        >
                            <ChevronLeft />
                        </button>
                    )}
                    {onNext && (
                        <button
                            type="button"
                            className={`${styles.close} ${styles.next}`}
                            onClick={(event) => { event.stopPropagation(); onNext(); }}
                            aria-label="Imaginea următoare"
                        >
                            <ChevronRight />
                        </button>
                    )}
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
