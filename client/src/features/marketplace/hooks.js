import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/api/error-messages';
import { queryKeys } from '@/shared/lib/query-keys';
import { listingsApi } from './api';

export const useListingSearch = (params) => useQuery({
    queryKey: queryKeys.listings.search(params),
    queryFn: ({ signal }) => listingsApi.search(params, signal),
    placeholderData: keepPreviousData,
});

export const useListing = (id) => useQuery({
    queryKey: queryKeys.listings.detail(id),
    queryFn: () => listingsApi.get(id),
});

export const useMyListings = () => useQuery({
    queryKey: queryKeys.myListings,
    queryFn: listingsApi.mine,
});

export const useMyChatForListing = (id, enabled) => useQuery({
    queryKey: queryKeys.listings.myChat(id),
    queryFn: () => listingsApi.myChat(id),
    enabled,
});

/** Invalidates every cached list that may contain the changed listing. */
const useInvalidateListings = () => {
    const queryClient = useQueryClient();
    return (listing) => {
        if (listing) queryClient.setQueryData(queryKeys.listings.detail(listing.id), listing);
        queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.myListings });
    };
};

export const useCreateListing = () => {
    const invalidate = useInvalidateListings();
    return useMutation({
        mutationFn: listingsApi.create,
        onSuccess: (listing) => {
            invalidate(listing);
            toast.success('Anunțul tău a fost publicat!');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut publica anunțul. Verifică datele introduse.')),
    });
};

export const useUpdateListing = () => {
    const invalidate = useInvalidateListings();
    return useMutation({
        mutationFn: ({ id, changes }) => listingsApi.update(id, changes),
        onSuccess: (listing) => {
            invalidate(listing);
            toast.success('Anunțul a fost actualizat.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut actualiza anunțul.')),
    });
};

export const useCloseListing = () => {
    const invalidate = useInvalidateListings();
    return useMutation({
        mutationFn: listingsApi.close,
        onSuccess: (listing) => {
            invalidate(listing);
            toast.success('Anunțul a fost marcat ca vândut / închis.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut închide anunțul.')),
    });
};

export const useDeleteListing = () => {
    const invalidate = useInvalidateListings();
    return useMutation({
        mutationFn: listingsApi.remove,
        onSuccess: () => {
            invalidate();
            toast.success('Anunțul a fost șters.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut șterge anunțul.')),
    });
};

export const useStartChat = (listingId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (message) => listingsApi.startChat(listingId, message),
        onSuccess: (chat) => {
            queryClient.setQueryData(queryKeys.listings.myChat(listingId), { chat });
            queryClient.invalidateQueries({ queryKey: queryKeys.myChats });
            toast.success('Mesajul a fost trimis vânzătorului.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut trimite mesajul.')),
    });
};
