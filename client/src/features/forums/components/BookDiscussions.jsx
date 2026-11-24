import { MessagesSquare, Plus } from 'lucide-react';
import { paths } from '@/app/paths';
import { Button, EmptyState, ErrorState } from '@/shared/ui';
import { useForums } from '../hooks';
import ThreadList from './ThreadList';
import styles from './BookDiscussions.module.css';

const LIMIT = 5;

/** Forum threads linked to one catalogue book, shown on the book's page. */
export default function BookDiscussions({ bookId, titleClassName }) {
    const threads = useForums({ book: bookId, sort: 'activity', limit: LIMIT });
    const newThreadLink = `${paths.newThread}?carte=${bookId}`;

    return (
        <section className={styles.section}>
            <div className={styles.header}>
                <h2 className={titleClassName}>Discuții despre carte</h2>
                <Button variant="secondary" size="sm" leftIcon={<Plus />} to={newThreadLink}>Discuție nouă</Button>
            </div>
            {threads.isError ? <ErrorState onRetry={threads.refetch} compact /> : threads.data?.total === 0 ? (
                <EmptyState
                    icon={<MessagesSquare />}
                    title="Nimeni nu a discutat încă despre această carte"
                    description="Pornește prima discuție și află ce cred ceilalți cititori."
                    compact
                />
            ) : (
                <ThreadList threads={threads.data?.items ?? []} loading={threads.isPending} showCategory skeletonCount={2} />
            )}
            {threads.data?.total > LIMIT && (
                <p className={styles.more}>și încă {threads.data.total - LIMIT} discuții mai vechi</p>
            )}
        </section>
    );
}
