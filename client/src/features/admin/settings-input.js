/** Parses the text of a field; returns `{ value }` or a Romanian `{ error }`. */
export const parseSettingInput = (definition, text) => {
    if (definition.type === 'boolean') return { value: Boolean(text) };
    if (definition.type === 'string') {
        const value = text.trim();
        if (definition.key.endsWith('.model') && !value) return { error: 'Câmpul este obligatoriu.' };
        if (value.length > definition.maxLength) return { error: `Maximum ${definition.maxLength} caractere.` };
        return { value };
    }
    const number = Number(String(text).replace(',', '.'));
    if (String(text).trim() === '' || !Number.isFinite(number)) return { error: 'Introdu un număr.' };
    if (definition.type === 'integer' && !Number.isInteger(number)) return { error: 'Introdu un număr întreg.' };
    if (number < definition.min || number > definition.max) {
        return { error: `Valoarea trebuie să fie între ${definition.min} și ${definition.max}.` };
    }
    return { value: number };
};
