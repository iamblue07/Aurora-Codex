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

export const useListingCities = () => useQuery({
    queryKey: queryKeys.listings.cities,
    queryFn: listingsApi.cities,
    staleTime: 10 * 60 * 1000,
});

export const useListing = (id) => useQuery({
    queryKey: queryKeys.listings.detail(id),
    queryFn: () => listingsApi.get(id),
});

export const useSimilarListings = (id, enabled = true) => useQuery({
    queryKey: queryKeys.listings.similar(id),
    queryFn: () => listingsApi.similar(id),
    enabled,
});

export const useMyListings = () => useQuery({
    queryKey: queryKeys.myListings,
    queryFn: listingsApi.mine,
});

export const useFavoriteListings = (params, enabled = true) => useQuery({
    queryKey: queryKeys.myFavoriteListings(params),
    queryFn: () => listingsApi.favorites(params),
    placeholderData: keepPreviousData,
    enabled,
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
        if (listing) queryClient.setQueryData(queryKeys.listings.detail(String(listing.id)), listing);
        queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.myListings });
        queryClient.invalidateQueries({ queryKey: ['me', 'favorite-listings'] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['books'] });
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

export const useUpdateListing = ({ successMessage = 'Anunțul a fost actualizat.' } = {}) => {
    const invalidate = useInvalidateListings();
    return useMutation({
        mutationFn: ({ id, changes }) => listingsApi.update(id, changes),
        onSuccess: (listing) => {
            invalidate(listing);
            if (successMessage) toast.success(successMessage);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut actualiza anunțul.')),
    });
};

/** Photo changes on an existing listing: add, remove or pick the cover. */
export const useListingImages = (listingId) => {
    const invalidate = useInvalidateListings();
    const onError = (error) => toast.error(getErrorMessage(error, 'Nu am putut actualiza fotografiile.'));
    return {
        add: useMutation({ mutationFn: (formData) => listingsApi.addImages(listingId, formData), onSuccess: invalidate, onError }),
        remove: useMutation({ mutationFn: (imageId) => listingsApi.removeImage(listingId, imageId), onSuccess: invalidate, onError }),
        setCover: useMutation({ mutationFn: (imageId) => listingsApi.setCover(listingId, imageId), onSuccess: invalidate, onError }),
    };
};

export const useCloseListing = () => {
    const invalidate = useInvalidateListings();
    return useMutation({
        mutationFn: listingsApi.close,
        onSuccess: (listing) => {
            invalidate(listing);
            toast.success('Anunțul a fost marcat ca vândut.');
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

/** Applies `patch(listing)` to the listing wherever it is cached (pages, lists, grids). */
const patchCachedListing = (queryClient, listingId, patch) => {
    const update = (listing) => (listing?.id === listingId ? { ...listing, ...patch(listing) } : listing);
    const visit = (data) => {
        if (!data || typeof data !== 'object') return data;
        if (Array.isArray(data)) return data.map(update);
        if (Array.isArray(data.items)) return { ...data, items: data.items.map(update) };
        return update(data);
    };
    queryClient.setQueriesData({ queryKey: queryKeys.listings.all }, visit);
    // Listing grids elsewhere (a user's or a book's listings); other user/book data is left alone.
    const isListingGrid = (query) => ['users', 'books'].includes(query.queryKey[0]) && query.queryKey[2] === 'listings';
    queryClient.setQueriesData({ predicate: isListingGrid }, visit);
};

/** Save / un-save a listing. Updates instantly, then takes the server's count. */
export const useToggleFavorite = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, favorite }) => listingsApi.setFavorite(id, favorite),
        onMutate: ({ id, favorite }) => {
            patchCachedListing(queryClient, id, (listing) => ({
                isFavorite: favorite,
                favoriteCount: Math.max(0, (listing.favoriteCount ?? 0) + (favorite ? 1 : -1)),
            }));
        },
        onSuccess: (result, { id, favorite }) => {
            patchCachedListing(queryClient, id, () => result);
            queryClient.invalidateQueries({ queryKey: ['me', 'favorite-listings'] });
            toast.success(favorite ? 'Anunț salvat la favorite.' : 'Anunț scos de la favorite.');
        },
        onError: (error, { id, favorite }) => {
            patchCachedListing(queryClient, id, (listing) => ({
                isFavorite: !favorite,
                favoriteCount: Math.max(0, (listing.favoriteCount ?? 0) + (favorite ? -1 : 1)),
            }));
            toast.error(getErrorMessage(error, 'Nu am putut salva anunțul.'));
        },
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
