import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import AuthProvider from '@/features/auth/AuthProvider';
import { queryClient } from '@/shared/api/query-client';
import ThemeProvider from './ThemeProvider';
import useTheme from './useTheme';

function ThemedToaster() {
    const { theme } = useTheme();
    // Bottom-right keeps confirmations clear of the sticky header and its navigation.
    return <Toaster theme={theme} position="bottom-right" richColors closeButton duration={3500} />;
}

/** Every app-wide provider, in dependency order. */
export default function AppProviders({ children }) {
    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    {children}
                    <ThemedToaster />
                </AuthProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}
