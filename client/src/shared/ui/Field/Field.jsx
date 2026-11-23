import clsx from 'clsx';
import { forwardRef, useId } from 'react';
import styles from './Field.module.css';

/**
 * Label + hint + error around a form control. `children` is a render function that receives the
 * accessibility props (`id`, `aria-describedby`, `aria-invalid`, `required`) for the control.
 */
export function Field({ label, hint, error, required, id: providedId, className, children }) {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const controlProps = {
        id,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
        required,
    };

    return (
        <div className={clsx(styles.field, className)}>
            {label && (
                <label className={styles.label} htmlFor={id}>
                    {label}
                    {required && <span className={styles.required} aria-hidden="true">*</span>}
                </label>
            )}
            {children(controlProps)}
            {hint && !error && <p id={hintId} className={styles.hint}>{hint}</p>}
            {error && <p id={errorId} className={styles.error} role="alert">{error}</p>}
        </div>
    );
}

/** Renders the control bare, or inside a <Field> when a label, hint or error is given. */
function FieldOrBare({ label, hint, error, required, id, className, render }) {
    if (!label && !hint && !error) return render({ id, required }, className);
    return (
        <Field label={label} hint={hint} error={error} required={required} id={id} className={className}>
            {(controlProps) => render(controlProps)}
        </Field>
    );
}

/** Text input. Supports `leadingIcon` (e.g. a search icon) and `trailing` (e.g. a clear button). */
export const Input = forwardRef(function Input(
    { label, hint, error, required, id, className, leadingIcon, trailing, ...props },
    ref,
) {
    return (
        <FieldOrBare
            label={label}
            hint={hint}
            error={error}
            required={required}
            id={id}
            className={className}
            render={(controlProps, bareClassName) => {
                if (!leadingIcon && !trailing) {
                    return <input ref={ref} className={clsx(styles.control, bareClassName)} {...controlProps} {...props} />;
                }
                return (
                    <div className={clsx(styles.inputGroup, bareClassName)}>
                        {leadingIcon && <span className={styles.leadingIcon} aria-hidden="true">{leadingIcon}</span>}
                        <input
                            ref={ref}
                            className={clsx(styles.control, leadingIcon && styles.withLeading, trailing && styles.withTrailing)}
                            {...controlProps}
                            {...props}
                        />
                        {trailing && <span className={styles.trailing}>{trailing}</span>}
                    </div>
                );
            }}
        />
    );
});

export const Textarea = forwardRef(function Textarea({ label, hint, error, required, id, className, ...props }, ref) {
    return (
        <FieldOrBare
            label={label}
            hint={hint}
            error={error}
            required={required}
            id={id}
            className={className}
            render={(controlProps, bareClassName) => (
                <textarea ref={ref} className={clsx(styles.control, styles.textarea, bareClassName)} {...controlProps} {...props} />
            )}
        />
    );
});

export const Select = forwardRef(function Select({ label, hint, error, required, id, className, children, ...props }, ref) {
    return (
        <FieldOrBare
            label={label}
            hint={hint}
            error={error}
            required={required}
            id={id}
            className={className}
            render={(controlProps, bareClassName) => (
                <select ref={ref} className={clsx(styles.control, styles.select, bareClassName)} {...controlProps} {...props}>
                    {children}
                </select>
            )}
        />
    );
});
