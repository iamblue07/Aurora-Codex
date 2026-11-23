import clsx from 'clsx';
import { Star } from 'lucide-react';
import { useState } from 'react';
import styles from './StarRating.module.css';

const STARS = [1, 2, 3, 4, 5];

/**
 * 1–5 star rating. Interactive when `onChange` is given (keyboard accessible radio group),
 * read-only otherwise.
 */
export default function StarRating({ value = 0, onChange, disabled = false, size = 'md', label = 'Rating', className }) {
    const [hovered, setHovered] = useState(0);
    const shown = hovered || value;

    if (!onChange) {
        return (
            <span className={clsx(styles.rating, styles[size], className)} aria-label={`${value} din 5 stele`} role="img">
                {STARS.map((star) => (
                    <Star key={star} className={clsx(styles.star, star <= value && styles.filled)} aria-hidden="true" />
                ))}
            </span>
        );
    }

    return (
        <span
            className={clsx(styles.rating, styles.interactive, styles[size], className)}
            role="radiogroup"
            aria-label={label}
            onMouseLeave={() => setHovered(0)}
        >
            {STARS.map((star) => (
                <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={star === value}
                    aria-label={`${star} ${star === 1 ? 'stea' : 'stele'}`}
                    className={styles.starButton}
                    disabled={disabled}
                    onMouseEnter={() => setHovered(star)}
                    onFocus={() => setHovered(star)}
                    onBlur={() => setHovered(0)}
                    onClick={() => onChange(star)}
                >
                    <Star className={clsx(styles.star, star <= shown && styles.filled)} aria-hidden="true" />
                </button>
            ))}
        </span>
    );
}
