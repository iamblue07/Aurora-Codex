import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http-client';
import { queryKeys } from '@/shared/lib/query-keys';

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Optional features the server currently offers (e.g. `recommendations` once an AI key is set
 * and book embeddings exist). Decided at runtime, so no rebuild is needed to switch them on.
 */
export default function useFeatures() {
    const query = useQuery({
        queryKey: queryKeys.features,
        queryFn: () => http.get('/api/features', { auth: false }),
        staleTime: FIVE_MINUTES,
    });
    return { ...query, features: query.data ?? { recommendations: false, similarBooks: false } };
}
