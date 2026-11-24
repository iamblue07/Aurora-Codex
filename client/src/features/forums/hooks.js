import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/api/error-messages';
import { queryKeys } from '@/shared/lib/query-keys';
import { forumsApi } from './api';

export const useForumBoard = () => useQuery({
    queryKey: queryKeys.forums.board,
    queryFn: forumsApi.board,
});

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

/** Refreshes everything a forum write can change: thread lists, the board and the thread. */
const useInvalidateForums = () => {
    const queryClient = useQueryClient();
    return (forumId) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.forums.all });
        queryClient.invalidateQueries({ queryKey: ['me', 'forums'] });
        if (forumId) queryClient.invalidateQueries({ queryKey: queryKeys.forums.detail(String(forumId)) });
    };
};

export const useCreateForum = () => {
    const invalidate = useInvalidateForums();
    return useMutation({
        mutationFn: forumsApi.create,
        onSuccess: () => {
            invalidate();
            toast.success('Discuția a fost publicată!');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut publica discuția.')),
    });
};

export const useUpdateForum = () => {
    const queryClient = useQueryClient();
    const invalidate = useInvalidateForums();
    return useMutation({
        mutationFn: ({ id, changes }) => forumsApi.update(id, changes),
        onSuccess: (forum) => {
            queryClient.setQueryData(queryKeys.forums.detail(String(forum.id)), forum);
            invalidate();
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut actualiza discuția.')),
    });
};

export const usePostForumMessage = (forumId) => {
    const invalidate = useInvalidateForums();
    return useMutation({
        mutationFn: (post) => forumsApi.post(forumId, post),
        onSuccess: () => invalidate(forumId),
        onError: (error) => toast.error(getErrorMessage(error, 'Mesajul nu a putut fi publicat.')),
    });
};

export const useEditForumMessage = (forumId) => {
    const invalidate = useInvalidateForums();
    return useMutation({
        mutationFn: ({ messageId, content }) => forumsApi.editMessage(messageId, content),
        onSuccess: () => {
            invalidate(forumId);
            toast.success('Mesajul a fost actualizat.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Mesajul nu a putut fi modificat.')),
    });
};

export const useDeleteForumMessage = (forumId) => {
    const invalidate = useInvalidateForums();
    return useMutation({
        mutationFn: forumsApi.deleteMessage,
        onSuccess: () => {
            invalidate(forumId);
            toast.success('Mesajul a fost șters.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Mesajul nu a putut fi șters.')),
    });
};

/** Likes update instantly (optimistic), then take the server's count. */
export const useLikeForumMessage = (forumId) => {
    const queryClient = useQueryClient();
    const messagesKey = ['forums', String(forumId), 'messages'];
    const patchMessage = (messageId, patch) => {
        queryClient.setQueriesData({ queryKey: messagesKey }, (page) => page && ({
            ...page,
            items: page.items.map((message) => (message.id === messageId ? { ...message, ...patch(message) } : message)),
        }));
    };
    return useMutation({
        mutationFn: ({ messageId, liked }) => forumsApi.setLike(messageId, liked),
        onMutate: async ({ messageId, liked }) => {
            await queryClient.cancelQueries({ queryKey: messagesKey });
            patchMessage(messageId, (message) => ({
                likedByMe: liked,
                likeCount: Math.max(0, message.likeCount + (liked ? 1 : -1)),
            }));
        },
        onSuccess: (result, { messageId }) => patchMessage(messageId, () => result),
        onError: (error, { messageId, liked }) => {
            patchMessage(messageId, (message) => ({
                likedByMe: !liked,
                likeCount: Math.max(0, message.likeCount + (liked ? -1 : 1)),
            }));
            toast.error(getErrorMessage(error, 'Aprecierea nu a putut fi salvată.'));
        },
    });
};
