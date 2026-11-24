import clsx from 'clsx';
import { ImagePlus, Star, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@/shared/ui';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB, MAX_LISTING_IMAGES } from '../constants';
import { useListingImages } from '../hooks';
import ListingImage from './ListingImage';
import styles from './ListingPhotos.module.css';

/** Splits picked files into valid ones and an error message for the rest. */
const checkFiles = (files, room) => {
    const valid = [];
    let error = null;
    for (const file of files) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) error = 'Sunt acceptate doar imagini JPG, PNG sau WebP.';
        else if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) error = `Fiecare imagine poate avea cel mult ${MAX_IMAGE_SIZE_MB} MB.`;
        else valid.push(file);
    }
    if (valid.length > room) error = `Poți adăuga cel mult ${MAX_LISTING_IMAGES} fotografii.`;
    return { files: valid.slice(0, Math.max(0, room)), error };
};

/** Drop zone / button that adds photos. */
function AddTile({ room, onFiles, busy, invalid }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    if (room <= 0) return null;
    return (
        <li>
            <button
                type="button"
                className={clsx(styles.add, dragging && styles.dragging, invalid && styles.invalid)}
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); onFiles([...event.dataTransfer.files]); }}
                disabled={busy}
            >
                {busy ? <Spinner /> : <ImagePlus aria-hidden="true" />}
                <span>Adaugă fotografii</span>
                <small>încă {room}</small>
            </button>
            <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                className="visually-hidden"
                tabIndex={-1}
                onChange={(event) => { onFiles([...event.target.files]); event.target.value = ''; }}
            />
        </li>
    );
}

function Tile({ src, isCover, onRemove, onCover, disabled, index }) {
    return (
        <li className={clsx(styles.tile, isCover && styles.cover)}>
            {src.startsWith('blob:')
                ? <img src={src} alt={`Fotografia ${index + 1}`} className={styles.tileImage} />
                : <ListingImage src={src} alt={`Fotografia ${index + 1}`} className={styles.tileImage} />}
            {isCover && <span className={styles.coverBadge}><Star aria-hidden="true" /> Copertă</span>}
            <div className={styles.tileActions}>
                {!isCover && onCover && (
                    <button type="button" onClick={onCover} disabled={disabled} title="Folosește ca primă fotografie" aria-label="Folosește ca primă fotografie">
                        <Star />
                    </button>
                )}
                {onRemove && (
                    <button type="button" onClick={onRemove} disabled={disabled} title="Elimină fotografia" aria-label="Elimină fotografia">
                        <X />
                    </button>
                )}
            </div>
        </li>
    );
}

const Hint = () => (
    <p className={styles.hint}>
        Până la {MAX_LISTING_IMAGES} fotografii, JPG, PNG sau WebP. Prima este coperta anunțului: arată coperta, cotorul și orice defect.
    </p>
);

/** Photos of a new listing, kept as local files until the form is submitted. */
export function NewListingPhotos({ files, onChange, error }) {
    const [localError, setLocalError] = useState(null);
    const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
    useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

    const add = (picked) => {
        const result = checkFiles(picked, MAX_LISTING_IMAGES - files.length);
        setLocalError(result.error);
        if (result.files.length) onChange([...files, ...result.files]);
    };
    const shownError = localError ?? error;

    return (
        <div className={styles.photos}>
            <ul className={styles.grid}>
                {files.map((file, index) => (
                    <Tile
                        key={previews[index]}
                        index={index}
                        src={previews[index]}
                        isCover={index === 0}
                        onRemove={() => onChange(files.filter((_, other) => other !== index))}
                        onCover={() => onChange([file, ...files.filter((_, other) => other !== index)])}
                    />
                ))}
                <AddTile room={MAX_LISTING_IMAGES - files.length} onFiles={add} invalid={Boolean(shownError)} />
            </ul>
            <Hint />
            {shownError && <p className={styles.error} role="alert">{shownError}</p>}
        </div>
    );
}

/** Photos of an existing listing: every change is saved right away. */
export function SavedListingPhotos({ listing }) {
    const { add, remove, setCover } = useListingImages(listing.id);
    const [localError, setLocalError] = useState(null);
    const busy = add.isPending || remove.isPending || setCover.isPending;

    const upload = (picked) => {
        const result = checkFiles(picked, MAX_LISTING_IMAGES - listing.images.length);
        setLocalError(result.error);
        if (result.files.length === 0) return;
        const data = new FormData();
        result.files.forEach((file) => data.append('images', file));
        add.mutate(data);
    };

    return (
        <div className={styles.photos}>
            <ul className={styles.grid}>
                {listing.images.map((image, index) => (
                    <Tile
                        key={image.id}
                        index={index}
                        src={image.url}
                        isCover={index === 0}
                        disabled={busy}
                        onRemove={listing.images.length > 1 ? () => remove.mutate(image.id) : undefined}
                        onCover={() => setCover.mutate(image.id)}
                    />
                ))}
                <AddTile room={MAX_LISTING_IMAGES - listing.images.length} onFiles={upload} busy={add.isPending} />
            </ul>
            <Hint />
            {localError && <p className={styles.error} role="alert">{localError}</p>}
        </div>
    );
}
