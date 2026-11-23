import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/** Opens the connection to the API while the app's JavaScript is still downloading. */
const preconnectToApi = (apiUrl) => ({
    name: 'preconnect-to-api',
    transformIndexHtml: () => {
        let origin;
        try {
            origin = new URL(apiUrl).origin;
        } catch {
            return [];
        }
        return [{ tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: '' }, injectTo: 'head' }];
    },
});

export default defineConfig(({ mode }) => ({
    plugins: [react(), preconnectToApi(loadEnv(mode, process.cwd()).VITE_API_URL ?? 'http://localhost:3000')],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5173 },
    build: {
        rollupOptions: {
            output: {
                // Keep large, rarely-changing libraries in their own long-cacheable chunks.
                // Matching on the path also catches sub-entries such as `react-dom/client`.
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;
                    if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|cookie|set-cookie-parser)[\\/]/.test(id)) return 'react';
                    if (id.includes('@tanstack')) return 'query';
                    if (/[\\/]node_modules[\\/](recharts|d3-|victory-vendor|decimal\.js-light|es-toolkit|immer|reselect|@reduxjs|react-redux|redux|eventemitter3)/.test(id)) return 'charts';
                    return undefined;
                },
            },
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.js'],
        css: { modules: { classNameStrategy: 'non-scoped' } },
    },
}));
