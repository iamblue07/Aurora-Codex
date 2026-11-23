import { BookMarked, ChevronRight, LayoutList, MessagesSquare, ShieldAlert, Store, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import { Card, LoadingState } from '@/shared/ui';
import AccountCard from '../components/AccountCard';
import FavoriteGenresCard from '../components/FavoriteGenresCard';
import PasswordCard from '../components/PasswordCard';
import styles from './ProfilePage.module.css';

const REVOKED_LABELS = {
    canCreateListings: 'publicarea anunțurilor',
    canCreateForums: 'crearea forumurilor',
    canSendMessages: 'trimiterea mesajelor',
    canReport: 'raportarea conținutului',
};

export default function ProfilePage() {
    useDocumentTitle('Profilul meu');
    const { user, isAdmin } = useAuth();
    if (!user) return <LoadingState />;

    const revoked = Object.entries(user.permissions)
        .filter(([, granted]) => !granted)
        .map(([permission]) => REVOKED_LABELS[permission]);

    const shortcuts = [
        { to: paths.readingHistory, icon: <BookMarked />, label: 'Istoricul de lectură', hint: 'Cărțile citite și notele tale' },
        { to: paths.myListings, icon: <Store />, label: 'Anunțurile mele', hint: 'Cărțile pe care le vinzi' },
        { to: paths.chats, icon: <MessagesSquare />, label: 'Conversații', hint: 'Mesajele din bazar' },
        { to: paths.myForums, icon: <LayoutList />, label: 'Forumurile mele', hint: 'Discuțiile pornite de tine' },
        ...(isAdmin ? [{ to: paths.reports, icon: <ShieldAlert />, label: 'Panou de administrare', hint: 'Rapoartele utilizatorilor' }] : []),
    ];

    return (
        <div className={styles.layout}>
            <div className={styles.side}>
                <AccountCard key={user.id} account={user} />
                <Card as="nav" padding="sm" aria-label="Scurtături">
                    <ul className={styles.shortcuts} role="list">
                        {shortcuts.map((item) => (
                            <li key={item.to}>
                                <Link to={item.to} className={styles.shortcut}>
                                    <span className={styles.shortcutIcon} aria-hidden="true">{item.icon}</span>
                                    <span className={styles.shortcutText}>
                                        <strong>{item.label}</strong>
                                        <span>{item.hint}</span>
                                    </span>
                                    <ChevronRight className={styles.chevron} aria-hidden="true" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <div className={styles.main}>
                {revoked.length > 0 && (
                    <div className={styles.warning} role="status">
                        <TriangleAlert aria-hidden="true" />
                        <p>
                            În urma unor încălcări ale regulamentului, un administrator ți-a retras dreptul de {revoked.join(', ')}.
                        </p>
                    </div>
                )}
                <FavoriteGenresCard />
                <PasswordCard />
            </div>
        </div>
    );
}
