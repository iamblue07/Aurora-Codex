import { MessagesSquare, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { paths } from '@/app/paths';
import useDebouncedValue from '@/shared/hooks/useDebouncedValue';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useSearchParamsState from '@/shared/hooks/useSearchParamsState';
import { formatCount } from '@/shared/lib/format';
import { Button, EmptyState, ErrorState, Input, Pagination, Select, Skeleton } from '@/shared/ui';
import Breadcrumbs from '../components/Breadcrumbs';
import CategoryIcon from '../components/CategoryIcon';
import ThreadList from '../components/ThreadList';
import { THREAD_SORTS, THREADS_PER_PAGE } from '../constants';
import { useForums } from '../hooks';
import styles from './ForumCategoryPage.module.css';

const DEFAULT_FILTERS = { search: '', sort: 'activity', page: 1 };
const ALL = 'toate';

/** Threads of one category (or of all of them, for `/forumuri/categorie/toate`). */
export default function ForumCategoryPage() {
    const { slug } = useParams();
    const isAll = slug === ALL;
    const [filters, setFilters] = useSearchParamsState(DEFAULT_FILTERS);
    const [searchDraft, setSearchDraft] = useState(filters.search);
    const debouncedSearch = useDebouncedValue(searchDraft, 350);

    useEffect(() => {
        if (debouncedSearch.trim() !== filters.search) setFilters({ search: debouncedSearch.trim() });
        // Only the typed text drives this; filters are written from here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const threads = useForums({
        category: isAll ? undefined : slug,
        search: filters.search || undefined,
        sort: filters.sort,
        page: filters.page,
        limit: THREADS_PER_PAGE,
    });
    const category = threads.data?.category;
    const title = isAll ? 'Toate discuțiile' : category?.name;
    useDocumentTitle(title ?? 'Forumuri');

    if (threads.isError && threads.error.status === 404) {
        return (
            <EmptyState
                icon={<MessagesSquare />}
                title="Categoria nu există"
                action={<Button to={paths.forums}>Înapoi la forumuri</Button>}
            />
        );
    }

    return (
        <div className={styles.page}>
            <Breadcrumbs items={[{ label: 'Forumuri', to: paths.forums }, { label: title ?? '…' }]} />

            <header className={styles.header}>
                {isAll ? <CategoryIcon category={{ slug: 'toate', icon: 'messages-square' }} size="lg" /> : <CategoryIcon category={category} size="lg" />}
                <div className={styles.headerText}>
                    {title ? <h1 className={styles.title}>{title}</h1> : <Skeleton width="14rem" height="2.2rem" />}
                    <p className={styles.description}>
                        {isAll ? 'Toate discuțiile din toate categoriile.' : category?.description}
                    </p>
                </div>
                <Button
                    leftIcon={<Plus />}
                    to={isAll || !category ? paths.newThread : `${paths.newThread}?categorie=${category.slug}`}
                    className={styles.newButton}
                >
                    Discuție nouă
                </Button>
            </header>

            <div className={styles.toolbar}>
                <Input
                    className={styles.search}
                    aria-label="Caută după titlu"
                    placeholder="Caută după titlu…"
                    leadingIcon={<Search />}
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                />
                <Select aria-label="Ordonează" className={styles.sort} value={filters.sort} onChange={(event) => setFilters({ sort: event.target.value })}>
                    {THREAD_SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
                {threads.data && <span className={styles.count}>{formatCount(threads.data.total)} discuții</span>}
            </div>

            {threads.isError ? <ErrorState onRetry={threads.refetch} /> : threads.data?.total === 0 ? (
                <EmptyState
                    icon={<MessagesSquare />}
                    title={filters.search ? 'Nicio discuție nu se potrivește căutării' : 'Nicio discuție aici încă'}
                    description={filters.search ? 'Încearcă alte cuvinte.' : 'Fii primul care pornește o discuție în această categorie.'}
                    action={!filters.search && <Button leftIcon={<Plus />} to={paths.newThread}>Discuție nouă</Button>}
                />
            ) : (
                <ThreadList threads={threads.data?.items ?? []} loading={threads.isPending} showCategory={isAll} />
            )}

            <Pagination page={filters.page} totalPages={threads.data?.totalPages} onPageChange={(page) => setFilters({ page })} />
        </div>
    );
}
