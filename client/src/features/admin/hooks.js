import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/api/error-messages';
import { queryKeys } from '@/shared/lib/query-keys';
import { adminApi, isRunning } from './api';

const JOB_POLL_MS = 1500;
const JOB_HISTORY_SIZE = 20;

export const useAiStatus = () => useQuery({
    queryKey: queryKeys.admin.aiStatus,
    queryFn: adminApi.aiStatus,
});

/** Recent jobs; polled while any of them is running so progress updates live. */
export const useJobs = () => useQuery({
    queryKey: queryKeys.admin.jobs,
    queryFn: () => adminApi.jobs({ limit: JOB_HISTORY_SIZE }),
    refetchInterval: (query) => (query.state.data?.some(isRunning) ? JOB_POLL_MS : false),
});

export const useStartJob = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminApi.startJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.jobs });
            toast.success('Sarcina a pornit.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Sarcina nu a putut porni.'), { description: error.message }),
    });
};

export const useCancelJob = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminApi.cancelJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.jobs });
            toast.success('Sarcina se oprește după pasul curent.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Sarcina nu a putut fi oprită.')),
    });
};

export const useTestAiConnection = () => useMutation({ mutationFn: adminApi.testAiConnection });

export const useAdminSettings = () => useQuery({
    queryKey: queryKeys.admin.settings,
    queryFn: adminApi.settings,
});

export const useUpdateSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminApi.updateSettings,
        onSuccess: (settings) => {
            queryClient.setQueryData(queryKeys.admin.settings, settings);
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.aiStatus });
            queryClient.invalidateQueries({ queryKey: queryKeys.features });
            toast.success('Setările au fost salvate.');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Setările nu au putut fi salvate.'), { description: error.message }),
    });
};
