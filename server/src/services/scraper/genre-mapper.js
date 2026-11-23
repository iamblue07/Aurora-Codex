/**
 * Maps carturesti.ro category names (Romanian, as shown on the store) onto our genre codes.
 * Each group below starts with the store's top-level category, followed by its sub-categories.
 */
import { FALLBACK_GENRE, genreCodeFromLabel, normalizeLabel } from '../../constants/genres.js';

const audiobooks = 'AUDIOBOOKS'
const cooking = 'CULINARE'
const art = [
    "ARTA, ARHITECTURA",
    "Teoria artei",
    "Tehnici de desen",
    "Istoria artei",
    "Pictura, grafica, alte forme artistice",
    "Fotografie",
    "Arta comerciala si industriala",
    "Design interior",
    "Arhitectura",
    "Teatru",
    "Film, TV, radio",
    "Dans, performing arts",
    "Muzica"
];
const encyclopedias = 'ENCICLOPEDII'
const biographies = 'BIOGRAFII, MEMORII, JURNALE'
const dictionaries = [
    "LINGVISTICA, DICTIONARE",
    "Dictionare",
    "Gramatica",
    "Creative writing",
    "Istoria limbajului",
    "Lingvistica"
  ];
const magazines = [
    "REVISTE-LIMBA ROMANA",
    "Arhitext design",
    "CSF",
    "Decat o Revista",
    "Fundatia Culturala Secolul 21",
    "Igloo",
    "Iocan",
    "Lettre Internationale",
    "Revista Arta",
    "Revista Film",
    "Revista romana de comunicare si relatii publice",
    "Scena9",
    "Today Software",
    "Zeppelin",
    "Alte reviste"
  ];
const languages = [
    "LIMBI STRAINE",
    "Invatarea limbilor straine",
     "Dictionare"];
const poetry = [
    "POEZIE, TEATRU, STUDII LITERARE",
    "Poezie",
    "Piese de teatru, scenarii",
    "Eseistica",
    "Antologii",
    "Istorie si critica"
  ];
const fiction = [
    "fiction",
    "Clasici",
    "Moderni, contemporani",
    "Crime, mister",
    "Thriller, horror",
    "Young adult",
    "Aventura",
    "SF",
    "Fantasy",
    "Fictiune erotica",
    "Fictiune mitologica si istorica",
    "Romance",
    "Proza scurta, altele"
  ];
const comics = [
    "BENZI DESENATE",
    "Romane ilustrate",
    "Comics",
    "Manga"
  ];
const guides = [
    "GHIDURI SI HARTI TURISTICE, ATLASE",
    "Atlase, harti, referinte geografice",
    "Turism si calatorii"
  ];
const history = [
    "ISTORIE",
    "Istorie generala",
    "Arheologie",
    "Istoria Europei",
    "Istoria romanilor",
    "Istorie militara, aparare",
    "Muzeologie",
    "Relatii internationale",
    "Istorie universala",
    "Istorie economica",
    "Istoria mentalitatilor",
    "Istorii secrete"
  ];
const religion = [
    "RELIGIE",
    "Generalitati, istoria religiilor",
    "Crestinism",
    "Buddhism", 
    "Hinduism",
    "Islam",
    "Iudaism",
    "Alte religii si credinte",
    "Ocultism si ezoterism"
  ];
const philosophy = [
    "FILOSOFIE",
    "Istoria filosofiei occidentale",
    "Metafizica si ontologie",
    "Epistemologie, teoria cunoasterii",
    "Logica",
    "Filosofia mintii",
    "Filosofia limbajului",
    "Estetica",
    "Semiotica",
    "Etica si morala",
    "Filosofia stiintei",
    "Filosofie social-politica",
    "Filosofie non-occidentala",
    "Filosofie populara"
  ];
const psychology = [
    "PSIHOLOGIE",
    "Teorie generala, scoli",
    "Metodologie, testare",
    "Psihologia copilului si dezvoltarii",
    "Psihoterapie",
    "Psihologia varstelor si a sexelor",
    "Psihologia familiei",
    "Psihologia sociala si de grup",
    "Psihologia ocupationala",
    "Psihologia criminalistica si legala",
    "Neuropsihologie, biopsihologie",
    "Psihologia emotiilor",
    "Psihologia cognitiva",
    "Eu, ego, identitate, personalitate"
];
const politics = [
    "STIINTE SOCIALE. POLITICA",
    "Studii culturale",
    "Studii interdisciplinare",
    "Sociologie, antropologie",
    "Criminologie",
    "Educatie",
    "Politologie si guvernare",
    "Relatii internationale",
    "Doctrine si partide politice",
    "Aparare nationala",
    "Publicistica si jurnalism"
  ];

