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
        onSuccess: (books) => {
            queryClient.setQueryData(queryKeys.recommendations, books);
            toast.success(books.length ? 'Recomandările tale sunt gata!' : 'Nu am găsit recomandări de data asta.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut genera recomandările.')),
    });
};
