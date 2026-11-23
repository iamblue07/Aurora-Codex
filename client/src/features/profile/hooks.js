import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/api/error-messages';
import { queryKeys } from '@/shared/lib/query-keys';
import { accountApi, usersApi } from './api';

/** Updates the cached account (`GET /api/me`) with the server's response. */
const useSetAccount = () => {
    const queryClient = useQueryClient();
    return (account) => queryClient.setQueryData(queryKeys.me, account);
};

export const useUpdateAccount = () => {
    const setAccount = useSetAccount();
    return useMutation({
        mutationFn: accountApi.update,
        onSuccess: (account) => {
            setAccount(account);
            toast.success('Descrierea a fost salvată.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut salva descrierea.')),
    });
};

export const useUploadAvatar = () => {
    const setAccount = useSetAccount();
    return useMutation({
        mutationFn: accountApi.uploadAvatar,
        onSuccess: (account) => {
            setAccount(account);
            toast.success('Fotografia de profil a fost actualizată.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Imaginea nu a putut fi încărcată (JPG, PNG sau WebP, maximum 10 MB).')),
    });
};

export const useChangePassword = () => useMutation({
    mutationFn: accountApi.changePassword,
    onSuccess: () => toast.success('Parola a fost schimbată.'),
    onError: (error) => toast.error(error.status === 401 ? 'Parola curentă nu este corectă.' : getErrorMessage(error, 'Nu am putut schimba parola.')),
});

export const useFavoriteGenres = () => useQuery({
    queryKey: queryKeys.favoriteGenres,
    queryFn: accountApi.favoriteGenres,
    select: (data) => data.genres.map((genre) => genre.code),
});

export const useSaveFavoriteGenres = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: accountApi.setFavoriteGenres,
        onSuccess: (data) => {
            queryClient.setQueryData(queryKeys.favoriteGenres, data);
            toast.success('Preferințele au fost salvate.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut salva preferințele.')),
    });
};

export const useReadingHistory = () => useQuery({
    queryKey: queryKeys.readingHistory,
    queryFn: accountApi.readingHistory,
});

export const useUserProfile = (id) => useQuery({
    queryKey: queryKeys.users.profile(id),
    queryFn: () => usersApi.profile(id),
});

export const useUserListings = (id, enabled) => useQuery({
    queryKey: queryKeys.users.listings(id),
    queryFn: () => usersApi.listings(id),
    enabled,
});

export const useUserForums = (id, params, enabled) => useQuery({
    queryKey: queryKeys.users.forums(id, params),
    queryFn: () => usersApi.forums(id, params),
    enabled,
    placeholderData: keepPreviousData,
});
