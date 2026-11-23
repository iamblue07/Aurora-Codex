import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button, ErrorState } from '@/shared/ui';
import NotFoundPage from './NotFoundPage';
import styles from './RouteErrorPage.module.css';

/** Last-resort error screen for crashes while rendering a route. */
export default function RouteErrorPage() {
    const error = useRouteError();
    if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
    console.error(error);

    return (
        <div className={styles.page}>
            <ErrorState
                title="Ups! Ceva nu a mers bine"
                description="A apărut o eroare neașteptată. Reîncarcă pagina sau revino la pagina principală."
                onRetry={() => window.location.reload()}
            />
            <Button variant="ghost" href="/">Înapoi acasă</Button>
        </div>
    );
}
