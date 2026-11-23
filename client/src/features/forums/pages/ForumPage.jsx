import { ArrowLeft, Lock, MessagesSquare, SendHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import ReportButton from '@/features/reports/components/ReportButton';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { formatDateTime, formatRelativeTime, plural } from '@/shared/lib/format';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Pagination, Skeleton, Textarea } from '@/shared/ui';
import { useForum, useForumMessages, usePostForumMessage } from '../hooks';
import styles from './ForumPage.module.css';

const PAGE_SIZE = 15;
const DEFAULT_FILTERS = { page: 1 };

function Composer({ forum }) {
    const { isAuthenticated, permissions } = useAuth();
    const [content, setContent] = useState('');
    const post = usePostForumMessage(String(forum.id));

    if (!isAuthenticated) {
        return (
            <Card className={styles.notice}>
                <Link to={`${paths.login}?next=${encodeURIComponent(paths.forum(forum.id))}`} className={styles.link}>Conectează-te</Link> pentru a participa la discuție.
            </Card>
        );
    }
    if (!forum.isOpen) return <Card className={styles.notice}><Lock aria-hidden="true" /> Forumul este închis. Nu se mai pot adăuga mesaje.</Card>;
    if (permissions.canSendMessages === false) {
        return <Card className={styles.notice}>Dreptul tău de a trimite mesaje a fost retras de un administrator.</Card>;
    }

    return (
        <Card as="form" className={styles.composer} onSubmit={(event) => {
            event.preventDefault();
            post.mutate(content.trim(), { onSuccess: () => setContent('') });
        }}>
            <Textarea
                aria-label="Mesajul tău"
                placeholder="Spune-ți părerea…"
                rows={3}
                maxLength={2000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
            />
            <div className={styles.composerFooter}>
                <span className={styles.counter}>{content.length}/2000</span>
                <Button type="submit" leftIcon={<SendHorizontal />} loading={post.isPending} disabled={!content.trim()}>Publică</Button>
            </div>
        </Card>
    );
}

function Message({ message }) {
    return (
        <article className={styles.message}>
            {message.author
                ? <Link to={paths.user(message.author.id)}><Avatar src={message.author.avatarUrl} name={message.author.username} /></Link>
                : <Avatar name="?" />}
            <div className={styles.messageBody}>
                <header className={styles.messageHeader}>
                    {message.author
                        ? <Link to={paths.user(message.author.id)} className={styles.messageAuthor}>{message.author.username}</Link>
                        : <span className={styles.messageAuthor}>Utilizator șters</span>}
                    <time dateTime={message.createdAt} title={formatDateTime(message.createdAt)} className={styles.messageTime}>
                        {formatRelativeTime(message.createdAt)}
                    </time>
                    {!message.isRemoved && <ReportButton targetType="forum_message" targetId={message.id} className={styles.report} />}
                </header>
                {message.isRemoved
                    ? <p className={styles.removed}>Mesaj eliminat de un administrator.</p>
                    : <p className={styles.messageText}>{message.content}</p>}
            </div>
        </article>
    );
}

export default function ForumPage() {
    const { forumId } = useParams();
    const [filters, setFilters] = useSearchParamsState(DEFAULT_FILTERS);
    const forum = useForum(forumId);
    const messages = useForumMessages(forumId, { page: filters.page, limit: PAGE_SIZE });
    useDocumentTitle(forum.data?.title ?? 'Forum');

    if (forum.isError) {
        return forum.error.status === 404
            ? <EmptyState icon={<MessagesSquare />} title="Forumul nu există" action={<Button to={paths.forums}>Înapoi la forumuri</Button>} />
            : <ErrorState onRetry={forum.refetch} />;
    }

    return (
        <div className={styles.page}>
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft />} to={paths.forums} className={styles.back}>Toate forumurile</Button>

            <header className={styles.header}>
                {forum.isPending ? <Skeleton width="60%" height="2.5rem" /> : (
                    <>
                        <div className={styles.headerTop}>
                            <Badge tone={forum.data.isOpen ? 'success' : 'neutral'} dot>{forum.data.isOpen ? 'Deschis' : 'Închis'}</Badge>
                            {messages.data && <span className={styles.count}>{plural(messages.data.total, 'mesaj', 'mesaje')}</span>}
                        </div>
                        <h1 className={styles.title}>{forum.data.title}</h1>
                        <p className={styles.subtitle}>
                            Pornit de {forum.data.author
                                ? <Link to={paths.user(forum.data.author.id)} className={styles.link}>{forum.data.author.username}</Link>
                                : 'un utilizator șters'} · {formatRelativeTime(forum.data.createdAt)}
                        </p>
                    </>
                )}
            </header>

            {forum.data && <Composer forum={forum.data} />}

            <section className={styles.messages} aria-label="Mesaje">
                {messages.isError ? <ErrorState onRetry={messages.refetch} compact /> : messages.isPending ? (
                    Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height="5.5rem" radius="var(--radius-lg)" />)
                ) : messages.data.items.length === 0 ? (
                    <EmptyState icon={<MessagesSquare />} title="Niciun mesaj încă" description="Deschide discuția cu primul mesaj!" compact />
                ) : messages.data.items.map((message) => <Message key={message.id} message={message} />)}
            </section>

            <Pagination page={filters.page} totalPages={messages.data?.totalPages} onPageChange={(page) => setFilters({ page })} />
        </div>
    );
}
