import { LayoutList, MessagesSquare, Plus, Search, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import { formatCount, formatDateTime, formatRelativeTime } from '@/shared/lib/format';
import { Avatar, Button, ErrorState, Input, PageHeader, Skeleton } from '@/shared/ui';
import CategoryIcon from '../components/CategoryIcon';
import ThreadList from '../components/ThreadList';
import { useForumBoard, useForums } from '../hooks';
import styles from './ForumsPage.module.css';

const RECENT_PARAMS = { sort: 'activity', limit: 8 };

function CategoryRow({ category }) {
    const latest = category.latestThread;
    return (
        <li className={styles.category}>
            <CategoryIcon category={category} size="lg" />
            <div className={styles.categoryText}>
                <Link to={paths.forumCategory(category.slug)} className={styles.categoryName}>{category.name}</Link>
                <p className={styles.categoryDescription}>{category.description}</p>
            </div>
            <dl className={styles.categoryStats}>
                <div><dt>Discuții</dt><dd>{formatCount(category.threadCount)}</dd></div>
                <div><dt>Mesaje</dt><dd>{formatCount(category.postCount)}</dd></div>
            </dl>
            <div className={styles.latest}>
                {latest ? (
                    <>
                        <Avatar src={latest.lastPostAuthor?.avatarUrl} name={latest.lastPostAuthor?.username ?? '?'} size="sm" />
                        <div className={styles.latestText}>
                            <Link to={paths.forum(latest.id)} className={styles.latestTitle}>{latest.title}</Link>
                            <span className={styles.latestMeta}>
                                {latest.lastPostAuthor?.username ?? 'utilizator șters'} ·{' '}
                                <time dateTime={latest.lastPostAt} title={formatDateTime(latest.lastPostAt)}>
                                    {formatRelativeTime(latest.lastPostAt)}
                                </time>
                            </span>
                        </div>
                    </>
                ) : <span className={styles.latestMeta}>Nicio discuție încă</span>}
            </div>
        </li>
    );
}

/** The board: categories with their activity, plus the most recently active threads. */
export default function ForumsPage() {
    useDocumentTitle('Forumuri');
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const board = useForumBoard();
    const recent = useForums(RECENT_PARAMS);

    const submitSearch = (event) => {
        event.preventDefault();
        const query = search.trim();
        navigate(query ? `${paths.forumCategory('toate')}?search=${encodeURIComponent(query)}` : paths.forumCategory('toate'));
    };

    return (
        <div className={styles.page}>
            <PageHeader
                eyebrow="Comunitate"
                title="Forumuri"
                subtitle="Discută despre cărți, cere recomandări, organizează lecturi comune și află ce citesc ceilalți."
                actions={(
                    <>
                        {isAuthenticated && <Button variant="soft" leftIcon={<LayoutList />} to={paths.myForums}>Discuțiile mele</Button>}
                        <Button leftIcon={<Plus />} to={paths.newThread}>Discuție nouă</Button>
                    </>
                )}
            />

            <div className={styles.toolbar}>
                <form className={styles.search} onSubmit={submitSearch} role="search">
                    <Input
                        aria-label="Caută în forumuri"
                        placeholder="Caută o discuție…"
                        leadingIcon={<Search />}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <Button type="submit" variant="neutral">Caută</Button>
                </form>
                {board.data && (
                    <ul className={styles.stats} aria-label="Statistici">
                        <li><MessagesSquare aria-hidden="true" /><strong>{formatCount(board.data.stats.threads)}</strong> discuții</li>
                        <li><LayoutList aria-hidden="true" /><strong>{formatCount(board.data.stats.posts)}</strong> mesaje</li>
                        <li><Users aria-hidden="true" /><strong>{formatCount(board.data.stats.members)}</strong> membri activi</li>
                    </ul>
                )}
            </div>

            <section aria-labelledby="board" className={styles.board}>
                <div className={styles.boardHead}>
                    <h2 id="board" className={styles.boardTitle}>Categorii</h2>
                    <Link to={paths.forumCategory('toate')} className={styles.allLink}>Toate discuțiile →</Link>
                </div>
                {board.isError ? <ErrorState onRetry={board.refetch} compact /> : (
                    <ul className={styles.categories} role="list">
                        {board.isPending
                            ? Array.from({ length: 6 }, (_, index) => <li key={index} className={styles.category}><Skeleton height="3.5rem" className={styles.wide} /></li>)
                            : board.data.categories.map((category) => <CategoryRow key={category.id} category={category} />)}
                    </ul>
                )}
            </section>

            <section aria-labelledby="recent">
                <div className={styles.boardHead}>
                    <h2 id="recent" className={styles.boardTitle}>Discuții recente</h2>
                </div>
                {recent.isError
                    ? <ErrorState onRetry={recent.refetch} compact />
                    : <ThreadList threads={recent.data?.items ?? []} loading={recent.isPending} showCategory skeletonCount={5} />}
            </section>
        </div>
    );
}
