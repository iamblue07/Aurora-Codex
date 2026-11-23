/** Build-time configuration (Vite `VITE_*` variables). */
const env = Object.freeze({
    apiUrl: (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
});

export default env;
