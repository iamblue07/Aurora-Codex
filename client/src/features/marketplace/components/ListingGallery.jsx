import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { useState } from 'react';
import { apiUrl } from '@/shared/api/http-client';
import { Lightbox } from '@/shared/ui';
import ListingImage from './ListingImage';
import styles from './ListingGallery.module.css';

/** Photos of a listing: a large photo with arrows, thumbnails below and a full-screen viewer. */
export default function ListingGallery({ images, title, sold = false }) {
    const [index, setIndex] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const photos = images.length > 0 ? images : [{ id: 'none', url: null }];
    const current = photos[Math.min(index, photos.length - 1)];
    const many = photos.length > 1;
    const go = (delta) => setIndex((value) => (value + delta + photos.length) % photos.length);

    return (
        <div className={styles.gallery}>
            <div className={clsx(styles.stage, sold && styles.sold)}>
                <ListingImage src={current.url} alt={title} className={styles.main} onClick={current.url ? () => setZoomed(true) : undefined} />
                {current.url && (
                    <span className={styles.zoomHint} aria-hidden="true"><Expand /></span>
                )}
                {many && (
                    <>
                        <button type="button" className={clsx(styles.arrow, styles.left)} onClick={() => go(-1)} aria-label="Fotografia anterioară">
                            <ChevronLeft />
                        </button>
                        <button type="button" className={clsx(styles.arrow, styles.right)} onClick={() => go(1)} aria-label="Fotografia următoare">
                            <ChevronRight />
                        </button>
                        <span className={styles.counter}>{index + 1} / {photos.length}</span>
                    </>
                )}
            </div>

            {many && (
                <ul className={styles.thumbs} aria-label="Fotografii">
                    {photos.map((photo, photoIndex) => (
                        <li key={photo.id}>
                            <button
                                type="button"
                                className={clsx(styles.thumb, photoIndex === index && styles.active)}
                                onClick={() => setIndex(photoIndex)}
                                aria-label={`Fotografia ${photoIndex + 1}`}
                                aria-current={photoIndex === index || undefined}
                            >
                                <ListingImage src={photo.url} alt="" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {current.url && (
                <Lightbox
                    open={zoomed}
                    onClose={() => setZoomed(false)}
                    src={apiUrl(current.url)}
                    alt={title}
                    caption={many ? `${title} · ${index + 1} / ${photos.length}` : title}
                    onPrev={many ? () => go(-1) : undefined}
                    onNext={many ? () => go(1) : undefined}
                />
            )}
        </div>
    );
}
