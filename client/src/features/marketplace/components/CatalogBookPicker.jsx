import { useQuery } from '@tanstack/react-query';
import { Link2, Search, X } from 'lucide-react';
import { useState } from 'react';
import { booksApi } from '@/features/books/api';
import BookCover from '@/features/books/components/BookCover';
import useDebouncedValue from '@/shared/hooks/useDebouncedValue';
import { queryKeys } from '@/shared/lib/query-keys';
import { IconButton, Input, Spinner } from '@/shared/ui';
import styles from './CatalogBookPicker.module.css';

/**
 * Optional link between a listing and a catalogue book (search-as-you-type).
 * Linked listings appear on the book's page next to the bookstore offers.
 */
export default function CatalogBookPicker({
    value,
    onChange,
    label = 'Este o carte din catalog? (opțional)',
    hint = 'Asocierea ajută cumpărătorii să compare prețul tău cu cel din librării.',
}) {
    const [query, setQuery] = useState('');
    const debounced = useDebouncedValue(query.trim(), 350);

    const results = useQuery({
        queryKey: queryKeys.books.lookup({ query: debounced }),
        queryFn: ({ signal }) => booksApi.lookup({ query: debounced, limit: 6 }, signal),
        enabled: debounced.length >= 2 && !value,
    });

    if (value) {
        return (
            <div className={styles.selected}>
                <BookCover src={value.coverUrl} title={value.title} size="sm" className={styles.thumb} />
                <div className={styles.selectedText}>
                    <span className={styles.selectedLabel}><Link2 aria-hidden="true" /> Carte asociată</span>
                    <strong>{value.title}</strong>
                    <span className={styles.author}>{value.author ?? 'Autor necunoscut'}</span>
                </div>
                <IconButton label="Elimină asocierea" onClick={() => onChange(null)}><X /></IconButton>
            </div>
        );
    }

    return (
        <div className={styles.picker}>
            <Input
                label={label}
                hint={hint}
                placeholder="Caută titlul în catalog…"
                leadingIcon={<Search />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                trailing={results.isFetching && <Spinner size="sm" className={styles.spinner} />}
            />
            {results.data?.items.length > 0 && (
                <ul className={styles.results} role="listbox" aria-label="Cărți găsite">
                    {results.data.items.map((book) => (
                        <li key={book.id}>
                            <button type="button" className={styles.result} onClick={() => { onChange(book); setQuery(''); }}>
                                <BookCover src={book.coverUrl} title={book.title} size="sm" className={styles.thumb} />
                                <span className={styles.resultText}>
                                    <strong>{book.title}</strong>
                                    <span className={styles.author}>{book.author ?? 'Autor necunoscut'}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {results.data?.items.length === 0 && <p className={styles.empty}>Nicio carte găsită pentru „{debounced}”.</p>}
        </div>
    );
}
