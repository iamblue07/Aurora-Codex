/** Romanian texts of the admin panel (the API uses English keys). */
import { formatCount } from '@/shared/lib/format';

export const JOB_TYPE_LABELS = {
    scraper: {
        title: 'Scraper catalog',
        description: 'Adaugă cărți noi din librăria Cărturești și actualizează prețurile celor existente.',
    },
    embeddings: {
        title: 'Vectori semantici',
        description: 'Transformă fiecare carte într-un vector care îi surprinde sensul. Recomandările au nevoie de ei.',
    },
    emotions: {
        title: 'Analiză emoțională',
        description: 'Estimează tonul emoțional al descrierilor (bucurie, suspans…), folosit la ordonarea recomandărilor.',
    },
};

export const JOB_STATUS_LABELS = {
    running: { label: 'În desfășurare', tone: 'primary' },
    completed: { label: 'Finalizată', tone: 'success' },
    failed: { label: 'Eșuată', tone: 'danger' },
    cancelled: { label: 'Anulată', tone: 'neutral' },
    interrupted: { label: 'Întreruptă', tone: 'warning' },
};

export const SCOPE_OPTIONS = {
    embeddings: [
        { value: 'missing', label: 'Doar cărțile noi sau modificate' },
        { value: 'all', label: 'Toate cărțile (regenerare completă)' },
    ],
    emotions: [
        { value: 'missing', label: 'Doar cărțile fără scoruri' },
        { value: 'all', label: 'Toate cărțile (recalculare completă)' },
    ],
};

/** Why an unsuccessful job ended, in Romanian (the server's own message is technical English). */
export const STOP_REASONS = {
    failed: 'Sarcina s-a oprit din cauza unei erori.',
    cancelled: 'Sarcina a fost oprită de un administrator.',
    interrupted: 'Serverul a repornit în timpul sarcinii. Pornește-o din nou: continuă de unde a rămas.',
};

/** One-line summary of a finished job's result. */
export const describeResult = (job) => {
    const result = job.result;
    if (!result) return null;
    const count = (value) => formatCount(value ?? 0);
    switch (job.type) {
        case 'scraper':
            return `${count(result.created)} cărți noi · ${count(result.updated)} actualizate · ${count(result.failures)} erori`;
        case 'embeddings':
            return `${count(result.embedded)} vectori noi · ${count(result.skipped)} neschimbați · `
                + `${count(result.failed)} erori · ${count(result.tokens)} tokeni`;
        case 'emotions':
            return `${count(result.scored)} cărți analizate · ${count(result.failed)} erori · ${count(result.tokens)} tokeni`;
        default:
            return null;
    }
};

export const SETTING_GROUPS = [
    { key: 'embeddings', title: 'Căutare semantică', description: 'Cum sunt transformate cărțile și căutările în vectori.' },
    { key: 'recommendations', title: 'Recomandări', description: 'Cum sunt alese și ordonate cărțile recomandate.' },
    { key: 'emotions', title: 'Analiză emoțională', description: 'Modelul care estimează tonul emoțional al descrierilor.' },
    { key: 'scraper', title: 'Scraper', description: 'Ritmul în care sunt citite paginile librăriei.' },
];

export const SETTING_LABELS = {
    'embeddings.model': {
        label: 'Model pentru vectori',
        hint: 'Numele modelului de embeddings de pe DeepInfra. Dacă îl schimbi, regenerează vectorii.',
    },
    'embeddings.dimensions': {
        label: 'Dimensiunea vectorilor',
        hint: 'Câte valori se păstrează din fiecare vector: mai puține înseamnă mai puțină memorie. Dacă o schimbi, regenerează vectorii.',
    },
    'embeddings.batchSize': { label: 'Cărți per cerere', hint: 'Câte descrieri se trimit într-o singură cerere.' },
    'embeddings.concurrency': { label: 'Cereri în paralel' },
    'embeddings.maxChars': { label: 'Lungimea maximă a textului', hint: 'Descrierile mai lungi sunt scurtate (caractere).' },
    'embeddings.queryInstruction': {
        label: 'Instrucțiune pentru căutări',
        hint: 'Adăugată în fața căutărilor, în formatul modelelor Qwen3. Las-o goală pentru alte modele.',
    },
    'recommendations.resultCount': { label: 'Număr de recomandări' },
    'recommendations.candidatePool': {
        label: 'Candidați analizați',
        hint: 'Câte cărți apropiate ca sens sunt reordonate apoi după emoție și gen.',
    },
    'recommendations.emotionWeight': {
        label: 'Ponderea emoției',
        hint: '0 = contează doar sensul, 1 = contează doar tonul emoțional ales.',
    },
    'recommendations.genreBoost': { label: 'Bonus pentru genurile preferate', hint: 'Se adaugă la scorul cărților din genurile preferate.' },
    'recommendations.minTasteRating': {
        label: 'Nota minimă pentru gusturi',
        hint: 'Cărțile notate cel puțin atât definesc gusturile cititorului.',
    },
    'recommendations.excludeRead': { label: 'Exclude cărțile deja citite' },
    'emotions.model': {
        label: 'Model pentru analiza emoțională',
        hint: 'Model de limbaj (chat) de pe DeepInfra, care citește descrierile direct în română.',
    },
    'emotions.concurrency': { label: 'Cereri în paralel' },
    'emotions.maxChars': { label: 'Lungimea maximă a descrierii', hint: 'Caractere trimise modelului pentru fiecare carte.' },
    'emotions.minDescriptionLength': {
        label: 'Lungimea minimă a descrierii',
        hint: 'Descrierile mai scurte nu au destul conținut pentru a fi analizate.',
    },
    'scraper.concurrency': { label: 'Pagini de carte în paralel' },
    'scraper.requestDelayMs': { label: 'Pauză între cereri (ms)', hint: 'O pauză mai mare încarcă mai puțin serverele librăriei.' },
};
