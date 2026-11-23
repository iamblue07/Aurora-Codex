import clsx from 'clsx';
import { useState } from 'react';
import styles from './FadeImage.module.css';

/**
 * <img> that stays transparent until it has loaded and then fades in, so the shimmering
 * placeholder behind it is shown instead of a half-painted picture.
 * Lazy-loaded by default.
 */
export default function FadeImage({ src, alt, className, onError, loading = 'lazy', ...rest }) {
    const [loadedSrc, setLoadedSrc] = useState(null);
    return (
        <img
            src={src}
            alt={alt}
            loading={loading}
            decoding="async"
            className={clsx(styles.image, loadedSrc === src && styles.loaded, className)}
            onLoad={() => setLoadedSrc(src)}
            onError={onError}
            {...rest}
        />
    );
}
