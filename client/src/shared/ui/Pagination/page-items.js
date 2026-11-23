/**
 * Compact list of page buttons: first, last, and a window around the current page,
 * with 'ellipsis' markers for the gaps. e.g. (6, 20) -> [1, '…', 5, 6, 7, '…', 20]
 */
export const getPageItems = (page, totalPages, siblings = 1) => {
    if (totalPages <= 1) return [1];
    const window = new Set([1, totalPages]);
    for (let p = page - siblings; p <= page + siblings; p += 1) {
        if (p >= 1 && p <= totalPages) window.add(p);
    }
    const pages = [...window].sort((a, b) => a - b);

    const items = [];
    pages.forEach((p, index) => {
        const previous = pages[index - 1];
        if (previous !== undefined && p - previous === 2) items.push(previous + 1);
        else if (previous !== undefined && p - previous > 2) items.push(`ellipsis-${previous}`);
        items.push(p);
    });
    return items;
};
