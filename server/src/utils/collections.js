/** Re-orders `rows` to follow the order of `ids`; ids without a matching row are dropped. */
export const orderByIds = (rows, ids, getId = (row) => row.id) => {
    const byId = new Map(rows.map((row) => [getId(row), row]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
};

/** Standard envelope for paginated list responses. */
export const paginated = (items, { page, limit, total }) => ({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
});
