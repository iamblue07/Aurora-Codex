import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import BookCard, { BookCardSkeleton } from '@/features/books/components/BookCard';
import { ErrorState } from '@/shared/ui';
import styles from './BookCarousel.module.css';

/** Auto-scroll speed, in pixels per second. */
const SPEED = 32;
/** After the reader scrolls, drags or clicks an arrow, the carousel waits this long before drifting again. */
const RESUME_AFTER_MS = 3000;
/** A press that moved more than this is a drag, not a click on a book. */
const DRAG_THRESHOLD = 6;

const prefersReducedMotion = () => {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
};

/**
 * Endless, scrollable carousel of books. It drifts slowly on its own, and the reader can scroll it
 * at any time (touch, trackpad, shift + wheel, mouse drag or the arrow buttons). The list is rendered
 * twice; whenever the scroll position passes one full copy it jumps back by exactly that width, so the
 * loop is seamless in both directions. No auto-scroll for users who prefer reduced motion.
 */
export default function BookCarousel({ books, loading, error, onRetry }) {
    const viewportRef = useRef(null);
    const pausedUntil = useRef(0);
    const hovering = useRef(false);
    const drag = useRef(null);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport || !books?.length) return undefined;
        const half = () => viewport.scrollWidth / 2;
        let position = viewport.scrollLeft;
        let last = performance.now();
        let frame;

        // Keep the position inside the first copy, whichever way the reader scrolled.
        const wrap = () => {
            const width = half();
            if (width <= 0) return;
            // Non-overlapping bounds: landing exactly on `width` after a backward wrap must not
            // trigger a forward wrap on the next frame (and vice versa).
            if (viewport.scrollLeft > width) viewport.scrollLeft -= width;
            else if (viewport.scrollLeft < 1) viewport.scrollLeft += width;
        };

        const tick = (now) => {
            const elapsed = Math.min(64, now - last); // a background tab must not jump on return
            last = now;
            const idle = !hovering.current && !drag.current && now > pausedUntil.current;
            if (idle && !prefersReducedMotion()) {
                position += (SPEED * elapsed) / 1000;
                if (position >= half()) position -= half();
                viewport.scrollLeft = position;
            } else {
                wrap();
                position = viewport.scrollLeft; // follow the reader, continue from there
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);

        const pause = () => { pausedUntil.current = performance.now() + RESUME_AFTER_MS; };
        const events = ['wheel', 'touchstart', 'touchmove', 'keydown'];
        events.forEach((type) => viewport.addEventListener(type, pause, { passive: true }));
        return () => {
            cancelAnimationFrame(frame);
            events.forEach((type) => viewport.removeEventListener(type, pause));
        };
    }, [books]);

    if (error) return <ErrorState compact onRetry={onRetry} />;

    if (loading) {
        return (
            <div className={styles.static}>
                {Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.item}><BookCardSkeleton /></div>)}
            </div>
        );
    }

    const scrollByCards = (direction) => {
        const viewport = viewportRef.current;
        const card = viewport?.querySelector('li')?.offsetWidth ?? 180;
        pausedUntil.current = performance.now() + RESUME_AFTER_MS;
        viewport?.scrollBy({ left: direction * card * 2, behavior: 'smooth' });
    };

    // Mouse drag to scroll (touch and trackpads scroll natively).
    const onPointerDown = (event) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        drag.current = { x: event.clientX, scrollLeft: viewportRef.current.scrollLeft, moved: false };
    };
    const onPointerMove = (event) => {
        if (!drag.current) return;
        const dx = event.clientX - drag.current.x;
        if (Math.abs(dx) > DRAG_THRESHOLD) drag.current.moved = true;
        if (drag.current.moved) viewportRef.current.scrollLeft = drag.current.scrollLeft - dx;
    };
    const endDrag = () => {
        if (!drag.current) return;
        const { moved } = drag.current;
        pausedUntil.current = performance.now() + RESUME_AFTER_MS;
        // Leave the flag for the click that follows a drag, so it doesn't open a book.
        setTimeout(() => { drag.current = null; }, 0);
        if (!moved) drag.current = null;
    };
    const onClickCapture = (event) => {
        if (drag.current?.moved) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    return (
        <div className={styles.carousel}>
            <button type="button" className={`${styles.arrow} ${styles.left}`} onClick={() => scrollByCards(-1)} aria-label="Cărțile anterioare">
                <ChevronLeft />
            </button>
            <div
                ref={viewportRef}
                className={styles.viewport}
                onMouseEnter={() => { hovering.current = true; }}
                onMouseLeave={() => { hovering.current = false; endDrag(); }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onClickCapture={onClickCapture}
                onDragStart={(event) => event.preventDefault()}
                onFocus={() => { pausedUntil.current = performance.now() + RESUME_AFTER_MS * 2; }}
            >
                <ul className={styles.track} role="list">
                    {[...books, ...books].map((book, index) => (
                        <li key={`${book.id}-${index}`} className={styles.item} aria-hidden={index >= books.length || undefined}>
                            <BookCard book={book} />
                        </li>
                    ))}
                </ul>
            </div>
            <button type="button" className={`${styles.arrow} ${styles.right}`} onClick={() => scrollByCards(1)} aria-label="Cărțile următoare">
                <ChevronRight />
            </button>
        </div>
    );
}
