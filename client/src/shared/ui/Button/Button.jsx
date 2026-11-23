import clsx from 'clsx';
import { forwardRef } from 'react';
import { Link } from 'react-router';
import Spinner from '../Spinner/Spinner';
import styles from './Button.module.css';

/**
 * Button with consistent variants. Renders a router <Link> when `to` is given and an <a> for `href`.
 *
 * @param {'primary'|'secondary'|'soft'|'ghost'|'neutral'|'danger'} variant
 * @param {'sm'|'md'|'lg'} size
 */
const Button = forwardRef(function Button(
    {
        variant = 'primary',
        size = 'md',
        loading = false,
        fullWidth = false,
        leftIcon,
        rightIcon,
        to,
        href,
        className,
        children,
        disabled,
        type = 'button',
        ...rest
    },
    ref,
) {
    const classes = clsx(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        loading && styles.loading,
        className,
    );
    const content = (
        <>
            {loading ? <Spinner size="sm" className={styles.spinner} /> : leftIcon}
            {children && <span className={styles.label}>{children}</span>}
            {!loading && rightIcon}
        </>
    );

    if (to) {
        return <Link ref={ref} to={to} className={classes} {...rest}>{content}</Link>;
    }
    if (href) {
        return <a ref={ref} href={href} className={classes} {...rest}>{content}</a>;
    }
    return (
        <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
            {content}
        </button>
    );
});

export default Button;
