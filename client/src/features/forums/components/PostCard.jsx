import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { EyeOff, Heart, Pencil, Quote, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import { moderationApi } from '@/features/reports/api';
import ReportButton from '@/features/reports/components/ReportButton';
import { getErrorMessage } from '@/shared/api/error-messages';
import { formatCount, formatDate, formatDateTime, formatRelativeTime } from '@/shared/lib/format';
import { queryKeys } from '@/shared/lib/query-keys';
import { Avatar, Badge, Button, ConfirmDialog } from '@/shared/ui';
import { useDeleteForumMessage, useEditForumMessage, useLikeForumMessage } from '../hooks';
import { toPlainText } from '../lib/rich-text';
import Composer from './Composer';
import RichText from './RichText';
import styles from './PostCard.module.css';

function AuthorPanel({ author, isThreadAuthor }) {
    if (!author) {
        return (
            <aside className={styles.author}>
                <Avatar name="?" size="lg" />
                <span className={styles.authorName}>Utilizator șters</span>
            </aside>
        );
    }
    return (
        <aside className={styles.author}>
            <Link to={paths.user(author.id)} className={styles.avatarLink} tabIndex={-1}>
                <Avatar src={author.avatarUrl} name={author.username} size="lg" />
            </Link>
            <div className={styles.authorText}>
                <Link to={paths.user(author.id)} className={styles.authorName}>{author.username}</Link>
                <div className={styles.roles}>
                    {author.isAdmin && <Badge tone="primary"><ShieldCheck aria-hidden="true" /> Administrator</Badge>}
                    {isThreadAuthor && <Badge tone="neutral"><UserRound aria-hidden="true" /> Autorul discuției</Badge>}
                </div>
                <dl className={styles.authorStats}>
                    <div><dt>Membru din</dt><dd>{formatDate(author.joinedAt)}</dd></div>
                    <div><dt>Mesaje</dt><dd>{formatCount(author.postCount)}</dd></div>
                </dl>
            </div>
        </aside>
    );
}

function LikeButton({ post, forumId, isOwn }) {
    const { isAuthenticated } = useAuth();
    const like = useLikeForumMessage(forumId);
    const disabled = !isAuthenticated || isOwn || like.isPending;
    const title = !isAuthenticated
        ? 'Conectează-te pentru a aprecia'
        : isOwn ? 'Nu îți poți aprecia propriul mesaj' : post.likedByMe ? 'Retrage aprecierea' : 'Apreciază';
    return (
        <button
            type="button"
            className={clsx(styles.action, styles.like, post.likedByMe && styles.liked)}
            aria-pressed={post.likedByMe}
            title={title}
            disabled={disabled}
            onClick={() => like.mutate({ messageId: post.id, liked: !post.likedByMe })}
        >
            <Heart aria-hidden="true" />
            <span>{post.likeCount > 0 ? formatCount(post.likeCount) : 'Apreciază'}</span>
        </button>
    );
}

/** Admins can hide any post straight from the thread (the content is kept for auditing). */
function useHidePost(forumId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: moderationApi.removeForumMessage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['forums', String(forumId), 'messages'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
            toast.success('Mesajul a fost ascuns.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Mesajul nu a putut fi ascuns.')),
    });
}

/**
 * One post of a thread: author panel, numbered header with a permalink, the quoted post it
 * answers, the formatted text and the actions (like, quote, edit, delete, report, hide).
 */
