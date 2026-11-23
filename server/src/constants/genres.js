/**
 * Literary genres used across the catalogue, marketplace and user preferences.
 *
 * `code` is the stable identifier stored in the database and exchanged over the API.
 * `label` is the Romanian display name shown in the UI. It is also the value used by the
 * original (legacy) schema and by carturesti.ro, so the migration and the scraper rely on it.
 */
export const GENRES = Object.freeze([
    { code: 'fiction', label: 'FICTIUNE' },
    { code: 'children_teens', label: 'PENTRU COPII, ADOLESCENȚI' },
    { code: 'poetry_drama_literary_studies', label: 'POEZIE, TEATRU, STUDII LITERARE' },
    { code: 'biographies_memoirs', label: 'BIOGRAFII, MEMORII, JURNALE' },
    { code: 'history', label: 'ISTORIE' },
    { code: 'philosophy', label: 'FILOSOFIE' },
    { code: 'psychology', label: 'PSIHOLOGIE' },
    { code: 'religion', label: 'RELIGIE' },
    { code: 'social_sciences_politics', label: 'STIINTE SOCIALE. POLITICA' },
    { code: 'health_personal_development', label: 'SANATATE, DEZVOLTARE PERSONALA' },
    { code: 'art_architecture', label: 'ARTA, ARHITECTURA' },
    { code: 'business_economics', label: 'BUSINESS SI ECONOMIE' },
    { code: 'marketing_communication', label: 'MARKETING SI COMUNICARE' },
    { code: 'law', label: 'DREPT' },
    { code: 'medicine', label: 'MEDICINA' },
    { code: 'mathematics_sciences', label: 'STIINTE EXACTE. MATEMATICI' },
    { code: 'nature_environment', label: 'NATURA SI MEDIU' },
    { code: 'engineering_technology', label: 'TEHNICA SI TEHNOLOGIE' },
    { code: 'computers_internet', label: 'COMPUTERE SI INTERNET' },
    { code: 'lifestyle_sports_leisure', label: 'LIFESTYLE, SPORT, TIMP LIBER' },
    { code: 'comics', label: 'BENZI DESENATE' },
    { code: 'cooking', label: 'CULINARE' },
    { code: 'travel_guides_maps', label: 'GHIDURI SI HARTI TURISTICE, ATLASE' },
    { code: 'linguistics_dictionaries', label: 'LINGVISTICA, DICTIONARE' },
    { code: 'foreign_language_learning', label: 'LIMBI STRAINE' },
    { code: 'foreign_language_books', label: 'CARTE STRAINA' },
    { code: 'encyclopedias', label: 'ENCICLOPEDII' },
    { code: 'audiobooks', label: 'AUDIOBOOKS' },
    { code: 'romania', label: 'ROMANIA' },
    { code: 'romanian_magazines', label: 'REVISTE-LIMBA ROMANA' },
    { code: 'urban_traditional_culture', label: 'CULTURA URBANA SI TRADITIONALA' },
    { code: 'educational_software', label: 'SOFT EDUCATIONAL' },
    { code: 'other', label: 'ALTELE' },
]);

export const FALLBACK_GENRE = 'other';

export const GENRE_CODES = Object.freeze(GENRES.map((genre) => genre.code));

const byCode = new Map(GENRES.map((genre) => [genre.code, genre]));

export const isGenreCode = (value) => byCode.has(value);

export const genreLabel = (code) => byCode.get(code)?.label ?? code;

/** Case- and diacritic-insensitive form of a label ("Adolescenți" -> "adolescenti"). */
export const normalizeLabel = (label) => String(label ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase();

const byLabel = new Map(GENRES.map((genre) => [normalizeLabel(genre.label), genre.code]));

/** Finds the code of a genre from its Romanian label (case- and diacritic-insensitive). */
export const genreCodeFromLabel = (label) => byLabel.get(normalizeLabel(label)) ?? null;
