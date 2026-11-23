import clsx from 'clsx';
import { useState } from 'react';
import { apiUrl } from '@/shared/api/http-client';
import { initials } from '@/shared/lib/format';
import styles from './Avatar.module.css';

const HUES = [356, 18, 32, 152, 198, 228, 268, 312];

/** Stable pleasant hue for a name, so a user's initials avatar always has the same colour. */
const hueFor = (name = '') => HUES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % HUES.length];

/** User avatar: the uploaded picture when available, otherwise coloured initials. */
export default function Avatar({ src, name = '', size = 'md', className }) {
    const [failedSrc, setFailedSrc] = useState(null);
    const showImage = src && failedSrc !== src;

    return (
        <span
            className={clsx(styles.avatar, styles[size], className)}
            style={{ '--avatar-hue': hueFor(name) }}
            aria-hidden={!name || undefined}
            title={name || undefined}
        >
            {showImage ? (
                <img src={apiUrl(src)} alt="" loading="lazy" onError={() => setFailedSrc(src)} />
            ) : (
                <span className={styles.initials}>{initials(name)}</span>
            )}
        </span>
    );
}
