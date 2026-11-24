import clsx from 'clsx';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { apiUrl } from '@/shared/api/http-client';
import { FadeImage } from '@/shared/ui';
import styles from './BookCover.module.css';

const PALETTES = [
    ['#0a8f6f', '#14b8c4'],
    ['#3a3d36', '#6b6f64'],
    ['#7c3aed', '#c084fc'],
    ['#0f766e', '#2dd4bf'],
    ['#b45309', '#fbbf24'],
    ['#1d4ed8', '#60a5fa'],
];

const paletteFor = (seed = '') => PALETTES[[...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % PALETTES.length];

/**
 * Book cover image with a designed fallback: when the cover is missing or fails to load, a
 * coloured "cloth cover" with the title is shown instead of a generic stock picture.
 */
export default function BookCover({ src, title = '', author = '', size = 'md', className }) {
    const [failedSrc, setFailedSrc] = useState(null);
    const showImage = src && failedSrc !== src;
    const [from, to] = paletteFor(title);

    return (
        <div className={clsx(styles.cover, styles[size], className)}>
            {showImage ? (
                <FadeImage src={apiUrl(src)} alt={`Coperta cărții ${title}`} onError={() => setFailedSrc(src)} />
            ) : (
                <div className={styles.fallback} style={{ '--cover-from': from, '--cover-to': to }} role="img" aria-label={`Coperta cărții ${title}`}>
                    <BookOpen className={styles.fallbackIcon} aria-hidden="true" />
                    <span className={styles.fallbackTitle}>{title}</span>
                    {author && <span className={styles.fallbackAuthor}>{author}</span>}
                </div>
            )}
        </div>
    );
}