export default function PostCard({ post, thread, page, highlighted, onQuote }) {
    const { user, isAuthenticated, isAdmin } = useAuth();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(post.content ?? '');
    const [confirm, setConfirm] = useState(null);
    const edit = useEditForumMessage(thread.id);
    const remove = useDeleteForumMessage(thread.id);
    const hide = useHidePost(thread.id);

    const isOwn = Boolean(user && post.author?.id === user.id);
    const canWrite = thread.isOpen && !post.isRemoved;
    const permalink = `${paths.forum(thread.id)}${page > 1 ? `?page=${page}` : ''}#post-${post.id}`;

    const saveEdit = () => {
        const content = draft.trim();
        if (content.length < 2 || content === post.content) {
            setEditing(false);
            return;
        }
        edit.mutate({ messageId: post.id, content }, { onSuccess: () => setEditing(false) });
    };

    return (
        <article id={`post-${post.id}`} className={clsx(styles.post, highlighted && styles.highlighted, post.position === 1 && styles.opening)}>
            <AuthorPanel author={post.author} isThreadAuthor={Boolean(post.author && post.author.id === thread.author?.id)} />

            <div className={styles.body}>
                <header className={styles.header}>
                    <time dateTime={post.createdAt} title={formatDateTime(post.createdAt)} className={styles.time}>
                        {formatRelativeTime(post.createdAt)}
                    </time>
                    {post.editedAt && !post.isRemoved && (
                        <span className={styles.edited} title={`Editat ${formatDateTime(post.editedAt)}`}>· editat</span>
                    )}
                    <Link to={permalink} className={styles.number} title="Link către acest mesaj">#{post.position}</Link>
                </header>

                {post.replyTo && !post.isRemoved && (
                    <a href={`#post-${post.replyTo.id}`} className={styles.quote}>
                        <span className={styles.quoteAuthor}>
                            <Quote aria-hidden="true" /> {post.replyTo.author?.username ?? 'Utilizator șters'} a scris:
                        </span>
                        <span className={styles.quoteText}>
                            {post.replyTo.excerpt ? toPlainText(post.replyTo.excerpt, 220) : 'Mesaj șters.'}
                        </span>
                    </a>
                )}

                {post.isRemoved ? (
                    <p className={styles.removed}>Acest mesaj a fost șters.</p>
                ) : editing ? (
                    <div className={styles.editor}>
                        <Composer value={draft} onChange={setDraft} label="Editează mesajul" rows={6} autoFocus />
                        <div className={styles.editorActions}>
                            <Button variant="ghost" size="sm" onClick={() => { setDraft(post.content); setEditing(false); }}>Renunță</Button>
                            <Button size="sm" loading={edit.isPending} disabled={draft.trim().length < 2} onClick={saveEdit}>Salvează</Button>
                        </div>
                    </div>
                ) : (
                    <RichText text={post.content} className={styles.content} />
                )}

                {!post.isRemoved && !editing && (
                    <footer className={styles.actions}>
                        <LikeButton post={post} forumId={thread.id} isOwn={isOwn} />
                        {isAuthenticated && canWrite && (
                            <button type="button" className={styles.action} onClick={() => onQuote(post)}>
                                <Quote aria-hidden="true" /> <span>Citează</span>
                            </button>
                        )}
                        {isOwn && canWrite && (
                            <button type="button" className={styles.action} onClick={() => { setDraft(post.content); setEditing(true); }}>
                                <Pencil aria-hidden="true" /> <span>Editează</span>
                            </button>
                        )}
                        {isOwn && (
                            <button type="button" className={styles.action} onClick={() => setConfirm('delete')}>
                                <Trash2 aria-hidden="true" /> <span>Șterge</span>
                            </button>
                        )}
                        <span className={styles.spacer} />
                        {isAdmin && !isOwn && (
                            <button type="button" className={clsx(styles.action, styles.danger)} onClick={() => setConfirm('hide')}>
                                <EyeOff aria-hidden="true" /> <span>Ascunde</span>
                            </button>
                        )}
                        {!isOwn && <ReportButton targetType="forum_message" targetId={post.id} className={styles.report} />}
                    </footer>
                )}
            </div>

            <ConfirmDialog
                open={confirm !== null}
                title={confirm === 'hide' ? 'Ascunzi acest mesaj?' : 'Ștergi mesajul?'}
                description={confirm === 'hide'
                    ? 'Mesajul nu va mai fi vizibil pentru nimeni. Conținutul rămâne păstrat pentru audit.'
                    : 'Mesajul va fi înlocuit cu „Acest mesaj a fost șters.” Acțiunea nu poate fi anulată.'}
                confirmLabel={confirm === 'hide' ? 'Ascunde' : 'Șterge'}
                loading={remove.isPending || hide.isPending}
                onCancel={() => setConfirm(null)}
                onConfirm={() => {
                    const action = confirm === 'hide' ? hide : remove;
                    action.mutate(post.id, { onSettled: () => setConfirm(null) });
                }}
            />
        </article>
    );
}
