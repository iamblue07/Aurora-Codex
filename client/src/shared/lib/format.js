const LOCALE = 'ro-RO';

const wholePriceFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimalPriceFormatter = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const countFormatter = new Intl.NumberFormat(LOCALE);
const percentFormatter = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1 });

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const timeFormatter = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });
const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

const toDate = (value) => (value instanceof Date ? value : new Date(value));
const isValid = (date) => !Number.isNaN(date.getTime());

/** 24.9 -> "24,90 lei", 45 -> "45 lei", 1250 -> "1.250 lei"; null/undefined -> "—". */
export const formatPrice = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    const number = Number(value);
    const formatter = Number.isInteger(number) ? wholePriceFormatter : decimalPriceFormatter;
    return `${formatter.format(number)} lei`;
};

/** 56373 -> "56.373". */
export const formatCount = (value) => countFormatter.format(value);

/** A 0–100 percentage: 25.55 -> "25,6 %" (Romanian spacing and decimal comma). */
export const formatPercent = (value) => percentFormatter.format(Number(value) / 100);

/** 4 -> "4,0" with a fixed number of decimals, e.g. for average ratings. */
export const formatDecimal = (value, digits = 1) => new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
}).format(value);

export const formatDate = (value) => {
    const date = toDate(value);
    return isValid(date) ? dateFormatter.format(date) : '';
};

export const formatDateTime = (value) => {
    const date = toDate(value);
    return isValid(date) ? dateTimeFormatter.format(date) : '';
};

export const formatTime = (value) => {
    const date = toDate(value);
    return isValid(date) ? timeFormatter.format(date) : '';
};

const RELATIVE_STEPS = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['week', 7 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
];

/** "acum 3 zile", "ieri", "acum" … */
export const formatRelativeTime = (value, now = Date.now()) => {
    const date = toDate(value);
    if (!isValid(date)) return '';
    const seconds = Math.round((date.getTime() - now) / 1000);
    for (const [unit, size] of RELATIVE_STEPS) {
        if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.round(seconds / size), unit);
    }
    return 'acum';
};

/** "Ana Maria" -> "AM", "dani07" -> "DA". */
export const initials = (name = '') => {
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
};

/** Romanian plural helper: plural(3, 'carte', 'cărți') -> "3 cărți". */
export const plural = (count, singular, pluralForm) => {
    if (count === 1) return `1 ${singular}`;
    // Romanian inserts "de" for 20+ (e.g. "21 de cărți"), except numbers ending in 01-19.
    const lastTwo = count % 100;
    const needsDe = count >= 20 && (lastTwo === 0 || lastTwo >= 20);
    return `${countFormatter.format(count)}${needsDe ? ' de' : ''} ${pluralForm}`;
};
