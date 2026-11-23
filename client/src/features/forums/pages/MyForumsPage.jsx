import { Check, LayoutList, Lock, LockOpen, Pencil, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { formatDate } from '@/shared/lib/format';
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, Input, PageHeader, Pagination, Skeleton } from '@/shared/ui';
import CreateForumModal from '../components/CreateForumModal';
import { useMyForums, useUpdateForum } from '../hooks';
import styles from './MyForumsPage.module.css';

const PAGE_SIZE = 10;
const DEFAULT_FILTERS = { page: 1 };

function ForumRow({ forum }) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(forum.title);
    const update = useUpdateForum();

    const save = () => {
        if (title.trim().length < 3 || title.trim() === forum.title) {
            setEditing(false);
            return;
        }
        update.mutate({ id: forum.id, changes: { title: title.trim() } }, { onSuccess: () => setEditing(false) });
    };

    return (
        <Card as="li" padding="sm" className={styles.row}>
            {editing ? (
                <form className={styles.edit} onSubmit={(event) => { event.preventDefault(); save(); }}>
                    <Input aria-label="Titlul forumului" value={title} maxLength={255} autoFocus onChange={(event) => setTitle(event.target.value)} />
                    <IconButton type="submit" label="Salvează" variant="primary" disabled={update.isPending}><Check /></IconButton>
                    <IconButton label="Renunță" onClick={() => { setTitle(forum.title); setEditing(false); }}><X /></IconButton>
                </form>
            ) : (
                <div className={styles.info}>
                    <Link to={paths.forum(forum.id)} className={styles.title}>{forum.title}</Link>
                    <span className={styles.date}>Creat pe {formatDate(forum.createdAt)}</span>
                </div>
            )}
            {!editing && (
                <div className={styles.actions}>
                    <Badge tone={forum.isOpen ? 'success' : 'neutral'} dot>{forum.isOpen ? 'Deschis' : 'Închis'}</Badge>
                    <IconButton label="Redenumește" onClick={() => setEditing(true)}><Pencil /></IconButton>
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={forum.isOpen ? <Lock /> : <LockOpen />}
                        loading={update.isPending}
                        onClick={() => update.mutate({ id: forum.id, changes: { isOpen: !forum.isOpen } })}
                    >
                        {forum.isOpen ? 'Închide' : 'Redeschide'}
                    </Button>
                </div>
            )}
        </Card>
    );
}

export default function MyForumsPage() {
    useDocumentTitle('Forumurile mele');
    const { permissions } = useAuth();
    const [filters, setFilters] = useSearchParamsState(DEFAULT_FILTERS);
    const [creating, setCreating] = useState(false);
    const forums = useMyForums({ page: filters.page, limit: PAGE_SIZE });
    const canCreate = permissions.canCreateForums !== false;

    return (
        <div>
            <PageHeader
                eyebrow="Comunitate"
                title="Forumurile mele"
                subtitle="Redenumește discuțiile pe care le-ai pornit sau închide-le când și-au atins scopul."
                actions={canCreate && <Button leftIcon={<Plus />} onClick={() => setCreating(true)}>Forum nou</Button>}
            />

            {forums.isError ? <ErrorState onRetry={forums.refetch} /> : forums.data?.total === 0 ? (
                <EmptyState
                    icon={<LayoutList />}
                    title="Nu ai pornit încă nicio discuție"
                    action={canCreate && <Button leftIcon={<Plus />} onClick={() => setCreating(true)}>Pornește un forum</Button>}
                />
            ) : (
                <ul className={styles.list} role="list">
                    {forums.isPending
                        ? Array.from({ length: 4 }, (_, index) => <li key={index}><Skeleton height="4.5rem" radius="var(--radius-lg)" /></li>)
                        : forums.data.items.map((forum) => <ForumRow key={forum.id} forum={forum} />)}
                </ul>
            )}

            <Pagination page={filters.page} totalPages={forums.data?.totalPages} onPageChange={(page) => setFilters({ page })} />
            <CreateForumModal open={creating} onClose={() => setCreating(false)} />
        </div>
    );
}
