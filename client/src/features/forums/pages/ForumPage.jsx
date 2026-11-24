import {
    ArrowDownToLine, BookOpen, Eye, Lock, LockOpen, MessageSquareReply, MessagesSquare, Pin, Settings2, X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import BookCover from '@/features/books/components/BookCover';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { formatCount, formatDateTime, formatRelativeTime } from '@/shared/lib/format';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, Pagination, Select, Skeleton } from '@/shared/ui';
import Breadcrumbs from '../components/Breadcrumbs';
import CategoryIcon from '../components/CategoryIcon';
import Composer from '../components/Composer';
import PostCard from '../components/PostCard';
import { MAX_TITLE_LENGTH, pageOfPosition, POSTS_PER_PAGE } from '../constants';
import { useForum, useForumBoard, useForumMessages, usePostForumMessage, useUpdateForum } from '../hooks';
import { toPlainText } from '../lib/rich-text';
import styles from './ForumPage.module.css';

const DEFAULT_FILTERS = { page: 1 };
const HIGHLIGHT_MS = 2500;

/** Owner and admin tools: rename, close/reopen and, for admins, pin and move. */
function ThreadSettings({ thread, open, onClose }) {
    const { isAdmin } = useAuth();
    const board = useForumBoard();
    const update = useUpdateForum();
    const [form, setForm] = useState(() => ({
        title: thread.title,
        isOpen: thread.isOpen,
        isPinned: thread.isPinned,
        categoryId: thread.category?.id ?? '',
    }));

    const submit = (event) => {
        event.preventDefault();
        const changes = {};
        const title = form.title.trim();
        if (title !== thread.title) changes.title = title;
        if (form.isOpen !== thread.isOpen) changes.isOpen = form.isOpen;
        if (isAdmin && form.isPinned !== thread.isPinned) changes.isPinned = form.isPinned;
        if (isAdmin && Number(form.categoryId) !== thread.category?.id) changes.categoryId = Number(form.categoryId);
        if (Object.keys(changes).length === 0) {
            onClose();
            return;
        }
        update.mutate({ id: thread.id, changes }, { onSuccess: onClose });
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Gestionează discuția"
            footer={(
                <>
                    <Button variant="ghost" onClick={onClose}>Renunță</Button>
                    <Button type="submit" form="thread-settings" loading={update.isPending} disabled={form.title.trim().length < 3}>
                        Salvează
                    </Button>
                </>
            )}
        >
            <form id="thread-settings" className={styles.settings} onSubmit={submit}>
                <Input
                    label="Titlu"
                    value={form.title}
                    maxLength={MAX_TITLE_LENGTH}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
                {isAdmin && (
                    <Select
                        label="Categorie"
                        value={form.categoryId}
                        onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                    >
                        {(board.data?.categories ?? (thread.category ? [thread.category] : [])).map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </Select>
                )}
                <label className={styles.toggle}>
                    <input
                        type="checkbox"
                        checked={!form.isOpen}
                        onChange={(event) => setForm((current) => ({ ...current, isOpen: !event.target.checked }))}
                    />
                    <span>
                        <strong>Închide discuția</strong>
                        <small>Nimeni nu mai poate răspunde sau edita mesajele.</small>
                    </span>
                </label>
                {isAdmin && (
                    <label className={styles.toggle}>
                        <input
                            type="checkbox"
                            checked={form.isPinned}
                            onChange={(event) => setForm((current) => ({ ...current, isPinned: event.target.checked }))}
                        />
                        <span>
                            <strong>Fixează discuția</strong>
                            <small>Apare prima în categoria ei.</small>
                        </span>
                    </label>
                )}
            </form>
        </Modal>
    );
}

/** Reply box at the end of the thread, with the quoted post (if any) shown above it. */
function ReplyBox({ thread, replyTo, onClearReply, composerRef, onPosted }) {
    const { isAuthenticated, permissions } = useAuth();
    const location = useLocation();
    const [content, setContent] = useState('');
    const post = usePostForumMessage(thread.id);

    if (!isAuthenticated) {
        const next = encodeURIComponent(`${location.pathname}${location.search}`);
        return (
            <Card className={styles.notice}>
                <MessageSquareReply aria-hidden="true" />
                <span><Link to={`${paths.login}?next=${next}`} className={styles.link}>Conectează-te</Link> pentru a răspunde în această discuție.</span>
            </Card>
        );
    }
    if (!thread.isOpen) {
        return <Card className={styles.notice}><Lock aria-hidden="true" /> Discuția este închisă. Nu se mai pot adăuga răspunsuri.</Card>;
    }
    if (permissions.canSendMessages === false) {
        return <Card className={styles.notice}>Dreptul tău de a trimite mesaje a fost retras de un administrator.</Card>;
    }

    const submit = (event) => {
        event.preventDefault();
        post.mutate({ content: content.trim(), replyToId: replyTo?.id }, {
            onSuccess: (created) => {
                setContent('');
                onClearReply();
                onPosted(created);
            },
        });
    };

    return (
        <Card as="form" className={styles.reply} onSubmit={submit} id="raspunde">
            <h2 className={styles.replyTitle}><MessageSquareReply aria-hidden="true" /> Răspunde</h2>
            {replyTo && (
                <div className={styles.replyChip}>
                    <span>
                        Răspunzi lui <strong>{replyTo.author?.username ?? 'Utilizator șters'}</strong>
                        <span className={styles.replyExcerpt}> — „{toPlainText(replyTo.content ?? '', 90)}”</span>
                    </span>
                    <button type="button" className={styles.replyClear} aria-label="Renunță la citat" onClick={onClearReply}><X /></button>
                </div>
            )}
            <Composer
                ref={composerRef}
                value={content}
                onChange={setContent}
                label="Răspunsul tău"
                placeholder="Scrie un răspuns… Poți folosi **îngroșat**, *cursiv*, > citate și - liste."
                rows={5}
            />
            <div className={styles.replyFooter}>
                <Button type="submit" leftIcon={<MessageSquareReply />} loading={post.isPending} disabled={content.trim().length < 2}>
                    Publică răspunsul
                </Button>
            </div>
        </Card>
    );
}

function ThreadHeader({ thread, onManage }) {
    const { user, isAdmin } = useAuth();
    const canManage = isAdmin || (user && thread.author?.id === user.id);
    return (
        <header className={styles.header}>
            <div className={styles.headerMain}>
                <CategoryIcon category={thread.category} size="lg" />
                <div className={styles.headerText}>
                    <div className={styles.badges}>
                        {thread.isPinned && <Badge tone="primary"><Pin aria-hidden="true" /> Fixată</Badge>}
                        {!thread.isOpen && <Badge tone="neutral"><Lock aria-hidden="true" /> Închisă</Badge>}
                    </div>
                    <h1 className={styles.title}>{thread.title}</h1>
                    <p className={styles.meta}>
                        Pornită de {thread.author
                            ? <Link to={paths.user(thread.author.id)} className={styles.link}>{thread.author.username}</Link>
                            : 'un utilizator șters'}
                        {' '}· <time dateTime={thread.createdAt} title={formatDateTime(thread.createdAt)}>{formatRelativeTime(thread.createdAt)}</time>
                    </p>
                </div>
                {canManage && (
                    <Button variant="secondary" size="sm" leftIcon={<Settings2 />} onClick={onManage} className={styles.manage}>
                        Gestionează
                    </Button>
                )}
            </div>

            <dl className={styles.stats}>
                <div><dt>Răspunsuri</dt><dd>{formatCount(thread.replyCount)}</dd></div>
                <div><dt><Eye aria-hidden="true" /> Vizualizări</dt><dd>{formatCount(thread.viewCount)}</dd></div>
                <div>
                    <dt>Ultimul mesaj</dt>
                    <dd>{thread.lastPost?.at ? formatRelativeTime(thread.lastPost.at) : '—'}</dd>
                </div>
                <div>
                    <dt>Stare</dt>
                    <dd>{thread.isOpen ? <><LockOpen aria-hidden="true" /> Deschisă</> : <><Lock aria-hidden="true" /> Închisă</>}</dd>
                </div>
            </dl>

            {thread.book && (
                <Link to={paths.book(thread.book.id)} className={styles.book}>
                    <BookCover src={thread.book.coverUrl} title={thread.book.title} size="sm" className={styles.bookCover} />
                    <span className={styles.bookText}>
                        <span className={styles.bookLabel}><BookOpen aria-hidden="true" /> Carte discutată</span>
                        <strong>{thread.book.title}</strong>
                        <span>{thread.book.author ?? 'Autor necunoscut'}</span>
                    </span>
                </Link>
            )}
        </header>
    );
}

/** A thread: header, numbered posts in chronological order, pagination and the reply box. */
export default function ForumPage() {
    const { forumId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [filters, setFilters] = useSearchParamsState(DEFAULT_FILTERS);
    const [replyTo, setReplyTo] = useState(null);
    const [managing, setManaging] = useState(false);
    const [highlightId, setHighlightId] = useState(null);
    const composerRef = useRef(null);

    const thread = useForum(forumId);
    const posts = useForumMessages(forumId, { page: filters.page, limit: POSTS_PER_PAGE });
    useDocumentTitle(thread.data?.title ?? 'Discuție');

    // Jump to `#post-<id>` once that post is on screen, and flash it so the eye finds it.
    const hash = location.hash;
    const loadedIds = posts.data?.items.map((post) => post.id).join(',');
    useEffect(() => {
        const match = /^#post-(\d+)$/.exec(hash);
        if (!match || !loadedIds) return undefined;
        const element = document.getElementById(`post-${match[1]}`);
        if (!element) return undefined;
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightId(Number(match[1]));
        const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
        return () => clearTimeout(timer);
    }, [hash, loadedIds]);

    if (thread.isError) {
        return thread.error.status === 404
            ? <EmptyState icon={<MessagesSquare />} title="Discuția nu există" description="Poate a fost ștearsă sau linkul e greșit." action={<Button to={paths.forums}>Înapoi la forumuri</Button>} />
            : <ErrorState onRetry={thread.refetch} />;
    }

    const data = thread.data;
    const totalPages = posts.data?.totalPages ?? 1;
    const changePage = (page) => {
        setFilters({ page });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const quote = (post) => {
        setReplyTo(post);
        document.getElementById('raspunde')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        composerRef.current?.focus();
    };
    const goToPost = ({ id, position }) => {
        const page = pageOfPosition(position);
        navigate({ pathname: paths.forum(forumId), search: page > 1 ? `?page=${page}` : '', hash: `#post-${id}` });
    };
    const lastPage = data ? pageOfPosition(data.postCount) : 1;

    return (
        <div className={styles.page}>
            <Breadcrumbs items={[
                { label: 'Forumuri', to: paths.forums },
                data?.category ? { label: data.category.name, to: paths.forumCategory(data.category.slug) } : { label: '…' },
                { label: data?.title ?? '…' },
            ]} />

            {data ? <ThreadHeader thread={data} onManage={() => setManaging(true)} /> : (
                <div className={styles.header}>
                    <Skeleton width="40%" height="1.25rem" />
                    <Skeleton width="75%" height="2.25rem" />
                    <Skeleton width="30%" height="1rem" />
                </div>
            )}

            <div className={styles.toolbar}>
                <Pagination page={filters.page} totalPages={totalPages} onPageChange={changePage} />
                {data && (
                    <div className={styles.toolbarActions}>
                        {filters.page < lastPage && (
                            <Button variant="ghost" size="sm" leftIcon={<ArrowDownToLine />} to={`${paths.forum(forumId)}?page=${lastPage}`}>
                                Ultima pagină
                            </Button>
                        )}
                        {data.isOpen && (
                            <Button size="sm" leftIcon={<MessageSquareReply />} onClick={() => quote(null)}>Răspunde</Button>
                        )}
                    </div>
                )}
            </div>

            <section className={styles.posts} aria-label="Mesaje">
                {posts.isError ? <ErrorState onRetry={posts.refetch} compact /> : posts.isPending || !data ? (
                    Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height="11rem" radius="var(--radius-lg)" />)
                ) : posts.data.items.length === 0 ? (
                    <EmptyState icon={<MessagesSquare />} title="Niciun mesaj pe această pagină" action={<Button onClick={() => changePage(1)}>Prima pagină</Button>} compact />
                ) : posts.data.items.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        thread={data}
                        page={filters.page}
                        highlighted={highlightId === post.id}
                        onQuote={quote}
                    />
                ))}
            </section>

            <Pagination page={filters.page} totalPages={totalPages} onPageChange={changePage} />

            {data && (
                <ReplyBox
                    thread={data}
                    replyTo={replyTo}
                    onClearReply={() => setReplyTo(null)}
                    composerRef={composerRef}
                    onPosted={goToPost}
                />
            )}

            {data && managing && <ThreadSettings thread={data} open={managing} onClose={() => setManaging(false)} />}
        </div>
    );
}
