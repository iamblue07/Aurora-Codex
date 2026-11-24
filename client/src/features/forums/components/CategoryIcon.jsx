import clsx from 'clsx';
import { BookOpen, Library, Megaphone, MessagesSquare, Sparkles, Store, Users } from 'lucide-react';
import styles from './CategoryIcon.module.css';

/** The server names a Lucide icon per category; unknown names fall back to a speech bubble. */
const ICONS = {
    'messages-square': MessagesSquare,
    sparkles: Sparkles,
    users: Users,
    'book-open': BookOpen,
    library: Library,
    store: Store,
    megaphone: Megaphone,
};

/** Each category gets its own tint, derived from its name. */
const HUES = [356, 24, 152, 198, 228, 268, 312, 40];
const hueFor = (text = '') => HUES[[...text].reduce((sum, char) => sum + char.charCodeAt(0), 0) % HUES.length];

export default function CategoryIcon({ category, size = 'md', className }) {
    const Icon = ICONS[category?.icon] ?? MessagesSquare;
    return (
        <span className={clsx(styles.tile, styles[size], className)} style={{ '--tile-hue': hueFor(category?.slug) }} aria-hidden="true">
            <Icon />
        </span>
    );
}
