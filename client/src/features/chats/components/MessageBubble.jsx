import clsx from 'clsx';
import { FileText, ImageOff } from 'lucide-react';
import ReportButton from '@/features/reports/components/ReportButton';
import useAuthorizedObjectUrl from '@/shared/hooks/useAuthorizedObjectUrl';
import { formatTime } from '@/shared/lib/format';
import { Skeleton } from '@/shared/ui';
import styles from './MessageBubble.module.css';

/** A media attachment: images inline, PDFs as a download link. Loaded with the bearer token. */
function Attachment({ url }) {
    const file = useAuthorizedObjectUrl(url);
    if (file.error) return <span className={styles.mediaError}><ImageOff aria-hidden="true" /> Fișierul nu poate fi afișat</span>;
    if (!file.url) return <Skeleton width="14rem" height="10rem" radius="var(--radius-md)" />;
    if (file.type === 'application/pdf') {
        return (
            <a href={file.url} target="_blank" rel="noopener noreferrer" className={styles.pdf}>
                <FileText aria-hidden="true" /> Deschide documentul PDF
            </a>
        );
    }
    return (
        <a href={file.url} target="_blank" rel="noopener noreferrer">
            <img src={file.url} alt="Imagine trimisă în conversație" className={styles.image} />
        </a>
    );
}

export default function MessageBubble({ message }) {
    return (
        <div className={clsx(styles.row, message.isOwn ? styles.own : styles.other)}>
            <div className={clsx(styles.bubble, message.isMedia && styles.media)}>
                {message.isMedia ? <Attachment url={message.mediaUrl} /> : <p className={styles.text}>{message.content}</p>}
                <time className={styles.time} dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
            </div>
            {!message.isOwn && (
                <ReportButton targetType="chat_message" targetId={message.id} className={styles.report} />
            )}
        </div>
    );
}
