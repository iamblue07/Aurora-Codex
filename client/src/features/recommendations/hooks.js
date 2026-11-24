import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/api/error-messages';
import { queryKeys } from '@/shared/lib/query-keys';
import { recommendationsApi } from './api';

export const useRecommendations = (enabled = true) => useQuery({
    queryKey: queryKeys.recommendations,
    queryFn: recommendationsApi.list,
    enabled,
});

export const useGenerateRecommendations = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: recommendationsApi.generate,
        onSuccess: (data) => {
            queryClient.setQueryData(queryKeys.recommendations, data);
            toast.success(data.items.length ? 'Recomandările tale sunt gata!' : 'Nu am găsit recomandări de data asta.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut genera recomandările.')),
    });
};

/** "Not interested": the book disappears at once and never comes back. */
export const useDismissRecommendation = () => {
    const queryClient = useQueryClient();
    const key = queryKeys.recommendations;
    return useMutation({
        mutationFn: (bookId) => recommendationsApi.dismiss(bookId),
        onMutate: async (bookId) => {
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData(key);
            queryClient.setQueryData(key, (data) => data && ({
                ...data,
                items: data.items.filter((item) => item.book.id !== bookId),
                dismissedCount: data.dismissedCount + 1,
            }));
            return { previous };
        },
        onSuccess: () => toast.success('Am înțeles. Nu-ți vom mai recomanda cartea asta și nici altele prea asemănătoare.'),
        onError: (error, _bookId, context) => {
            if (context?.previous) queryClient.setQueryData(key, context.previous);
            toast.error(getErrorMessage(error, 'Nu am putut ascunde cartea.'));
        },
    });
};

export const useClearDismissals = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: recommendationsApi.clearDismissals,
        onSuccess: () => {
            queryClient.setQueryData(queryKeys.recommendations, (data) => data && ({ ...data, dismissedCount: 0 }));
            toast.success('Cărțile ascunse pot apărea din nou în recomandări.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut reseta cărțile ascunse.')),
    });
};

export const useSimilarBooks = (bookId, enabled = true) => useQuery({
    queryKey: queryKeys.books.similar(bookId),
    queryFn: () => recommendationsApi.similar(bookId),
    enabled: Boolean(bookId) && enabled,
    staleTime: 10 * 60 * 1000,
});
