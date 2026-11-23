import { Ban } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useGoBack from '@/shared/hooks/useGoBack';
import useGenres from '@/shared/hooks/useGenres';
import { Button, Card, EmptyState, Input, PageHeader, Select, Textarea } from '@/shared/ui';
import CatalogBookPicker from '../components/CatalogBookPicker';
import ImageDropzone from '../components/ImageDropzone';
import { useCreateListing } from '../hooks';
import styles from './CreateListingPage.module.css';

const EMPTY_FORM = { title: '', description: '', price: '', genre: '', isNegotiable: true, image: null, book: null };

const validate = (form) => {
    const errors = {};
    if (form.title.trim().length < 3) errors.title = 'Titlul trebuie să aibă cel puțin 3 caractere.';
    if (form.description.trim().length < 10) errors.description = 'Descrie cartea în cel puțin 10 caractere.';
    const price = Number(form.price.replace(',', '.'));
    if (form.price === '' || !Number.isFinite(price) || price < 0) errors.price = 'Introdu un preț valid.';
    if (!form.genre) errors.genre = 'Alege genul literar.';
    if (!form.image) errors.image = 'Adaugă o fotografie a cărții.';
    return errors;
};

export default function CreateListingPage() {
    useDocumentTitle('Anunț nou');
    const navigate = useNavigate();
    const goBack = useGoBack(paths.myListings);
    const { permissions } = useAuth();
    const { genres } = useGenres();
    const createListing = useCreateListing();
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});

    const set = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    // Picking a catalogue book pre-fills the title and genre if they are still empty.
    const pickBook = (book) => {
        setForm((current) => ({
            ...current,
            book,
            title: current.title || (book?.title ?? ''),
            genre: current.genre || (book?.genre?.code ?? ''),
        }));
    };

    if (permissions.canCreateListings === false) {
        return (
            <EmptyState
                icon={<Ban />}
                title="Nu poți publica anunțuri"
                description="Dreptul tău de a publica anunțuri a fost retras de un administrator, în urma încălcării regulamentului."
                action={<Button to={paths.marketplace}>Înapoi la bazar</Button>}
            />
        );
    }

    const submit = (event) => {
        event.preventDefault();
        const validation = validate(form);
        setErrors(validation);
        if (Object.keys(validation).length) return;

        const data = new FormData();
        data.append('title', form.title.trim());
        data.append('description', form.description.trim());
        data.append('price', String(Number(form.price.replace(',', '.'))));
        data.append('genre', form.genre);
        data.append('isNegotiable', String(form.isNegotiable));
        if (form.book) data.append('bookId', String(form.book.id));
        data.append('image', form.image);

        createListing.mutate(data, { onSuccess: (listing) => navigate(paths.listing(listing.id)) });
    };

    return (
        <div>
            <PageHeader eyebrow="Bazar" title="Publică un anunț" subtitle="Câteva detalii și o fotografie bună sunt tot ce îți trebuie." />

            <form className={styles.layout} onSubmit={submit} noValidate>
                <Card className={styles.details} padding="lg">
                    <Input label="Titlul anunțului" placeholder="ex: Dune — Frank Herbert, ediție cartonată" value={form.title} maxLength={255} onChange={(event) => set('title', event.target.value)} error={errors.title} required />
                    <Textarea label="Descriere" placeholder="Starea cărții, ediția, eventuale însemnări…" value={form.description} rows={6} maxLength={5000} onChange={(event) => set('description', event.target.value)} error={errors.description} required />
                    <div className={styles.row}>
                        <Input label="Preț (lei)" inputMode="decimal" placeholder="0" value={form.price} onChange={(event) => set('price', event.target.value.replace(/[^\d.,]/g, ''))} error={errors.price} required />
                        <Select label="Gen literar" value={form.genre} onChange={(event) => set('genre', event.target.value)} error={errors.genre} required>
                            <option value="">Alege genul</option>
                            {genres.map((genre) => <option key={genre.code} value={genre.code}>{genre.label}</option>)}
                        </Select>
                    </div>
                    <label className={styles.switch}>
                        <input type="checkbox" checked={form.isNegotiable} onChange={(event) => set('isNegotiable', event.target.checked)} />
                        <span>
                            <strong>Preț negociabil</strong>
                            <span className={styles.switchHint}>Cumpărătorii îți pot propune alt preț.</span>
                        </span>
                    </label>
                    <CatalogBookPicker value={form.book} onChange={pickBook} />
                </Card>

                <div className={styles.side}>
                    <Card padding="lg" className={styles.photoCard}>
                        <h2 className={styles.photoTitle}>Fotografie</h2>
                        <ImageDropzone file={form.image} onChange={(file) => set('image', file)} error={errors.image} />
                    </Card>
                    <div className={styles.actions}>
                        <Button type="submit" size="lg" fullWidth loading={createListing.isPending}>Publică anunțul</Button>
                        <Button variant="ghost" fullWidth onClick={goBack}>Renunță</Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
