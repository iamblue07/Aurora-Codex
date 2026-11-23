import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import AppProviders from '@/app/providers/AppProviders';
import { prefetchLikelyPages, router } from '@/app/router';
import { startBackendKeepAlive } from '@/shared/api/keep-alive';
import '@/shared/styles/global.css';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AppProviders>
            <RouterProvider router={router} />
        </AppProviders>
    </StrictMode>,
);

prefetchLikelyPages();
// Keeps a free-tier backend from falling asleep while someone has the app open.
startBackendKeepAlive();
