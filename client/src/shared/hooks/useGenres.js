import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { http } from '@/shared/api/http-client';
import { queryKeys } from '@/shared/lib/query-keys';

/** Title-cases the shouty labels stored by the bookstore ("POEZIE, TEATRU" -> "Poezie, teatru"). */
export const prettyGenreLabel = (label = '') => {
    const lower = label.toLocaleLowerCase('ro-RO');
    return lower.charAt(0).toLocaleUpperCase('ro-RO') + lower.slice(1);
};

/**
 * The genre catalogue (`[{ code, label }]`) from the API. It never changes at runtime,
 * so it is fetched once and cached for the whole session.
 */
export default function useGenres() {
    const query = useQuery({
        queryKey: queryKeys.genres,
        queryFn: () => http.get('/api/genres'),
        staleTime: Infinity,
        gcTime: Infinity,
    });

    const genres = useMemo(
        () => (query.data ?? [])
            .map((genre) => ({ ...genre, label: prettyGenreLabel(genre.label) }))
            .sort((a, b) => a.label.localeCompare(b.label, 'ro')),
        [query.data],
    );

    return { ...query, genres };
}
