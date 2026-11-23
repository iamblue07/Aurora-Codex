import clsx from 'clsx';
import styles from './Skeleton.module.css';

/** Shimmering placeholder shown while content loads (instead of a full-page spinner). */
export default function Skeleton({ width, height = '1rem', radius, circle = false, className, style }) {
    return (
        <span
            aria-hidden="true"
            className={clsx(styles.skeleton, circle && styles.circle, className)}
            style={{ width, height, borderRadius: radius, ...style }}
        />
    );
}

/** A few lines of placeholder text; the last one is shorter, like a real paragraph. */
export function SkeletonText({ lines = 3, className }) {
    return (
        <span className={clsx(styles.text, className)} aria-hidden="true">
            {Array.from({ length: lines }, (_, index) => (
                <Skeleton key={index} width={index === lines - 1 && lines > 1 ? '60%' : '100%'} height="0.85rem" />
            ))}
        </span>
    );
}
