import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/api/error-messages';
import { queryKeys } from '@/shared/lib/query-keys';
import { moderationApi, reportsApi } from './api';

export const useReports = (params) => useQuery({
    queryKey: queryKeys.reports.list(params),
    queryFn: () => reportsApi.list(params),
    placeholderData: keepPreviousData,
});

export const useReport = (id) => useQuery({
    queryKey: queryKeys.reports.detail(id),
    queryFn: () => reportsApi.get(id),
    enabled: Boolean(id),
});

/** Wraps a moderation call with toasts and refreshes the affected report(s). */
const useModerationAction = (mutationFn, successMessage) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
            toast.success(successMessage);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Acțiunea nu a putut fi efectuată.')),
    });
};

export const useSetReportOpen = () => useModerationAction(
    ({ id, isOpen }) => reportsApi.setOpen(id, isOpen),
    'Starea raportului a fost actualizată.',
);

export const useRevokePermission = () => useModerationAction(
    ({ userId, permission }) => moderationApi.setPermission(userId, permission, false),
    'Dreptul a fost retras.',
);

export const useRemoveForumMessage = () => useModerationAction(moderationApi.removeForumMessage, 'Mesajul a fost ascuns.');
export const useDeleteListingAsAdmin = () => useModerationAction(moderationApi.deleteListing, 'Anunțul a fost șters.');
export const useDeleteForumAsAdmin = () => useModerationAction(moderationApi.deleteForum, 'Forumul a fost șters.');
