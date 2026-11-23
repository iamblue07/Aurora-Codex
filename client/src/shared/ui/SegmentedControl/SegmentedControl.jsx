import clsx from 'clsx';
import styles from './SegmentedControl.module.css';

/** Pill-shaped tab switcher. `options`: [{ value, label, icon? }]. */
export default function SegmentedControl({ options, value, onChange, label, className }) {
    return (
        <div className={clsx(styles.control, className)} role="tablist" aria-label={label}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={option.value === value}
                    className={clsx(styles.option, option.value === value && styles.active)}
                    onClick={() => onChange(option.value)}
                >
                    {option.icon}
                    {option.label}
                </button>
            ))}
        </div>
    );
}
