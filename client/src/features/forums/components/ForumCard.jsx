import { MessageSquareText } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import ReportButton from '@/features/reports/components/ReportButton';
import { formatRelativeTime } from '@/shared/lib/format';
import { Avatar, Badge } from '@/shared/ui';
import styles from './ForumCard.module.css';

export default function ForumCard({ forum }) {
    return (
        <article className={styles.card}>
            <span className={styles.icon} aria-hidden="true"><MessageSquareText /></span>
            <div className={styles.body}>
                <Link to={paths.forum(forum.id)} className={styles.title}>{forum.title}</Link>
                <div className={styles.meta}>
                    {forum.author ? (
                        <Link to={paths.user(forum.author.id)} className={styles.author}>
                            <Avatar src={forum.author.avatarUrl} name={forum.author.username} size="xs" />
                            {forum.author.username}
                        </Link>
                    ) : <span className={styles.author}>Utilizator șters</span>}
                    <span aria-hidden="true">·</span>
                    <time dateTime={forum.createdAt}>{formatRelativeTime(forum.createdAt)}</time>
                </div>
            </div>
            <div className={styles.side}>
                <Badge tone={forum.isOpen ? 'success' : 'neutral'} dot>{forum.isOpen ? 'Deschis' : 'Închis'}</Badge>
                <ReportButton targetType="forum" targetId={forum.id} />
            </div>
        </article>
    );
}
