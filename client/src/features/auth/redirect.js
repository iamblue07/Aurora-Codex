import { paths } from '@/app/paths';

/**
 * Where to go after signing in. Only same-site absolute paths are accepted, so a crafted
 * `?next=//evil.example` or `?next=https://…` link can't turn login into an open redirect.
 */
export const safeNextPath = (next) => (
    typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
        ? next
        : paths.home
);
