import clsx from 'clsx';
import { Quote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { QUOTES } from '../content';
import styles from './QuoteRotator.module.css';

const VISIBLE_MS = 6000;
const FADE_MS = 400;

const randomIndex = (exclude) => {
    if (QUOTES.length < 2) return 0;
    let index;
    do index = Math.floor(Math.random() * QUOTES.length); while (index === exclude);
    return index;
};

/** Rotates a random reading quote every few seconds with a cross-fade. */
export default function QuoteRotator() {
    const [index, setIndex] = useState(() => randomIndex(-1));
    const [fading, setFading] = useState(false);

    useEffect(() => {
        let fadeTimer;
        const timer = setInterval(() => {
            setFading(true);
            fadeTimer = setTimeout(() => {
                setIndex((current) => randomIndex(current));
                setFading(false);
            }, FADE_MS);
        }, VISIBLE_MS);
        return () => {
            clearInterval(timer);
            clearTimeout(fadeTimer);
        };
    }, []);

    const quote = QUOTES[index];
    return (
        <figure className={styles.wrapper}>
            <Quote className={styles.mark} aria-hidden="true" />
            <div className={clsx(styles.quote, fading && styles.fading)} aria-live="polite">
                <blockquote className={styles.text}>{quote.text}</blockquote>
                <figcaption className={styles.author}>— {quote.author}</figcaption>
            </div>
        </figure>
    );
}
