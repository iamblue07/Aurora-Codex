import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/api/error-messages';
import { queryKeys } from '@/shared/lib/query-keys';
import { booksApi } from './api';

export const useBookSearch = (params) => useQuery({
    queryKey: queryKeys.books.search(params),
    queryFn: ({ signal }) => booksApi.search(params, signal),
    placeholderData: keepPreviousData,
});

export const useRandomBooks = () => useQuery({
    queryKey: queryKeys.books.random,
    queryFn: booksApi.random,
    staleTime: 10 * 60_000,
});

export const useBook = (id, { enabled = true } = {}) => useQuery({
    queryKey: queryKeys.books.detail(id),
    queryFn: () => booksApi.get(id),
    enabled,
});

export const useBookOffers = (id) => useQuery({
    queryKey: queryKeys.books.offers(id),
    queryFn: () => booksApi.offers(id),
});

export const useBookListings = (id, enabled = true) => useQuery({
    queryKey: queryKeys.books.listings(id),
    queryFn: () => booksApi.listings(id),
    enabled,
});

/** Extra metadata looked up by the server (Google Books); `null` when unknown. */
export const useExternalBookInfo = (id, enabled) => useQuery({
    queryKey: queryKeys.books.externalInfo(id),
    queryFn: () => booksApi.externalInfo(id),
    enabled,
    staleTime: Infinity,
    retry: false,
});

export const useBookRating = (id, enabled) => useQuery({
    queryKey: queryKeys.books.rating(id),
    queryFn: () => booksApi.rating(id),
    enabled,
});

/** Rate a book (marks it as read); updates the rating cache optimistically. */
export const useRateBook = (id) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (rating) => booksApi.rate(id, rating),
        onMutate: async (rating) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.books.rating(id) });
            const previous = queryClient.getQueryData(queryKeys.books.rating(id));
            queryClient.setQueryData(queryKeys.books.rating(id), { isRead: true, rating });
            return { previous };
        },
        onError: (error, _rating, context) => {
            queryClient.setQueryData(queryKeys.books.rating(id), context?.previous);
            toast.error(getErrorMessage(error, 'Nu am putut salva nota.'));
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.readingHistory }),
    });
};

export const useRemoveRating = (id) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => booksApi.removeRating(id),
        onSuccess: () => {
            queryClient.setQueryData(queryKeys.books.rating(id), { isRead: false, rating: null });
            queryClient.invalidateQueries({ queryKey: queryKeys.readingHistory });
            toast.success('Cartea a fost scoasă din istoricul tău.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut actualiza istoricul.')),
    });
};
