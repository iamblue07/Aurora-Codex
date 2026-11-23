import clsx from 'clsx';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/shared/ui';
import styles from './ImageDropzone.module.css';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

/** Image picker with drag & drop, client-side validation and a live preview. */
export default function ImageDropzone({ file, onChange, error }) {
    const inputRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [localError, setLocalError] = useState(null);

    useEffect(() => {
        if (!file) {
            setPreview(null);
            return undefined;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const accept = (candidate) => {
        if (!candidate) return;
        if (!ACCEPTED.includes(candidate.type)) {
            setLocalError('Sunt acceptate doar imagini JPG, PNG sau WebP.');
            return;
        }
        if (candidate.size > MAX_SIZE_MB * 1024 * 1024) {
            setLocalError(`Imaginea poate avea cel mult ${MAX_SIZE_MB} MB.`);
            return;
        }
        setLocalError(null);
        onChange(candidate);
    };

    const shownError = localError ?? error;

    return (
        <div className={styles.wrapper}>
            {preview ? (
                <div className={styles.preview}>
                    <img src={preview} alt="Previzualizarea imaginii anunțului" />
                    <IconButton label="Elimină imaginea" variant="overlay" className={styles.remove} onClick={() => onChange(null)}>
                        <X />
                    </IconButton>
                </div>
            ) : (
                <button
                    type="button"
                    className={clsx(styles.dropzone, dragging && styles.dragging, shownError && styles.invalid)}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files?.[0]); }}
                >
                    <ImagePlus aria-hidden="true" />
                    <span className={styles.primary}>Trage o fotografie aici sau alege una</span>
                    <span className={styles.secondary}>JPG, PNG sau WebP, maximum {MAX_SIZE_MB} MB</span>
                </button>
            )}
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED.join(',')}
                className="visually-hidden"
                tabIndex={-1}
                onChange={(event) => { accept(event.target.files?.[0]); event.target.value = ''; }}
            />
            {shownError && <p className={styles.error} role="alert">{shownError}</p>}
        </div>
    );
}
