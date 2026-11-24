/** Book conditions, best first (codes match the API). */
export const CONDITIONS = [
    { value: 'new', label: 'Nouă', hint: 'Necitită, ca din librărie.' },
    { value: 'like_new', label: 'Ca nouă', hint: 'Citită o dată, fără urme de folosire.' },
    { value: 'very_good', label: 'Foarte bună', hint: 'Urme minime de folosire, fără însemnări.' },
    { value: 'good', label: 'Bună', hint: 'Uzură vizibilă, dar completă și curată.' },
    { value: 'acceptable', label: 'Acceptabilă', hint: 'Uzată, cu însemnări sau pete, dar lizibilă.' },
];

const CONDITION_LABELS = Object.fromEntries(CONDITIONS.map((condition) => [condition.value, condition.label]));
export const conditionLabel = (code) => CONDITION_LABELS[code] ?? 'Necunoscută';

export const LISTING_SORT_OPTIONS = [
    { value: 'newest', label: 'Cele mai noi' },
    { value: 'popular', label: 'Cele mai populare' },
    { value: 'price_asc', label: 'Preț crescător' },
    { value: 'price_desc', label: 'Preț descrescător' },
    { value: 'oldest', label: 'Cele mai vechi' },
];

export const MAX_LISTING_IMAGES = 6;
export const MAX_IMAGE_SIZE_MB = 10;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const LISTINGS_PER_PAGE = 12;

/** Discount of `price` against a bookstore price, in whole percent (null when not cheaper). */
export const discountPercent = (price, storePrice) => {
    if (!storePrice || Number(price) >= storePrice) return null;
    return Math.round((1 - Number(price) / storePrice) * 100);
};

/** Toggles one code in a comma-separated list ("good,new"). */
export const toggleInList = (list, code) => {
    const items = list ? list.split(',') : [];
    return (items.includes(code) ? items.filter((item) => item !== code) : [...items, code]).join(',');
};
