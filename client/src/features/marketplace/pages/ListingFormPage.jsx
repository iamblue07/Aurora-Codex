import clsx from 'clsx';
import { Ban, Lock, PackageX } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { paths } from '@/app/paths';
import useAuth from '@/features/auth/useAuth';
import useDocumentTitle from '@/shared/hooks/useDocumentTitle';
import useGoBack from '@/shared/hooks/useGoBack';
import useGenres from '@/shared/hooks/useGenres';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, Textarea } from '@/shared/ui';
import CatalogBookPicker from '../components/CatalogBookPicker';
import { NewListingPhotos, SavedListingPhotos } from '../components/ListingPhotos';
import { CONDITIONS } from '../constants';
import { useCreateListing, useListing, useListingCities, useUpdateListing } from '../hooks';
import styles from './ListingFormPage.module.css';

const EMPTY_FORM = {
    title: '', author: '', description: '', price: '', genre: '', condition: 'very_good', city: '',
    isNegotiable: true, offersPickup: true, offersShipping: false, book: null, images: [],
};

const formFromListing = (listing) => ({
    title: listing.title,
    author: listing.author ?? '',
    description: listing.description,
    price: String(listing.price),
    genre: listing.genre?.code ?? '',
    condition: listing.condition,
    city: listing.city ?? '',
    isNegotiable: listing.isNegotiable,
    offersPickup: listing.offersPickup,
    offersShipping: listing.offersShipping,
    book: listing.book,
    images: [],
});

const parsePrice = (text) => Number(text.replace(',', '.'));

const validate = (form, { needsPhotos }) => {
    const errors = {};
    if (form.title.trim().length < 3) errors.title = 'Titlul trebuie să aibă cel puțin 3 caractere.';
    if (form.description.trim().length < 10) errors.description = 'Descrie cartea în cel puțin 10 caractere.';
    const price = parsePrice(form.price);
    if (form.price === '' || !Number.isFinite(price) || price < 0) errors.price = 'Introdu un preț valid.';
    if (!form.genre) errors.genre = 'Alege genul literar.';
    if (!form.offersPickup && !form.offersShipping) errors.delivery = 'Alege cel puțin o variantă de predare.';
    if (needsPhotos && form.images.length === 0) errors.images = 'Adaugă cel puțin o fotografie a cărții.';
    return errors;
};

function Toggle({ checked, onChange, title, hint }) {
    return (
        <label className={styles.toggle}>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
            <span>
                <strong>{title}</strong>
                {hint && <span className={styles.toggleHint}>{hint}</span>}
            </span>
        </label>
    );
}

