import clsx from 'clsx';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { apiUrl } from '@/shared/api/http-client';
import { FadeImage } from '@/shared/ui';
import styles from './ListingImage.module.css';

/**
 * Listing photo with a neutral placeholder when there is none or it fails to load.
 * With `onClick` it becomes a button (used to open the full-size photo).
 */
export default function ListingImage({ src, alt, className, onClick }) {
    const [failedSrc, setFailedSrc] = useState(null);
    const showImage = src && failedSrc !== src;
    const content = showImage
        ? <FadeImage src={apiUrl(src)} alt={alt} onError={() => setFailedSrc(src)} />
        : <span className={styles.placeholder} role="img" aria-label="Fără imagine"><ImageOff /></span>;

    if (onClick && showImage) {
        return (
            <button type="button" className={clsx(styles.frame, styles.clickable, className)} onClick={onClick} aria-label="Vezi imaginea la dimensiune completă">
                {content}
            </button>
        );
    }
    return <div className={clsx(styles.frame, className)}>{content}</div>;
}
