import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/api/error-messages';
import { queryKeys } from '@/shared/lib/query-keys';
import { chatsApi } from './api';

/** How often an open conversation checks for new messages. */
const MESSAGE_POLL_MS = 5_000;

export const useMyChats = () => useQuery({
    queryKey: queryKeys.myChats,
    queryFn: chatsApi.mine,
    refetchInterval: 30_000,
});

export const useChat = (id) => useQuery({
    queryKey: queryKeys.chats.detail(id),
    queryFn: () => chatsApi.get(id),
    enabled: Boolean(id),
});

export const useChatMessages = (id) => useQuery({
    queryKey: queryKeys.chats.messages(id),
    queryFn: () => chatsApi.messages(id),
    enabled: Boolean(id),
    refetchInterval: MESSAGE_POLL_MS,
    refetchIntervalInBackground: false,
});

const useAppendMessage = (id) => {
    const queryClient = useQueryClient();
    return (message) => queryClient.setQueryData(queryKeys.chats.messages(id), (messages = []) => [...messages, message]);
};

export const useSendMessage = (id) => {
    const append = useAppendMessage(id);
    return useMutation({
        mutationFn: (content) => chatsApi.send(id, content),
        onSuccess: append,
        onError: (error) => toast.error(getErrorMessage(error, 'Mesajul nu a putut fi trimis.')),
    });
};

export const useSendFile = (id) => {
    const append = useAppendMessage(id);
    return useMutation({
        mutationFn: (file) => chatsApi.sendFile(id, file),
        onSuccess: append,
        onError: (error) => toast.error(getErrorMessage(error, 'Fișierul nu a putut fi trimis (JPG, PNG, WebP sau PDF, maximum 10 MB).')),
    });
};

export const useToggleChat = (id) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (isOpen) => chatsApi.setOpen(id, isOpen),
        onSuccess: (chat) => {
            queryClient.setQueryData(queryKeys.chats.detail(id), chat);
            queryClient.invalidateQueries({ queryKey: queryKeys.myChats });
            toast.success(chat.isOpen ? 'Conversația a fost redeschisă.' : 'Conversația a fost închisă.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Nu am putut schimba starea conversației.')),
    });
};