/** Create (no listing) or edit (`listing`) form. */
function ListingForm({ listing }) {
    const navigate = useNavigate();
    const goBack = useGoBack(listing ? paths.listing(listing.id) : paths.myListings);
    const { genres } = useGenres();
    const cities = useListingCities();
    const create = useCreateListing();
    const update = useUpdateListing();
    const [form, setForm] = useState(() => (listing ? formFromListing(listing) : EMPTY_FORM));
    const [errors, setErrors] = useState({});
    const saving = create.isPending || update.isPending;

    const set = (field) => (value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined, ...(field.startsWith('offers') && { delivery: undefined }) }));
    };

    // Picking a catalogue book fills in the title, author and genre if they are still empty.
    const pickBook = (book) => {
        setForm((current) => ({
            ...current,
            book,
            title: current.title || (book?.title ?? ''),
            author: current.author || (book?.author ?? ''),
            genre: current.genre || (book?.genre?.code ?? ''),
        }));
    };

    const fields = () => ({
        title: form.title.trim(),
        author: form.author.trim(),
        description: form.description.trim(),
        price: parsePrice(form.price),
        genre: form.genre,
        condition: form.condition,
        city: form.city.trim(),
        isNegotiable: form.isNegotiable,
        offersPickup: form.offersPickup,
        offersShipping: form.offersShipping,
    });

    const submit = (event) => {
        event.preventDefault();
        const validation = validate(form, { needsPhotos: !listing });
        setErrors(validation);
        if (Object.keys(validation).length) {
            document.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (listing) {
            update.mutate(
                { id: listing.id, changes: { ...fields(), bookId: form.book?.id ?? null } },
                { onSuccess: () => navigate(paths.listing(listing.id)) },
            );
            return;
        }
        const data = new FormData();
        for (const [key, value] of Object.entries(fields())) data.append(key, String(value));
        if (form.book) data.append('bookId', String(form.book.id));
        form.images.forEach((file) => data.append('images', file));
        create.mutate(data, { onSuccess: (created) => navigate(paths.listing(created.id)) });
    };

    return (
        <form className={styles.layout} onSubmit={submit} noValidate>
            <div className={styles.main}>
                <Card padding="lg" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Cartea</h2>
                    <CatalogBookPicker
                        value={form.book}
                        onChange={pickBook}
                        label="Caut-o în catalog (opțional)"
                        hint="Completăm titlul, autorul și genul, iar cumpărătorii văd cât costă în librării."
                    />
                    <Input label="Titlul anunțului" placeholder="ex: Dune — ediție cartonată" value={form.title} maxLength={255} onChange={(event) => set('title')(event.target.value)} error={errors.title} required />
                    <div className={styles.row}>
                        <Input label="Autor" placeholder="ex: Frank Herbert" value={form.author} maxLength={255} onChange={(event) => set('author')(event.target.value)} />
                        <Select label="Gen literar" value={form.genre} onChange={(event) => set('genre')(event.target.value)} error={errors.genre} required>
                            <option value="">Alege genul</option>
                            {genres.map((genre) => <option key={genre.code} value={genre.code}>{genre.label}</option>)}
                        </Select>
                    </div>
                    <Textarea
                        label="Descriere"
                        placeholder="Ediția, editura, eventuale însemnări sau defecte, de ce o vinzi…"
                        value={form.description}
                        rows={6}
                        maxLength={5000}
                        hint={`${form.description.length}/5000`}
                        onChange={(event) => set('description')(event.target.value)}
                        error={errors.description}
                        required
                    />
                </Card>

                <Card padding="lg" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Starea cărții</h2>
                    <div className={styles.conditions} role="radiogroup" aria-label="Starea cărții">
                        {CONDITIONS.map((condition) => (
                            <label key={condition.value} className={clsx(styles.condition, form.condition === condition.value && styles.conditionActive)}>
                                <input
                                    type="radio"
                                    name="condition"
                                    value={condition.value}
                                    checked={form.condition === condition.value}
                                    onChange={() => set('condition')(condition.value)}
                                />
                                <strong>{condition.label}</strong>
                                <span>{condition.hint}</span>
                            </label>
                        ))}
                    </div>
                </Card>

                <Card padding="lg" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Preț și predare</h2>
                    <div className={styles.row}>
                        <Input label="Preț (lei)" inputMode="decimal" placeholder="0" value={form.price} onChange={(event) => set('price')(event.target.value.replace(/[^\d.,]/g, ''))} error={errors.price} required />
                        <Input
                            label="Localitate"
                            placeholder="ex: Cluj-Napoca"
                            value={form.city}
                            maxLength={80}
                            list="listing-cities"
                            onChange={(event) => set('city')(event.target.value)}
                        />
                        <datalist id="listing-cities">
                            {(cities.data ?? []).map(({ city }) => <option key={city} value={city} />)}
                        </datalist>
                    </div>
                    <Toggle checked={form.isNegotiable} onChange={set('isNegotiable')} title="Preț negociabil" hint="Cumpărătorii îți pot propune alt preț." />
                    <div className={styles.delivery}>
                        <Toggle checked={form.offersPickup} onChange={set('offersPickup')} title="Predare personală" hint="Vă întâlniți în localitatea ta." />
                        <Toggle checked={form.offersShipping} onChange={set('offersShipping')} title="Livrare prin curier" hint="Trimiți cartea, cumpărătorul plătește transportul." />
                    </div>
                    {errors.delivery && <p className={styles.error} role="alert">{errors.delivery}</p>}
                </Card>
            </div>

            <div className={styles.side}>
                <Card padding="lg" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Fotografii</h2>
                    {listing
                        ? <SavedListingPhotos listing={listing} />
                        : <NewListingPhotos files={form.images} onChange={set('images')} error={errors.images} />}
                </Card>
                <div className={styles.actions}>
                    <Button type="submit" size="lg" fullWidth loading={saving}>{listing ? 'Salvează modificările' : 'Publică anunțul'}</Button>
                    <Button variant="ghost" fullWidth onClick={goBack}>Renunță</Button>
                </div>
            </div>
        </form>
    );
}

function EditListing({ listingId }) {
    const listing = useListing(listingId);
    if (listing.isPending) return <LoadingState />;
    if (listing.isError) {
        return listing.error.status === 404
            ? <EmptyState icon={<PackageX />} title="Anunțul nu mai există" action={<Button to={paths.myListings}>Anunțurile mele</Button>} />
            : <ErrorState onRetry={listing.refetch} />;
    }
    if (!listing.data.isOwner) {
        return <EmptyState icon={<Lock />} title="Poți edita doar anunțurile tale" action={<Button to={paths.listing(listingId)}>Vezi anunțul</Button>} />;
    }
    if (!listing.data.isAvailable) {
        return <EmptyState icon={<Lock />} title="Anunțul este închis" description="Cărțile vândute nu mai pot fi modificate." action={<Button to={paths.listing(listingId)}>Vezi anunțul</Button>} />;
    }
    return <ListingForm listing={listing.data} />;
}

/** `/bazar/anunt-nou` (create) and `/bazar/anunt/:listingId/editeaza` (edit). */
export default function ListingFormPage() {
    const { listingId } = useParams();
    const editing = Boolean(listingId);
    useDocumentTitle(editing ? 'Editează anunțul' : 'Anunț nou');
    const { permissions } = useAuth();

    if (!editing && permissions.canCreateListings === false) {
        return (
            <EmptyState
                icon={<Ban />}
                title="Nu poți publica anunțuri"
                description="Dreptul tău de a publica anunțuri a fost retras de un administrator, în urma încălcării regulamentului."
                action={<Button to={paths.marketplace}>Înapoi la bazar</Button>}
            />
        );
    }

    return (
        <div>
            <PageHeader
                eyebrow="Bazar"
                title={editing ? 'Editează anunțul' : 'Publică un anunț'}
                subtitle={editing
                    ? 'Fotografiile se salvează imediat; restul modificărilor, când apeși „Salvează”.'
                    : 'Câteva detalii, starea cărții și fotografii bune: asta e tot ce îți trebuie.'}
            />
            {editing ? <EditListing listingId={listingId} /> : <ListingForm />}
        </div>
    );
}
