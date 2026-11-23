import { useEffect } from 'react';

const APP_NAME = 'Aurora Codex';

/** Sets the browser tab title for the current page. */
export default function useDocumentTitle(title) {
    useEffect(() => {
        document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
    }, [title]);
}
