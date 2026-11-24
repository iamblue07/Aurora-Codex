import { Lightbulb, MessagesSquare, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import { useBook } from '@/features/books/hooks';
import CatalogBookPicker from '@/features/marketplace/components/CatalogBookPicker';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import { Button, Card, EmptyState, Input, Select, Skeleton } from '@/shared/ui';
import Breadcrumbs from '../components/Breadcrumbs';
import CategoryIcon from '../components/CategoryIcon';
import Composer from '../components/Composer';
import { MAX_TITLE_LENGTH } from '../constants';
import { useCreateForum, useForumBoard } from '../hooks';
import styles from './NewThreadPage.module.css';

const MIN_TITLE = 3;
const MIN_CONTENT = 10;

const TIPS = [
    'Alege un titlu care spune clar despre ce vrei să vorbești.',
    'Caută înainte — poate există deja o discuție pe același subiect.',
    'Asociază cartea din catalog dacă discuția e despre una anume.',
    'Fără spoilere nemarcate: anunță-le la începutul mesajului.',
];

/** Form for starting a thread: category, title, optional catalogue book and the opening post. */
export default function NewThreadPage() {
    useDocumentTitle('Discuție nouă');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { permissions } = useAuth();
    const board = useForumBoard();
    const create = useCreateForum();
    const [form, setForm] = useState({ categorySlug: searchParams.get('categorie') ?? '', title: '', content: '', book: null });
    const [touched, setTouched] = useState(false);

    // `?carte=<id>` (from a book's page) pre-links that book.
    const presetBookId = searchParams.get('carte');
    const presetBook = useBook(presetBookId, { enabled: Boolean(presetBookId) });
    useEffect(() => {
        if (presetBook.data) setForm((current) => (current.book ? current : { ...current, book: presetBook.data }));
    }, [presetBook.data]);

    const categories = board.data?.categories ?? [];
    const category = categories.find((item) => item.slug === form.categorySlug) ?? categories[0];
    const title = form.title.trim();
    const content = form.content.trim();
    const errors = {
        title: title.length < MIN_TITLE ? `Titlul trebuie să aibă cel puțin ${MIN_TITLE} caractere.` : null,
        content: content.length < MIN_CONTENT ? `Mesajul trebuie să aibă cel puțin ${MIN_CONTENT} caractere.` : null,
    };
    const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

    if (permissions.canCreateForums === false) {
        return (
            <EmptyState
                icon={<MessagesSquare />}
                title="Nu poți porni discuții"
                description="Dreptul tău de a crea discuții a fost retras de un administrator."
                action={<Button to={paths.forums}>Înapoi la forumuri</Button>}
            />
        );
    }

    const submit = (event) => {
        event.preventDefault();
        setTouched(true);
        if (errors.title || errors.content || !category) return;
        create.mutate(
            { title, content, categoryId: category.id, bookId: form.book?.id },
            { onSuccess: (thread) => navigate(paths.forum(thread.id), { replace: true }) },
        );
    };

    return (
        <div className={styles.page}>
            <Breadcrumbs items={[
                { label: 'Forumuri', to: paths.forums },
                ...(category ? [{ label: category.name, to: paths.forumCategory(category.slug) }] : []),
                { label: 'Discuție nouă' },
            ]} />

            <h1 className={styles.heading}>Pornește o discuție</h1>

            <div className={styles.layout}>
                <Card as="form" className={styles.form} onSubmit={submit} noValidate>
                    {board.isPending ? <Skeleton height="4rem" /> : (
                        <div className={styles.categoryRow}>
                            <CategoryIcon category={category} size="md" />
                            <Select
                                label="Categorie"
                                className={styles.category}
                                value={category?.slug ?? ''}
                                hint={category?.description}
                                onChange={(event) => set('categorySlug')(event.target.value)}
                            >
                                {categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
                            </Select>
                        </div>
                    )}

                    <Input
                        label="Titlu"
                        placeholder="Despre ce vrei să discutăm?"
                        value={form.title}
                        maxLength={MAX_TITLE_LENGTH}
                        required
                        error={touched ? errors.title : null}
                        hint={`${form.title.length}/${MAX_TITLE_LENGTH}`}
                        onChange={(event) => set('title')(event.target.value)}
                    />

                    <CatalogBookPicker
                        value={form.book}
                        onChange={set('book')}
                        label="Despre o carte anume? (opțional)"
                        hint="Discuția va apărea și pe pagina cărții."
                    />

                    <Composer
                        label="Primul mesaj"
                        placeholder="Deschide discuția: ce gândești, ce întrebi, ce recomanzi?"
                        value={form.content}
                        onChange={set('content')}
                        rows={10}
                        error={touched ? errors.content : null}
                    />

                    <div className={styles.actions}>
                        <Button variant="ghost" to={category ? paths.forumCategory(category.slug) : paths.forums}>Renunță</Button>
                        <Button type="submit" leftIcon={<Send />} loading={create.isPending}>Publică discuția</Button>
                    </div>
                </Card>

                <aside className={styles.tips}>
                    <h2 className={styles.tipsTitle}><Lightbulb aria-hidden="true" /> Sfaturi</h2>
                    <ul>
                        {TIPS.map((tip) => <li key={tip}>{tip}</li>)}
                    </ul>
                    <h3 className={styles.tipsTitle}>Formatare</h3>
                    <dl className={styles.syntax}>
                        <div><dt><code>**text**</code></dt><dd><strong>îngroșat</strong></dd></div>
                        <div><dt><code>*text*</code></dt><dd><em>cursiv</em></dd></div>
                        <div><dt><code>&gt; text</code></dt><dd>citat</dd></div>
                        <div><dt><code>- text</code></dt><dd>listă</dd></div>
                        <div><dt><code>`cod`</code></dt><dd>cod</dd></div>
                    </dl>
                </aside>
            </div>
        </div>
    );
}
