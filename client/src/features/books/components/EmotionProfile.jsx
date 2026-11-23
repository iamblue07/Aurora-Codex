import { EMOTIONS } from '@/features/recommendations/api';
import styles from './EmotionProfile.module.css';

/**
 * Horizontal bars showing the emotional tone the AI detected in the book's description.
 * Renders nothing when the book hasn't been analysed yet.
 */
export default function EmotionProfile({ emotions }) {
    const rows = EMOTIONS
        .map((emotion) => ({ ...emotion, score: emotions?.[emotion.value] }))
        .filter((row) => typeof row.score === 'number')
        .sort((a, b) => b.score - a.score);
    if (rows.length === 0) return null;

    const max = Math.max(...rows.map((row) => row.score), 0.0001);

    return (
        <ul className={styles.list} role="list">
            {rows.map((row) => (
                <li key={row.value} className={styles.row}>
                    <span className={styles.label}><span aria-hidden="true">{row.emoji}</span> {row.label}</span>
                    <span className={styles.track} aria-hidden="true">
                        <span className={styles.bar} style={{ '--value': row.score / max }} />
                    </span>
                    <span className={styles.value}>{Math.round(row.score * 100)}%</span>
                </li>
            ))}
        </ul>
    );
}
