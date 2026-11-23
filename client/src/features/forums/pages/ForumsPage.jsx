import { LayoutList, MessagesSquare, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import useDebouncedValue from '@/shared/hooks/useDebouncedValue';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { Button, EmptyState, ErrorState, Input, PageHeader, Pagination, Skeleton } from '@/shared/ui';
import CreateForumModal from '../components/CreateForumModal';
import ForumCard from '../components/ForumCard';
import { useForums } from '../hooks';
import styles from './ForumsPage.module.css';

const PAGE_SIZE = 12;
const DEFAULT_FILTERS = { q: '', page: 1 };

export default function ForumsPage() {
    useDocumentTitle('Forumuri');
    const { isAuthenticated, permissions } = useAuth();
    const [filters, setFilters] = useSearchParamsState(DEFAULT_FILTERS);
    const [search, setSearch] = useState(filters.q);
    const debouncedSearch = useDebouncedValue(search.trim());
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (debouncedSearch !== filters.q) setFilters({ q: debouncedSearch });
    }, [debouncedSearch, filters.q, setFilters]);

    const forums = useForums({ search: filters.q, page: filters.page, limit: PAGE_SIZE });
    const canCreate = isAuthenticated && permissions.canCreateForums !== false;

    return (
        <div>
            <PageHeader
                eyebrow="Comunitate"
                title="Forumuri"
                subtitle="Discută despre cărțile preferate, cere recomandări și descoperă ce citesc ceilalți."
                actions={isAuthenticated && (
                    <>
                        <Button variant="secondary" leftIcon={<LayoutList />} to={paths.myForums}>Forumurile mele</Button>
                        {canCreate && <Button leftIcon={<Plus />} onClick={() => setCreating(true)}>Forum nou</Button>}
                    </>
                )}
            />

            <Input
                className={styles.search}
                aria-label="Caută un forum"
                placeholder="Caută un forum…"
                leadingIcon={<Search />}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
            />

            {isAuthenticated && permissions.canCreateForums === false && (
                <p className={styles.notice}>Dreptul tău de a crea forumuri a fost retras de un administrator, în urma încălcării regulamentului.</p>
            )}

            {forums.isError ? <ErrorState onRetry={forums.refetch} /> : forums.data?.total === 0 ? (
                <EmptyState
                    icon={<MessagesSquare />}
                    title={filters.q ? 'Niciun forum găsit' : 'Încă nu există forumuri'}
                    description={filters.q ? 'Încearcă alți termeni de căutare.' : 'Pornește prima discuție a comunității!'}
                    action={canCreate && <Button leftIcon={<Plus />} onClick={() => setCreating(true)}>Forum nou</Button>}
                />
            ) : (
                <div className={styles.list}>
                    {forums.isPending
                        ? Array.from({ length: 6 }, (_, index) => <Skeleton key={index} height="5rem" radius="var(--radius-lg)" />)
                        : forums.data.items.map((forum) => <ForumCard key={forum.id} forum={forum} />)}
                </div>
            )}

            <Pagination page={filters.page} totalPages={forums.data?.totalPages} onPageChange={(page) => setFilters({ page })} />
            <CreateForumModal open={creating} onClose={() => setCreating(false)} />
        </div>
    );
}
