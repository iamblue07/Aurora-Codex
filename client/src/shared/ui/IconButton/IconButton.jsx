import clsx from 'clsx';
import { forwardRef } from 'react';
import styles from './IconButton.module.css';

/** Square/round icon-only button. `label` is required: it becomes the accessible name. */
const IconButton = forwardRef(function IconButton(
    { label, variant = 'ghost', size = 'md', className, children, type = 'button', ...rest },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            aria-label={label}
            title={label}
            className={clsx(styles.iconButton, styles[variant], styles[size], className)}
            {...rest}
        >
            {children}
        </button>
    );
});

export default IconButton;
