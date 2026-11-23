import { Ban, CheckCircle2, EyeOff, RotateCcw, Trash2, UserX } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import useAuthorizedObjectUrl from '@/shared/hooks/useAuthorizedObjectUrl';
import { formatDateTime } from '@/shared/lib/format';
import { Badge, Button, ConfirmDialog, ErrorState, LoadingState } from '@/shared/ui';
import { PERMISSION_FOR_TARGET, PERMISSION_LABELS, REPORT_TARGET_LABELS } from '../api';
import {
    useDeleteForumAsAdmin, useDeleteListingAsAdmin, useRemoveForumMessage, useReport, useRevokePermission, useSetReportOpen,
} from '../hooks';
import styles from './ReportDetails.module.css';

function MediaPreview({ url }) {
    const file = useAuthorizedObjectUrl(url);
    if (file.error) return <p className={styles.muted}>Fișierul nu poate fi afișat.</p>;
    if (!file.url) return <p className={styles.muted}>Se încarcă fișierul…</p>;
    return file.type === 'application/pdf'
        ? <a href={file.url} target="_blank" rel="noopener noreferrer" className={styles.link}>Deschide documentul PDF</a>
        : <img src={file.url} alt="Fișier raportat" className={styles.media} />;
}

/** Human-readable preview of the reported content, plus a link to see it in context. */
function TargetPreview({ report }) {
    const target = report.target;
    if (!target) return <p className={styles.muted}>Conținutul a fost deja șters.</p>;

    switch (report.targetType) {
        case 'listing':
            return (
                <>
                    <p className={styles.quote}><strong>{target.title}</strong><br />{target.description}</p>
                    <Link to={paths.listing(target.id)} className={styles.link}>Vezi anunțul →</Link>
                </>
            );
        case 'forum':
            return (
                <>
                    <p className={styles.quote}><strong>{target.title}</strong></p>
                    <Link to={paths.forum(target.id)} className={styles.link}>Vezi forumul →</Link>
                </>
            );
        case 'forum_message':
            return (
                <>
                    <p className={styles.quote}>{target.content}</p>
                    {target.isRemoved && <Badge>Ascuns deja</Badge>}
                    <Link to={paths.forum(target.forumId)} className={styles.link}>Vezi forumul →</Link>
                </>
            );
        case 'chat_message':
            return target.mediaUrl ? <MediaPreview url={target.mediaUrl} /> : <p className={styles.quote}>{target.content}</p>;
        default:
            return null;
    }
}

export default function ReportDetails({ reportId }) {
    const report = useReport(reportId);
    const [confirm, setConfirm] = useState(null);
    const setOpen = useSetReportOpen();
    const revoke = useRevokePermission();
    const removeMessage = useRemoveForumMessage();
    const deleteListing = useDeleteListingAsAdmin();
    const deleteForum = useDeleteForumAsAdmin();

    if (report.isError) return <ErrorState onRetry={report.refetch} compact />;
    if (report.isPending) return <LoadingState />;

    const data = report.data;
    const author = data.targetAuthor;
    const permission = PERMISSION_FOR_TARGET[data.targetType];

    // Each destructive action is confirmed first; `run` is executed on confirmation.
    const actions = {
        revokeAuthor: {
            title: `Retragi dreptul de ${PERMISSION_LABELS[permission]}?`,
            description: `${author?.username} nu va mai putea face acest lucru până când un administrator nu îi redă dreptul.`,
            run: () => revoke.mutateAsync({ userId: author.id, permission }),
        },
        revokeReporter: {
            title: 'Retragi dreptul de raportare?',
            description: `${data.reporter?.username} nu va mai putea trimite rapoarte.`,
            run: () => revoke.mutateAsync({ userId: data.reporter.id, permission: 'report' }),
        },
        hideMessage: {
            title: 'Ascunzi mesajul?',
            description: 'Mesajul nu va mai fi vizibil în forum.',
            run: () => removeMessage.mutateAsync(data.targetId),
        },
        deleteTarget: {
            title: data.targetType === 'listing' ? 'Ștergi anunțul?' : 'Ștergi forumul?',
            description: 'Conținutul va fi șters definitiv, împreună cu conversațiile/mesajele asociate.',
            run: () => (data.targetType === 'listing' ? deleteListing : deleteForum).mutateAsync(data.targetId)
                .then(() => setOpen.mutateAsync({ id: data.id, isOpen: false })),
        },
    };
    const pending = revoke.isPending || removeMessage.isPending || deleteListing.isPending || deleteForum.isPending;

    return (
        <div className={styles.details}>
            <header className={styles.header}>
                <div>
                    <p className={styles.eyebrow}>Raport #{data.id} · {REPORT_TARGET_LABELS[data.targetType]}</p>
                    <h2 className={styles.title}>{data.reason}</h2>
                    <p className={styles.muted}>
                        Raportat de{' '}
                        {data.reporter ? <Link to={paths.user(data.reporter.id)} className={styles.link}>{data.reporter.username}</Link> : 'un utilizator șters'}
                        {' '}pe {formatDateTime(data.createdAt)}
                    </p>
                </div>
                <Badge tone={data.isOpen ? 'warning' : 'success'} dot>{data.isOpen ? 'Deschis' : 'Rezolvat'}</Badge>
            </header>

            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Conținut raportat</h3>
                <TargetPreview report={data} />
                {author && (
                    <p className={styles.muted}>
                        Autor: <Link to={paths.user(author.id)} className={styles.link}>{author.username}</Link>
                    </p>
                )}
            </section>

            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Acțiuni</h3>
                <div className={styles.actions}>
                    {data.targetType === 'forum_message' && data.target && !data.target.isRemoved && (
                        <Button variant="secondary" size="sm" leftIcon={<EyeOff />} onClick={() => setConfirm('hideMessage')}>Ascunde mesajul</Button>
                    )}
                    {['listing', 'forum'].includes(data.targetType) && data.target && (
                        <Button variant="danger" size="sm" leftIcon={<Trash2 />} onClick={() => setConfirm('deleteTarget')}>
                            Șterge {data.targetType === 'listing' ? 'anunțul' : 'forumul'}
                        </Button>
                    )}
                    {author && (
                        <Button variant="danger" size="sm" leftIcon={<UserX />} onClick={() => setConfirm('revokeAuthor')}>
                            Retrage dreptul autorului
                        </Button>
                    )}
                    {data.reporter && (
                        <Button variant="ghost" size="sm" leftIcon={<Ban />} onClick={() => setConfirm('revokeReporter')}>
                            Raport abuziv: blochează raportorul
                        </Button>
                    )}
                </div>
            </section>

            <footer className={styles.footer}>
                {data.isOpen ? (
                    <Button leftIcon={<CheckCircle2 />} loading={setOpen.isPending} onClick={() => setOpen.mutate({ id: data.id, isOpen: false })}>
                        Marchează ca rezolvat
                    </Button>
                ) : (
                    <Button variant="secondary" leftIcon={<RotateCcw />} loading={setOpen.isPending} onClick={() => setOpen.mutate({ id: data.id, isOpen: true })}>
                        Redeschide raportul
                    </Button>
                )}
            </footer>

            <ConfirmDialog
                open={Boolean(confirm)}
                title={actions[confirm]?.title}
                description={actions[confirm]?.description}
                loading={pending}
                onCancel={() => setConfirm(null)}
                onConfirm={() => actions[confirm].run().then(() => setConfirm(null), () => {})}
            />
        </div>
    );
}
