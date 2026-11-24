import { LayoutList, Plus } from 'lucide-react';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { Button, EmptyState, ErrorState, PageHeader, Pagination } from '@/shared/ui';
import ThreadList from '../components/ThreadList';
import { THREADS_PER_PAGE } from '../constants';
import { useMyForums } from '../hooks';

const DEFAULT_FILTERS = { page: 1 };

/** Threads the signed-in user started; each is managed (rename, close) from its own page. */
export default function MyForumsPage() {
    useDocumentTitle('Discuțiile mele');
    const { permissions } = useAuth();
    const [filters, setFilters] = useSearchParamsState(DEFAULT_FILTERS);
    const forums = useMyForums({ page: filters.page, limit: THREADS_PER_PAGE });
    const canCreate = permissions.canCreateForums !== false;
    const newButton = canCreate && <Button leftIcon={<Plus />} to={paths.newThread}>Discuție nouă</Button>;

    return (
        <div>
            <PageHeader
                eyebrow="Forumuri"
                title="Discuțiile mele"
                subtitle="Discuțiile pe care le-ai pornit. Deschide una pentru a o redenumi sau a o închide."
                actions={newButton}
            />

            {forums.isError ? <ErrorState onRetry={forums.refetch} /> : forums.data?.total === 0 ? (
                <EmptyState icon={<LayoutList />} title="Nu ai pornit încă nicio discuție" action={newButton} />
            ) : (
                <ThreadList threads={forums.data?.items ?? []} loading={forums.isPending} showCategory skeletonCount={4} />
            )}

            <Pagination page={filters.page} totalPages={forums.data?.totalPages} onPageChange={(page) => setFilters({ page })} />
        </div>
    );
}
