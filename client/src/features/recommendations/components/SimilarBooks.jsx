import clsx from 'clsx';
import { Sparkles } from 'lucide-react';
import BookGrid from '@/features/books/components/BookGrid';
import useFeatures from '@/shared/hooks/useFeatures';
import { useSimilarBooks } from '../hooks';
import styles from './SimilarBooks.module.css';

/**
 * "Similar books" on a book page: its closest neighbours in meaning, from the stored embeddings
 * (no AI call). Hidden when the catalogue has no embeddings or the book has none.
 */
export default function SimilarBooks({ bookId, titleClassName }) {
    const { features } = useFeatures();
    const similar = useSimilarBooks(bookId, features.similarBooks);
    if (!features.similarBooks || similar.isError || similar.data?.length === 0) return null;

    return (
        <section className={styles.section}>
            <h2 className={clsx(titleClassName, styles.title)}>
                <Sparkles aria-hidden="true" className={styles.icon} /> Cărți asemănătoare
            </h2>
            <p className={styles.hint}>Alese de inteligența artificială după tema și atmosfera descrierii.</p>
            <BookGrid books={similar.data ?? []} loading={similar.isPending} skeletonCount={6} />
        </section>
    );
}
