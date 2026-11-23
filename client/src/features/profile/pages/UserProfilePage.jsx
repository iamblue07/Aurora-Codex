import { CalendarDays, LayoutList, Lock, ShieldCheck, Store, UserX } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import ForumCard from '@/features/forums/components/ForumCard';
import { ListingGrid } from '@/features/marketplace/components/ListingCard';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import { prettyGenreLabel } from '@/shared/hooks/useGenres';
import { formatDate } from '@/shared/lib/format';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, LoadingState, Pagination, SegmentedControl, Skeleton } from '@/shared/ui';
import { useUserForums, useUserListings, useUserProfile } from '../hooks';
import styles from './UserProfilePage.module.css';

const RESTRICTIONS = {
    canCreateListings: 'nu poate publica anunțuri',
    canCreateForums: 'nu poate crea forumuri',
    canSendMessages: 'nu poate trimite mesaje',
};

function UserListings({ userId }) {
    const listings = useUserListings(userId, true);
    if (listings.isError) return <ErrorState onRetry={listings.refetch} compact />;
    if (listings.data?.length === 0) return <EmptyState icon={<Store />} title="Niciun anunț publicat" compact />;
    return <ListingGrid listings={listings.data ?? []} loading={listings.isPending} skeletonCount={3} />;
}

function UserForums({ userId }) {
    const [page, setPage] = useState(1);
    const forums = useUserForums(userId, { page, limit: 8 }, true);
    if (forums.isError) return <ErrorState onRetry={forums.refetch} compact />;
    if (forums.data?.total === 0) return <EmptyState icon={<LayoutList />} title="Niciun forum pornit" compact />;
    return (
        <>
            <div className={styles.forums}>
                {forums.isPending
                    ? [1, 2, 3].map((key) => <Skeleton key={key} height="5rem" radius="var(--radius-lg)" />)
                    : forums.data.items.map((forum) => <ForumCard key={forum.id} forum={forum} />)}
            </div>
            <Pagination page={page} totalPages={forums.data?.totalPages} onPageChange={setPage} />
        </>
    );
}

export default function UserProfilePage() {
    const { userId } = useParams();
    const { user: currentUser } = useAuth();
    const profile = useUserProfile(userId);
    const [tab, setTab] = useState('listings');
    useDocumentTitle(profile.data?.username ?? 'Profil');

    if (profile.isError) {
        return profile.error.status === 404
            ? <EmptyState icon={<UserX />} title="Utilizatorul nu există" action={<Button to={paths.home}>Înapoi acasă</Button>} />
            : <ErrorState onRetry={profile.refetch} />;
    }
    if (profile.isPending) return <LoadingState />;

    const data = profile.data;
    const restrictions = Object.entries(RESTRICTIONS).filter(([permission]) => data.permissions[permission] === false);
    const isMe = currentUser?.id === data.id;

    return (
        <div className={styles.page}>
            <Card className={styles.hero} padding="lg">
                <div className={styles.cover} aria-hidden="true" />
                <Avatar src={data.avatarUrl} name={data.username} size="xl" className={styles.avatar} />
                <div className={styles.identity}>
                    <h1 className={styles.name}>{data.username}</h1>
                    <div className={styles.badges}>
                        {data.isAdmin && <Badge tone="primary"><ShieldCheck /> Administrator</Badge>}
                        <Badge><CalendarDays /> Membru din {formatDate(data.createdAt)}</Badge>
                    </div>
                    {data.description
                        ? <p className={styles.description}>{data.description}</p>
                        : <p className={styles.empty}>Acest cititor nu și-a scris încă descrierea.</p>}
                    {data.favoriteGenres.length > 0 && (
                        <div className={styles.genres}>
                            <span className={styles.genresLabel}>Genuri preferate</span>
                            {data.favoriteGenres.map((genre) => <Badge key={genre.code} tone="primary">{prettyGenreLabel(genre.label)}</Badge>)}
                        </div>
                    )}
                    {restrictions.length > 0 && (
                        <p className={styles.restrictions}>
                            <Lock aria-hidden="true" /> Restricționat: {restrictions.map(([, label]) => label).join(', ')}.
                        </p>
                    )}
                </div>
                {isMe && <Button variant="secondary" to={paths.profile} className={styles.edit}>Editează profilul</Button>}
            </Card>

            <SegmentedControl
                label="Activitatea utilizatorului"
                value={tab}
                onChange={setTab}
                options={[
                    { value: 'listings', label: 'Anunțuri', icon: <Store /> },
                    { value: 'forums', label: 'Forumuri', icon: <LayoutList /> },
                ]}
            />
            {tab === 'listings' ? <UserListings userId={userId} /> : <UserForums userId={userId} />}
        </div>
    );
}