const marketing = [
    "MARKETING SI COMUNICARE",
    "Publicitate si media",
    "Relatii publice", 
    "Industria comunicarii"
  ];
const business = [
    "BUSINESS SI ECONOMIE",
    "Economie",
    "Strategie",
    "Finante si contabilitate",
    "Business",
    "Antreprenoriat",
    "Tehnici de management",
    "Marketing si vanzari"
  ];
const law = [
    "DREPT",
    "Drept international",
    "Teorie generala, jurisprudenta",
    "Drept civil",
    "Drept comercial",
    "Drept constitutional",
    "Drept penal",
    "Legislatia muncii",
    "Dreptul mediului, transport",
    "Dreptul familiei",
    "Drept financiar",
    "Proprietate intelectuala",
    "Drept social"
  ];
const medicine = [
    "MEDICINA",
    "Aspecte generale",
    "Preclinic: anatomie, fiziologie",
    "Medicina clinica si interna",
    "Stomatologie",
    "Farmacologie",
    "Psihiatrie, psihologie clinica, terapii",
    "Medicina sportiva",
    "Alte forme de medicina",
    "Chirurgie",
    "Ingrijire si asistenta",
    "Ghiduri si referinte",
    "Medicina complementara",
    "Medicina veterinara"
  ];
const mathematics = [
    "STIINTE EXACTE. MATEMATICI",
    "Matematica",
    "Istoria stiintei si generalitati",
    "Astronomie, spatiu, timp",
    "Fizica",
    "Chimie",
    "Biologie"
  ];
const nature = [
    "NATURA SI MEDIU",
    "Stiintele Pamantului",
    "Geografie", 
    "Mediu si ecologie"
  ];
const technology = [
    "TEHNICA SI TEHNOLOGIE",
    "Tehnologie: generalitati",
    "Mecanica si stiinta materialelor",
    "Electronica si comunicatii",
    "Constructii",
    "Alte tehnologii",
    "Agricultura"
  ];
const computers = [
    "COMPUTERE SI INTERNET",
    "Lifestyle digital",
    "Programare, dezvoltare",
    "Retele si comunicatii",
    "Inteligenta artificiala"
  ];
const wellness = [
    "SANATATE, DEZVOLTARE PERSONALA",
    "Fitness si dieta",
    "Parenting",
    "Medicina naturista, ingrijire",
    "Familie, sanatate",
    "Dezvoltare personala",
    "Fenomene paranormale",
    "Interpretarea viselor",
    "Terapii complementare",
    "Astrologie",
    "Numerologie",
    "Cartomantie, alte preziceri",
    "Minte, corp, spirit"
  ];
const lifestyle = [
    "LIFESTYLE, SPORT, TIMP LIBER",
    'Carti de colorat pentru adulti',
    'Antichitati, colectii',
    'Hobby, jocuri',
    'Obiecte decorative',
    'Navigatie',
    'Auto, transport, deplasare',
    'Umor',
    'Lifestyle, fashion',
    'Casa, gradina, familie',
    'Lumea naturii, animale',
    'Sport si recreere',
    'Calatorii'
]
const romania = 'ROMANIA'
const education = [
    "SOFT EDUCATIONAL",
    'Primar',
    'Gimnazial',
    'Liceal',
    'Pachete educationale'
]

/** Store sub-categories grouped by top-level genre (the first item is the genre label itself). */
const CATEGORIES = [
    audiobooks, cooking, art, encyclopedias, biographies, dictionaries, magazines, languages, poetry,
    fiction, comics, guides, history, religion, philosophy, psychology, politics, marketing, business,
    law, medicine, mathematics, nature, technology, computers, wellness, lifestyle, romania, education,
].map((group) => [group].flat());

/**
 * Lower-cased store sub-category -> genre code. Built once; when a sub-category appears under several
 * genres (e.g. "Dictionare"), the first group in CATEGORIES wins.
 */
const GENRE_LOOKUP = new Map();
for (const [label, ...subCategories] of CATEGORIES) {
    const code = genreCodeFromLabel(label);
    for (const name of [label, ...subCategories]) {
        const key = normalizeLabel(name);
        if (!GENRE_LOOKUP.has(key)) GENRE_LOOKUP.set(key, code);
    }
}

/** Maps a carturesti.ro category name to one of our genre codes (FALLBACK_GENRE when unknown). */
const mapToGenre = (categoryName) => {
    if (!categoryName) return FALLBACK_GENRE;
    return GENRE_LOOKUP.get(normalizeLabel(categoryName)) ?? genreCodeFromLabel(categoryName) ?? FALLBACK_GENRE;
};

export default mapToGenre;
