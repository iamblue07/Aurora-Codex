import clsx from 'clsx';
import { BookOpen, Flame, Lock, MessageCircle, Pin } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { formatCount, formatDateTime, formatRelativeTime } from '@/shared/lib/format';
import { Avatar, Skeleton } from '@/shared/ui';
import { pageOfPosition } from '../constants';
import CategoryIcon from './CategoryIcon';
import styles from './ThreadList.module.css';

const HOT_REPLIES = 6;
const DAY = 24 * 60 * 60 * 1000;

/** Link to the thread page that holds its last post. */
const lastPageLink = (thread) => {
    const page = pageOfPosition(thread.postCount);
    return page > 1 ? `${paths.forum(thread.id)}?page=${page}` : paths.forum(thread.id);
};

function StatusIcon({ thread }) {
    if (thread.isPinned) return <span className={clsx(styles.status, styles.pinned)} title="Discuție fixată"><Pin /></span>;
    if (!thread.isOpen) return <span className={clsx(styles.status, styles.locked)} title="Discuție închisă"><Lock /></span>;
    const recent = thread.lastPost && Date.now() - new Date(thread.lastPost.at).getTime() < 2 * DAY;
    if (recent && thread.replyCount >= HOT_REPLIES) {
        return <span className={clsx(styles.status, styles.hot)} title="Discuție activă"><Flame /></span>;
    }
    return <span className={styles.status}><MessageCircle /></span>;
}

function ThreadRow({ thread, showCategory }) {
    return (
        <li className={clsx(styles.row, thread.isPinned && styles.rowPinned)}>
            <StatusIcon thread={thread} />
            <div className={styles.main}>
                <Link to={paths.forum(thread.id)} className={styles.title}>{thread.title}</Link>
                <div className={styles.meta}>
                    <span>
                        de {thread.author
                            ? <Link to={paths.user(thread.author.id)} className={styles.metaLink}>{thread.author.username}</Link>
                            : 'un utilizator șters'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={thread.createdAt} title={formatDateTime(thread.createdAt)}>{formatRelativeTime(thread.createdAt)}</time>
                    {showCategory && thread.category && (
                        <Link to={paths.forumCategory(thread.category.slug)} className={styles.category}>
                            <CategoryIcon category={thread.category} size="sm" className={styles.categoryIcon} />
                            {thread.category.name}
                        </Link>
                    )}
                    {thread.book && (
                        <Link to={paths.book(thread.book.id)} className={styles.book} title={`Despre „${thread.book.title}”`}>
                            <BookOpen aria-hidden="true" /> {thread.book.title}
                        </Link>
                    )}
                </div>
                <div className={styles.mobileStats}>
                    {formatCount(thread.replyCount)} răspunsuri · {formatCount(thread.viewCount)} vizualizări
                </div>
            </div>
            <dl className={styles.stats}>
                <div><dt>Răspunsuri</dt><dd>{formatCount(thread.replyCount)}</dd></div>
                <div><dt>Vizualizări</dt><dd>{formatCount(thread.viewCount)}</dd></div>
            </dl>
            <div className={styles.last}>
                {thread.lastPost ? (
                    <>
                        <Avatar src={thread.lastPost.author?.avatarUrl} name={thread.lastPost.author?.username ?? '?'} size="sm" />
                        <div className={styles.lastText}>
                            <span className={styles.lastAuthor}>{thread.lastPost.author?.username ?? 'utilizator șters'}</span>
                            <Link to={lastPageLink(thread)} className={styles.lastTime} title={formatDateTime(thread.lastPost.at)}>
                                {formatRelativeTime(thread.lastPost.at)}
                            </Link>
                        </div>
                    </>
                ) : <span className={styles.lastTime}>—</span>}
            </div>
        </li>
    );
}

/** Classic forum thread table: status, subject, replies/views and the last post. */
export default function ThreadList({ threads, loading, showCategory = false, skeletonCount = 6, header = true }) {
    return (
        <div className={styles.table}>
            {header && (
                <div className={styles.head} aria-hidden="true">
                    <span>Subiect</span>
                    <span className={styles.headStats}>Răspunsuri / Vizualizări</span>
                    <span className={styles.headLast}>Ultimul mesaj</span>
                </div>
            )}
            <ul className={styles.rows} role="list">
                {loading
                    ? Array.from({ length: skeletonCount }, (_, index) => (
                        <li key={index} className={styles.row}><Skeleton height="2.75rem" className={styles.skeleton} /></li>
                    ))
                    : threads.map((thread) => <ThreadRow key={thread.id} thread={thread} showCategory={showCategory} />)}
            </ul>
        </div>
    );
}
