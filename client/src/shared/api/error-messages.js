/**
 * The API answers with English, developer-facing messages; users get Romanian ones.
 * Callers pass a context-specific fallback; well-known statuses get a generic message.
 */
const MESSAGES_BY_STATUS = {
    0: 'Nu ne-am putut conecta la server. Verifică-ți conexiunea și încearcă din nou.',
    401: 'Sesiunea ta a expirat. Conectează-te din nou.',
    403: 'Nu ai permisiunea de a face această acțiune.',
    404: 'Nu am găsit ce căutai.',
    413: 'Fișierul este prea mare.',
    429: 'Prea multe încercări. Mai încearcă puțin mai târziu.',
    502: 'Un serviciu extern nu a răspuns corect. Încearcă din nou.',
    503: 'Serviciul nu este disponibil momentan.',
};

export const getErrorMessage = (error, fallback = 'A apărut o eroare. Încearcă din nou.') => {
    const status = error?.status;
    if (status === 400 || status === 409 || status === undefined) return fallback;
    return MESSAGES_BY_STATUS[status] ?? fallback;
};
