import { ArrowLeft, Lock, LockOpen, Paperclip, SendHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import { formatDate } from '@/shared/lib/format';
import { Avatar, Badge, Button, ErrorState, IconButton, LoadingState } from '@/shared/ui';
import { useChat, useChatMessages, useSendFile, useSendMessage, useToggleChat } from '../hooks';
import MessageBubble from './MessageBubble';
import styles from './ChatWindow.module.css';

const ACCEPTED_FILES = 'image/jpeg,image/png,image/webp,application/pdf';

/** Groups messages by calendar day so the thread shows "date separators". */
const groupByDay = (messages) => {
    const groups = [];
    for (const message of messages) {
        const day = new Date(message.createdAt).toDateString();
        const last = groups[groups.length - 1];
        if (last?.day === day) last.messages.push(message);
        else groups.push({ day, date: message.createdAt, messages: [message] });
    }
    return groups;
};

function Composer({ chatId, disabledReason }) {
    const [text, setText] = useState('');
    const fileRef = useRef(null);
    const send = useSendMessage(chatId);
    const sendFile = useSendFile(chatId);

    if (disabledReason) return <p className={styles.closedNote}><Lock aria-hidden="true" /> {disabledReason}</p>;

    const submit = (event) => {
        event.preventDefault();
        const content = text.trim();
        if (!content) return;
        send.mutate(content, { onSuccess: () => setText('') });
    };

    return (
        <form className={styles.composer} onSubmit={submit}>
            <IconButton label="Atașează o imagine sau un PDF" onClick={() => fileRef.current?.click()} disabled={sendFile.isPending}>
                <Paperclip />
            </IconButton>
            <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_FILES}
                className="visually-hidden"
                tabIndex={-1}
                onChange={(event) => { const file = event.target.files?.[0]; if (file) sendFile.mutate(file); event.target.value = ''; }}
            />
            <textarea
                className={styles.input}
                placeholder="Scrie un mesaj…"
                aria-label="Mesaj"
                rows={1}
                maxLength={2000}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) submit(event);
                }}
            />
            <IconButton type="submit" label="Trimite" variant="primary" disabled={!text.trim() || send.isPending}>
                <SendHorizontal />
            </IconButton>
        </form>
    );
}

export default function ChatWindow({ chatId }) {
    const { permissions } = useAuth();
    const chat = useChat(chatId);
    const messages = useChatMessages(chatId);
    const toggle = useToggleChat(chatId);
    const endRef = useRef(null);
    const count = messages.data?.length ?? 0;

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [count]);

    if (chat.isError || messages.isError) {
        return <ErrorState description="Conversația nu a putut fi încărcată." onRetry={() => { chat.refetch(); messages.refetch(); }} />;
    }
    if (chat.isPending) return <LoadingState />;

    const data = chat.data;
    const other = data.isSeller ? data.buyer : data.seller;
    const disabledReason = !data.isOpen
        ? 'Conversația este închisă.'
        : permissions.canSendMessages === false
            ? 'Dreptul tău de a trimite mesaje a fost retras.'
            : null;

    return (
        <section className={styles.window} aria-label={`Conversație cu ${other?.username}`}>
            <header className={styles.header}>
                <Link to={paths.chats} className={styles.back} aria-label="Înapoi la conversații"><ArrowLeft /></Link>
                <Avatar src={other?.avatarUrl} name={other?.username ?? ''} size="sm" />
                <div className={styles.headerText}>
                    <Link to={paths.user(other?.id)} className={styles.name}>{other?.username}</Link>
                    {data.listing && <Link to={paths.listing(data.listing.id)} className={styles.listing}>{data.listing.title}</Link>}
                </div>
                <Badge className={styles.status} tone={data.isOpen ? 'success' : 'neutral'} dot>{data.isOpen ? 'Deschisă' : 'Închisă'}</Badge>
                {!data.isSeller && (
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={data.isOpen ? <Lock /> : <LockOpen />}
                        loading={toggle.isPending}
                        onClick={() => toggle.mutate(!data.isOpen)}
                    >
                        {data.isOpen ? 'Închide' : 'Redeschide'}
                    </Button>
                )}
            </header>

            <div className={styles.thread}>
                {messages.isPending ? <LoadingState /> : groupByDay(messages.data).map((group) => (
                    <div key={group.day} className={styles.day}>
                        <span className={styles.dayLabel}>{formatDate(group.date)}</span>
                        {group.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            <Composer chatId={chatId} disabledReason={disabledReason} />
        </section>
    );
}
