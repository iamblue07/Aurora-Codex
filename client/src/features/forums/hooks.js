import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/api/error-messages';
import { queryKeys } from '@/shared/lib/query-keys';
import { forumsApi } from './api';

export const useForums = (params) => useQuery({
    queryKey: queryKeys.forums.list(params),
    queryFn: ({ signal }) => forumsApi.list(params, signal),
    placeholderData: keepPreviousData,
});

export const useMyForums = (params) => useQuery({
    queryKey: queryKeys.myForums(params),
    queryFn: () => forumsApi.mine(params),
    placeholderData: keepPreviousData,
});

export const useForum = (id) => useQuery({
    queryKey: queryKeys.forums.detail(id),
    queryFn: () => forumsApi.get(id),
});

export const useForumMessages = (id, params) => useQuery({
    queryKey: queryKeys.forums.messages(id, params),
    queryFn: () => forumsApi.messages(id, params),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
});

export const useCreateForum = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: forumsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forums.all });
            queryClient.invalidateQueries({ queryKey: ['me', 'forums'] });
            toast.success('Forumul a fost creat!');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut crea forumul.')),
    });
};

export const useUpdateForum = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, changes }) => forumsApi.update(id, changes),
        onSuccess: (forum) => {
            queryClient.setQueryData(queryKeys.forums.detail(String(forum.id)), forum);
            queryClient.invalidateQueries({ queryKey: queryKeys.forums.all });
            queryClient.invalidateQueries({ queryKey: ['me', 'forums'] });
            toast.success('Forumul a fost actualizat.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut actualiza forumul.')),
    });
};

export const usePostForumMessage = (forumId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (content) => forumsApi.post(forumId, content),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forums', forumId, 'messages'] }),
        onError: (error) => toast.error(getErrorMessage(error, 'Mesajul nu a putut fi publicat.')),
    });
};
