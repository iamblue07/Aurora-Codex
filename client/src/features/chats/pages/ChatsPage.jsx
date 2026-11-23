import clsx from 'clsx';
import { MessagesSquare, Store } from 'lucide-react';
import { NavLink, useParams } from 'react-router';
import { paths } from '@/app/paths';
import ListingImage from '@/features/marketplace/components/ListingImage';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import { formatRelativeTime } from '@/shared/lib/format';
import { Button, EmptyState, ErrorState, PageHeader, Skeleton } from '@/shared/ui';
import ChatWindow from '../components/ChatWindow';
import { useMyChats } from '../hooks';
import styles from './ChatsPage.module.css';

function ChatList({ chats }) {
    return (
        <ul className={styles.list} role="list">
            {chats.map((chat) => {
                const other = chat.isSeller ? chat.buyer : chat.seller;
                return (
                    <li key={chat.id}>
                        <NavLink to={paths.chat(chat.id)} className={({ isActive }) => clsx(styles.item, isActive && styles.active)}>
                            <ListingImage src={chat.listing?.imageUrl} alt="" className={styles.thumb} />
                            <span className={styles.itemText}>
                                <span className={styles.itemTitle}>{chat.listing?.title ?? 'Anunț șters'}</span>
                                <span className={styles.itemMeta}>
                                    {chat.isSeller ? 'Cumpărător' : 'Vânzător'}: <strong>{other?.username}</strong>
                                </span>
                            </span>
                            <span className={styles.itemSide}>
                                <time className={styles.itemTime} dateTime={chat.createdAt}>{formatRelativeTime(chat.createdAt)}</time>
                                {!chat.isOpen && <span className={styles.closedDot} title="Conversație închisă" />}
                            </span>
                        </NavLink>
                    </li>
                );
            })}
        </ul>
    );
}

export default function ChatsPage() {
    useDocumentTitle('Conversații');
    const { chatId } = useParams();
    const chats = useMyChats();

    return (
        <div>
            <PageHeader eyebrow="Bazar" title="Conversațiile mele" subtitle="Discuțiile cu cumpărătorii și vânzătorii din bazar." />

            {chats.isError ? <ErrorState onRetry={chats.refetch} /> : chats.data?.length === 0 ? (
                <EmptyState
                    icon={<MessagesSquare />}
                    title="Nu ai încă nicio conversație"
                    description="Când contactezi un vânzător sau cineva îți scrie despre un anunț, discuția apare aici."
                    action={<Button to={paths.marketplace} leftIcon={<Store />}>Explorează bazarul</Button>}
                />
            ) : (
                <div className={clsx(styles.layout, chatId && styles.hasChat)}>
                    <aside className={styles.sidebar} aria-label="Lista conversațiilor">
                        {chats.isPending
                            ? <div className={styles.list}>{[1, 2, 3, 4].map((key) => <Skeleton key={key} height="4.5rem" radius="var(--radius-md)" />)}</div>
                            : <ChatList chats={chats.data} />}
                    </aside>
                    <div className={styles.main}>
                        {chatId ? <ChatWindow key={chatId} chatId={chatId} /> : (
                            <div className={styles.placeholder}>
                                <MessagesSquare aria-hidden="true" />
                                <p>Alege o conversație din listă.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
