import { QueryClient } from '@tanstack/react-query';

const isClientError = (error) => error?.status >= 400 && error?.status < 500;

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Retrying a 4xx (not found, forbidden, …) never helps.
            retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
        },
        mutations: { retry: false },
    },
});
