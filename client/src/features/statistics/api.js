import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http-client';
import { queryKeys } from '@/shared/lib/query-keys';

export const statisticsApi = {
    listings: () => http.get('/api/statistics/listings'),
    books: () => http.get('/api/statistics/books'),
    authors: (params) => http.get('/api/statistics/authors', { query: params }),
};

const FIVE_MINUTES = 5 * 60_000;

export const useListingStatistics = () => useQuery({
    queryKey: queryKeys.statistics.listings,
    queryFn: statisticsApi.listings,
    staleTime: FIVE_MINUTES,
});

export const useBookStatistics = () => useQuery({
    queryKey: queryKeys.statistics.books,
    queryFn: statisticsApi.books,
    staleTime: FIVE_MINUTES,
});

export const useAuthorStatistics = (search) => useQuery({
    queryKey: ['statistics', 'authors', search],
    queryFn: () => statisticsApi.authors({ search, limit: 8 }),
    enabled: search.length >= 2,
    staleTime: FIVE_MINUTES,
});
