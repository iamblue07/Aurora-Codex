import { BookX } from 'lucide-react';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import { Button, EmptyState } from '@/shared/ui';
import { paths } from '../paths';

export default function NotFoundPage() {
    useDocumentTitle('Pagina nu există');
    return (
        <EmptyState
            icon={<BookX />}
            title="Pagina asta s-a rătăcit printre rafturi"
            description="Linkul pe care l-ai urmat nu mai există sau a fost mutat."
            action={<Button to={paths.home}>Înapoi acasă</Button>}
        />
    );
}
