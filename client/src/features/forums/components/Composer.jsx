import clsx from 'clsx';
import { Bold, Eye, Italic, Link2, List, Pencil, Quote } from 'lucide-react';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Textarea } from '@/shared/ui';
import { MAX_POST_LENGTH } from '../constants';
import RichText from './RichText';
import styles from './Composer.module.css';

const TOOLS = [
    { label: 'Îngroșat', icon: <Bold />, wrap: ['**', '**'], placeholder: 'text îngroșat' },
    { label: 'Cursiv', icon: <Italic />, wrap: ['*', '*'], placeholder: 'text cursiv' },
    { label: 'Citat', icon: <Quote />, linePrefix: '> ', placeholder: 'citat' },
    { label: 'Listă', icon: <List />, linePrefix: '- ', placeholder: 'element' },
    { label: 'Link', icon: <Link2 />, wrap: ['', ''], placeholder: 'https://' },
];

/**
 * Text editor for forum posts: a toolbar for the supported formatting, a live preview and a
 * character counter. Controlled (`value` / `onChange(text)`); the ref exposes `focus()`.
 */
const Composer = forwardRef(function Composer({
    value, onChange, label = 'Mesajul tău', placeholder, rows = 5, maxLength = MAX_POST_LENGTH, autoFocus, error, className,
}, ref) {
    const textareaRef = useRef(null);
    const [previewing, setPreviewing] = useState(false);
    useImperativeHandle(ref, () => ({
        focus: () => {
            setPreviewing(false);
            requestAnimationFrame(() => textareaRef.current?.focus());
        },
    }));

    const apply = (tool) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const { selectionStart: start, selectionEnd: end } = textarea;
        const selected = value.slice(start, end) || tool.placeholder;
        let replacement;
        if (tool.linePrefix) {
            replacement = selected.split('\n').map((line) => `${tool.linePrefix}${line}`).join('\n');
            // Block formatting starts on its own line.
            if (start > 0 && value[start - 1] !== '\n') replacement = `\n${replacement}`;
        } else {
            replacement = `${tool.wrap[0]}${selected}${tool.wrap[1]}`;
        }
        const next = value.slice(0, start) + replacement + value.slice(end);
        if (next.length > maxLength) return;
        onChange(next);
        requestAnimationFrame(() => {
            textarea.focus();
            const cursor = start + replacement.length;
            textarea.setSelectionRange(cursor, cursor);
        });
    };

    return (
        <div className={clsx(styles.composer, error && styles.invalid, className)}>
            <div className={styles.toolbar} role="toolbar" aria-label="Formatare">
                <div className={styles.tabs}>
                    <button type="button" className={clsx(styles.tab, !previewing && styles.active)} onClick={() => setPreviewing(false)}>
                        <Pencil aria-hidden="true" /> Scrie
                    </button>
                    <button type="button" className={clsx(styles.tab, previewing && styles.active)} onClick={() => setPreviewing(true)}>
                        <Eye aria-hidden="true" /> Previzualizare
                    </button>
                </div>
                {!previewing && (
                    <div className={styles.tools}>
                        {TOOLS.map((tool) => (
                            <button key={tool.label} type="button" className={styles.tool} title={tool.label} aria-label={tool.label} onClick={() => apply(tool)}>
                                {tool.icon}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {previewing ? (
                <div className={styles.preview}>
                    {value.trim() ? <RichText text={value} /> : <p className={styles.empty}>Nimic de previzualizat încă.</p>}
                </div>
            ) : (
                <Textarea
                    ref={textareaRef}
                    aria-label={label}
                    className={styles.textarea}
                    placeholder={placeholder}
                    rows={rows}
                    maxLength={maxLength}
                    autoFocus={autoFocus}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
            <div className={styles.footer}>
                <span className={styles.hint}>**îngroșat** · *cursiv* · &gt; citat · - listă</span>
                <span className={clsx(styles.counter, value.length > maxLength * 0.9 && styles.counterWarn)}>
                    {value.length.toLocaleString('ro-RO')}/{maxLength.toLocaleString('ro-RO')}
                </span>
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
    );
});

export default Composer;
