/**
 * Hand-written demo content for a proof-of-concept deployment: fictional readers, forum threads,
 * marketplace listings, conversations and reports. Everything here is invented; books are
 * referenced by title (and author) and resolved against the catalogue when seeding.
 *
 * Times are relative: `daysAgo` for when something started, `after` (minutes) between messages.
 */

/** 20 fictional users. Emails use the reserved example.com domain, so they reach no one. */
export const DEMO_USERS = [
    {
        username: 'andreea.citeste', name: 'Andreea Popescu', joinedDaysAgo: 290,
        genres: ['fiction', 'poetry_drama_literary_studies'],
        bio: 'Profesoară de română la Cluj. Citesc seara, cu ceai de tei și creionul în mână — sublinierile mele au devenit legendă printre elevi.',
    },
    {
        username: 'mihai_sf', name: 'Mihai Ionescu', joinedDaysAgo: 275,
        genres: ['fiction', 'mathematics_sciences', 'computers_internet'],
        bio: 'Inginer software ziua, explorator de galaxii noaptea. Asimov, Herbert și Le Guin mi-au format copilăria.',
    },
    {
        username: 'ioana.d', name: 'Ioana Dumitrescu', joinedDaysAgo: 240,
        genres: ['children_teens', 'cooking'],
        bio: 'Mamă a doi pici curioși (6 și 9 ani). Caut cărți care să ne țină treji până la ultima pagină, pe toți trei.',
    },
    {
        username: 'radu_istorie', name: 'Radu Stanciu', joinedDaysAgo: 233,
        genres: ['history', 'biographies_memoirs', 'romania'],
        bio: 'Pasionat de perioada interbelică și de memorialistică. Anticariatele din București sunt a doua mea casă.',
    },
    {
        username: 'elena.marin', name: 'Elena Marin', joinedDaysAgo: 221,
        genres: ['psychology', 'health_personal_development'],
        bio: 'Psihoterapeută. Citesc despre minte, emoții și despre cum putem trăi puțin mai blând cu noi înșine.',
    },
    {
        username: 'alex.georgescu', name: 'Alexandru Georgescu', joinedDaysAgo: 205,
        genres: ['fiction', 'law'],
        bio: 'Student la Drept în Iași. Thrillerele polițiste sunt plăcerea mea vinovată în sesiune.',
    },
    {
        username: 'cristina_reads', name: 'Cristina Vasile', joinedDaysAgo: 198,
        genres: ['fiction', 'biographies_memoirs'],
        bio: 'Organizez un club de carte lunar într-o cafenea din Fabric, Timișoara. Mereu în căutare de titluri bune de discutat.',
    },
    {
        username: 'bogdan.munteanu', name: 'Bogdan Munteanu', joinedDaysAgo: 186,
        genres: ['cooking', 'urban_traditional_culture'],
        bio: 'Bucătar amator și colecționar de cărți de bucate românești. Am rețete de la bunica pe care nu le-am găsit în nicio carte.',
    },
    {
        username: 'diana_poezie', name: 'Diana Petrescu', joinedDaysAgo: 170,
        genres: ['poetry_drama_literary_studies', 'fiction'],
        bio: 'Scriu poezie, mai mult pentru sertar. Recitesc Nichita în fiecare toamnă.',
    },
    {
        username: 'vladc', name: 'Vlad Constantinescu', joinedDaysAgo: 158,
        genres: ['business_economics', 'biographies_memoirs', 'health_personal_development'],
        bio: 'Antreprenor în IT, tată și alergător ocazional. Cărți de business, productivitate și biografii de fondatori.',
    },
    {
        username: 'larisa.neagu', name: 'Larisa Neagu', joinedDaysAgo: 149,
        genres: ['nature_environment', 'mathematics_sciences'],
        bio: 'Doctorandă în biologie la UBB. Popularizare științifică, natură și, din când în când, un roman bun.',
    },
    {
        username: 'stefan_dobre', name: 'Ștefan Dobre', joinedDaysAgo: 141,
        genres: ['philosophy', 'religion', 'history'],
        bio: 'Profesor de filosofie la pensie. Recitesc stoicii în fiecare iarnă și încă descopăr ceva nou.',
    },
    {
        username: 'maria.tudor', name: 'Maria Tudor', joinedDaysAgo: 127,
        genres: ['foreign_language_books', 'fiction'],
        bio: 'Traducătoare din engleză și franceză. Compar traducerile din plăcere, nu doar din obligație profesională.',
    },
    {
        username: 'andrei.lungu', name: 'Andrei Lungu', joinedDaysAgo: 118,
        genres: ['fiction', 'comics', 'children_teens'],
        bio: 'Fan fantasy de când am citit Hobbitul la 10 ani. Am un raft întreg doar cu hărți de lumi imaginare.',
    },
    {
        username: 'oanabarbu', name: 'Oana Barbu', joinedDaysAgo: 104,
        genres: ['art_architecture', 'fiction'],
        bio: 'Arhitectă. Albume de artă și design, plus câte un roman polițist când am nevoie de pauză.',
    },
    {
        username: 'cosmin.rusu', name: 'Cosmin Rusu', joinedDaysAgo: 96,
        genres: ['lifestyle_sports_leisure', 'health_personal_development'],
        bio: 'Alerg maratoane și citesc despre sport, nutriție și disciplină. Următorul obiectiv: Atena.',
    },
    {
        username: 'gabi_nistor', name: 'Gabriela Nistor', joinedDaysAgo: 83,
        genres: ['fiction', 'children_teens'],
        bio: 'Bibliotecară în Brașov. Cea mai frumoasă meserie din lume și nu mă contrazice nimeni.',
    },
    {
        username: 'florin.matei', name: 'Florin Matei', joinedDaysAgo: 71,
        genres: ['computers_internet', 'fiction'],
        bio: 'Programator backend. Cărți tehnice ziua, romane rusești noaptea.',
    },
    {
        username: 'irina.sandu', name: 'Irina Sandu', joinedDaysAgo: 54,
        genres: ['fiction', 'poetry_drama_literary_studies', 'foreign_language_books'],
        bio: 'Studentă la Litere, anul II. Clasicii ruși și francezi îmi țin companie în tren spre facultate.',
    },
    {
        username: 'paul_enache', name: 'Paul Enache', joinedDaysAgo: 38,
        genres: ['travel_guides_maps', 'biographies_memoirs'],
        bio: 'Călător și fotograf amator. Ghidurile turistice și jurnalele de călătorie sunt slăbiciunea mea.',
    },
];

/** The administrator account of the demo (its password goes to the credentials file). */
export const DEMO_ADMIN = {
    username: 'aurora_admin',
    name: 'Echipa Aurora Codex',
    joinedDaysAgo: 300,
    genres: [],
    bio: 'Contul echipei Aurora Codex. Moderăm forumurile și bazarul — scrie-ne dacă vezi ceva în neregulă.',
};

/**
 * Books the content talks about, looked up by title (and author, to pick the right edition).
 * Keys are used below; a missing book only drops the listing that needs it.
 */
export const BOOK_REFS = {
    dune: { title: 'Dune', author: 'Frank Herbert' },
    orwell1984: { title: '1984', author: 'George Orwell' },
    fermaAnimalelor: { title: 'Ferma animalelor', author: 'George Orwell' },
    maitreyi: { title: 'Maitreyi', author: 'Mircea Eliade' },
    enigmaOtiliei: { title: 'Enigma Otiliei', author: 'George Calinescu' },
    baltagul: { title: 'Baltagul', author: 'Mihail Sadoveanu' },
    harryPotter: { title: 'Harry Potter si piatra filosofala', author: 'J.K. Rowling' },
    miculPrint: { title: 'Micul print', author: 'Antoine de Saint-Exupery' },
    atomicHabits: { title: 'Atomic Habits', author: 'James Clear' },
    maestrul: { title: 'Maestrul si Margareta', author: 'Mihail Bulgakov' },
    mandrie: { title: 'Mandrie si prejudecata', author: 'Jane Austen' },
    hobbitul: { title: 'Hobbitul', author: 'Tolkien' },
    crimaSiPedeapsa: { title: 'Crima si pedeapsa', author: 'Dostoievski' },
    fratiiKaramazov: { title: 'Fratii Karamazov', author: 'Dostoievski' },
    idiotul: { title: 'Idiotul', author: 'Dostoievski' },
    numeleTrandafirului: { title: 'Numele trandafirului', author: 'Umberto Eco' },
    celMaiIubit: { title: 'Cel mai iubit dintre pamanteni', author: 'Marin Preda' },
    moaraCuNoroc: { title: 'Moara cu noroc', author: 'Ioan Slavici' },
    unVeac: { title: 'Un veac de singuratate', author: 'Gabriel Garcia Marquez' },
    padurea: { title: 'Padurea spanzuratilor', author: 'Liviu Rebreanu' },
    marcusAurelius: { title: 'Ganduri catre sine insusi', author: 'Marcus Aurelius' },
    artaSubtila: { title: 'Arta subtila a nepasarii', author: 'Mark Manson' },
    frankl: { title: 'Omul in cautarea sensului vietii', author: 'Frankl' },
    fundatia: { title: 'Fundatia', author: 'Isaac Asimov' },
    gatsby: { title: 'Marele Gatsby', author: 'Fitzgerald' },
    fahrenheit: { title: 'Fahrenheit 451', author: 'Ray Bradbury' },
    orientExpress: { title: 'Crima din Orient Express', author: 'Agatha Christie' },
    totulSeTermina: { title: 'Totul se termina cu noi', author: 'Colleen Hoover' },
    numeleVantului: { title: 'Numele vantului', author: 'Patrick Rothfuss' },
    scurtaIstorie: { title: 'Scurta istorie a timpului', author: 'Stephen Hawking' },
    jamila: { title: 'Jamila Cuisine', author: 'Staicu-Avram' },
    noapteBuna: { title: 'Noapte buna, ursule!', author: 'Monika Filipina' },
    mizerabilii: { title: 'Mizerabilii', author: 'Victor Hugo' },
    alchimistul: { title: 'Alchimistul', author: 'Paulo Coelho' },
    shining: { title: 'Shining', author: 'Stephen King' },
    origini: { title: 'Origini', author: 'Dan Brown' },
    putereaObisnuintei: { title: 'Puterea obisnuintei', author: 'Charles Duhigg' },
    narnia: { title: 'Leul, Vrajitoarea si dulapul', author: 'C.S. Lewis' },
    arseneLupin: { title: 'Arsene Lupin. Hotul gentilom', author: 'Maurice Leblanc' },
    sherlock: { title: 'Memoriile lui Sherlock Holmes', author: 'Conan Doyle' },
    copacii: { title: 'Viata secreta a copacilor', author: 'Peter Wohlleben' },
    cimitirulPraga: { title: 'Cimitirul din Praga', author: 'Umberto Eco' },
};

/**
 * Forum threads: the first message is the author's opening post. `category` is a forum category
 * slug, `book` a BOOK_REFS key, `replies` maps a message index to the index it quotes.
 */
export const DEMO_FORUMS = [
    {
        title: 'Clubul de carte – ce citim în decembrie?',
        category: 'cluburi-de-carte', book: 'maestrul', views: 412, replies: { 1: 0, 5: 4 },
        author: 'cristina_reads', daysAgo: 21, isOpen: true,
        messages: [
            ['cristina_reads', 'Salutare tuturor! Ca în fiecare lună, alegem împreună cartea pentru întâlnirea din 14 decembrie. Propunerile mele: „Maestrul și Margareta”, „Un veac de singurătate” sau „Numele trandafirului”. Votați sau veniți cu altă idee!'],
            ['irina.sandu', 'Votez „Maestrul și Margareta” din tot sufletul. E perfectă pentru iarnă: diavolul la Moscova, o pisică ce joacă șah și cea mai frumoasă poveste de dragoste din literatura rusă.', 95],
            ['andreea.citeste', 'Eu aș merge pe „Un veac de singurătate”. Am recitit-o vara asta și abia la a doua lectură am înțeles cât de bine e construită. Recomand să vă faceți arborele genealogic al familiei Buendía pe o foaie, altfel vă pierdeți printre Aureliani.', 140],
            ['gabi_nistor', 'Și eu tot Bulgakov. Avem la bibliotecă trei exemplare, le pot pune deoparte pentru cine e din Brașov și vrea să vină online.', 260],
            ['maria.tudor', 'Dacă alegeți Bulgakov, atenție la traducere: varianta Natalia Radovici are farmecul ei, dar cea mai nouă curge mult mai bine. Pot aduce ambele ediții să comparăm câteva pasaje, ar fi o discuție interesantă.', 410],
            ['cristina_reads', 'Gata, avem un câștigător: „Maestrul și Margareta”! 🐈‍⬛ Maria, te rog chiar adu edițiile, facem un mic segment despre traduceri. Ne vedem pe 14, de la ora 18:00.', 1290],
            ['florin.matei', 'Nu pot ajunge fizic, dar mă alătur pe Meet dacă e posibil. Am terminat-o anul trecut și încă mă gândesc la Pilat din Pont.', 1450],
        ],
    },
    {
        title: 'Recomandări SF pentru cineva care a terminat Dune',
        category: 'recomandari', book: 'dune', views: 538, replies: { 3: 2, 5: 4 },
        author: 'mihai_sf', daysAgo: 64, isOpen: true,
        messages: [
            ['mihai_sf', 'Tocmai am terminat seria Dune (inclusiv ultimele volume, da, și „Ereticii Dunei”). Simt un gol imens. Ce să citesc mai departe? Prefer SF cu worldbuilding serios, nu neapărat space opera.'],
            ['andrei.lungu', 'Clasicul răspuns: „Fundația” lui Asimov. Altă energie decât Herbert, mai multe idei și mai puțină poezie, dar te prinde. Psihoistoria e un concept genial.', 52],
            ['florin.matei', 'Dacă vrei ceva mai literar: Ursula K. Le Guin, „Mâna stângă a întunericului”. Și „Fahrenheit 451”, dacă n-ai citit-o, e scurtă și încă incredibil de actuală.', 180],
            ['mihai_sf', 'Fundația am citit-o acum vreo zece ani, poate e momentul unei recitiri. Le Guin e pe listă de mult, mersi că mi-ai amintit!', 240],
            ['larisa.neagu', 'Nu e SF propriu-zis, dar dacă îți place partea ecologică din Dune (Arrakis ca sistem), încearcă „Viața secretă a copacilor”. Mi-a schimbat felul în care mă uit la o pădure.', 1600],
            ['mihai_sf', 'Larisa, recomandare neașteptată, dar exact genul de lucru care îmi place. Comandată!', 1720],
        ],
    },
    {
        title: 'Cărți pentru copii de 6–9 ani care chiar le plac copiilor',
        category: 'recomandari', views: 367, replies: { 3: 1 },
        author: 'ioana.d', daysAgo: 47, isOpen: true,
        messages: [
            ['ioana.d', 'Am doi copii, 6 și 9 ani, și mă lupt să găsesc cărți care să le placă amândurora. Cele „educative” le resping din prima pagină 😅. Ce merge la voi acasă?'],
            ['gabi_nistor', 'La bibliotecă, cele mai împrumutate la vârsta asta: „Cronicile din Narnia” (citite cu voce tare, capitol cu capitol), „Micul prinț” și seria cu Harry Potter pentru cel mare. Pentru cel mic, cărțile ilustrate de Monika Filipina au mare succes.', 75],
            ['andrei.lungu', '„Hobbitul” citit seara, câte un capitol, a fost cea mai bună investiție de timp cu nepotul meu. A desenat apoi harta Pământului de Mijloc pe tot peretele 😄', 130],
            ['ioana.d', 'Narnia sună perfect, mai ales că se poate citi cu voce tare. Gabi, mersi! Cel mic adoră animalele, deci „Noapte bună, ursule!” cred că intră direct.', 210],
            ['cristina_reads', 'Și „Arsène Lupin, hoțul gentilom” pentru cel de 9 ani, dacă îi plac misterele. Fiul unei prietene l-a terminat într-un weekend.', 900],
            ['ioana.d', 'Update: Narnia a fost un succes total, am terminat primul volum în 5 seri. Cel mic a cerut „încă un capitol” de fiecare dată. Mulțumesc tuturor! ❤️', 9400],
        ],
    },
    {
        title: 'Enigma Otiliei – personaj tragic sau doar enigmatic?',
        category: 'autori-si-opere', book: 'enigmaOtiliei', views: 621, replies: { 2: 1, 4: 3 },
        author: 'andreea.citeste', daysAgo: 88, isOpen: true,
        messages: [
            ['andreea.citeste', 'O întrebare pe care o pun la fiecare generație de elevi: este Otilia un personaj tragic? Sau Călinescu a construit-o intenționat ca pe o oglindă în care fiecare personaj masculin își proiectează dorințele?'],
            ['irina.sandu', 'Mie mi se pare că tragismul ei vine tocmai din faptul că nu o vedem niciodată „din interior”. Toată lumea vorbește despre ea, dar ea e mereu în mișcare, mereu pleacă. Finalul cu fotografia e devastator.', 120],
            ['diana_poezie', 'Pentru mine Otilia e libertatea pe care Felix nu și-o permite. Felix alege siguranța, cariera, ordinea. Ea alege viața. Nu e tragică, e doar mai curajoasă decât toți ceilalți din roman.', 300],
            ['stefan_dobre', 'Permiteți-mi o observație de om bătrân: Otilia e personajul care înțelege cel mai bine timpul. Știe că tinerețea ei e o monedă care se tocește. De aceea pleacă cu Pascalopol — nu din calcul, ci din luciditate.', 1400],
            ['andreea.citeste', 'Domnule Dobre, interpretarea cu timpul e superbă, o „împrumut” pentru ora de mâine, cu citare 😊', 1490],
            ['radu_istorie', 'Și nu uitați contextul: Bucureștiul de la 1909, cu toată lumea lui de moșteniri și interese. Moș Costache și casa lui sunt la fel de importante ca Otilia. Călinescu era un fin observator al lăcomiei.', 2900],
        ],
    },
    {
        title: 'Stoicismul în 2026 – mai are ceva de spus Marcus Aurelius?',
        category: 'autori-si-opere', book: 'marcusAurelius', views: 455, replies: { 4: 1 },
        author: 'stefan_dobre', daysAgo: 112, isOpen: true,
        messages: [
            ['stefan_dobre', 'În fiecare iarnă recitesc „Gânduri către sine însuși”. Văd că stoicismul a devenit modă pe internet, cu citate pe fundaluri de munte. Mă întreb: ce înțeleg tinerii de azi din Marcus Aurelius?'],
            ['vladc', 'Din perspectiva unui antreprenor: ideea de a separa ce controlezi de ce nu controlezi mi-a salvat sănătatea mintală în anul în care am crezut că firma se închide. Nu e o modă pentru mine, e o unealtă.', 200],
            ['elena.marin', 'Multe tehnici din terapia cognitiv-comportamentală au rădăcini direct în stoici. Diferența e că stoicii nu promit fericire, promit liniște. Mi se pare o promisiune mai onestă.', 380],
            ['cosmin.rusu', 'Citesc o pagină înainte de fiecare alergare lungă. „Ce nu e bun pentru stup nu e bun nici pentru albină” — mă gândesc la asta la kilometrul 35, când vreau să mă opresc.', 900],
            ['stefan_dobre', 'Mă bucură răspunsurile voastre. Poate nu e doar o modă, ci o nevoie. Vă recomand, în paralel, „Omul în căutarea sensului vieții” de Viktor Frankl — o lecție stoică trăită în cel mai întunecat loc posibil.', 1500],
        ],
    },
    {
        title: 'Traduceri bune vs. traduceri proaste – exemple concrete',
        category: 'discutii-generale', views: 289, replies: { 3: 2 },
        author: 'maria.tudor', daysAgo: 73, isOpen: true,
        messages: [
            ['maria.tudor', 'Ca traducătoare, primesc des întrebarea „merită să citesc în original?”. Răspunsul meu: depinde enorm de traducere. Hai să strângem exemple de traduceri românești excelente (și de cele care v-au enervat).'],
            ['irina.sandu', 'Excelente: Dostoievski în traducerile vechi de la Editura pentru Literatură Universală. Au o greutate pe care traducerile noi nu o mai au, chiar dacă sunt mai fidele.', 160],
            ['florin.matei', 'M-a enervat o ediție de SF în care „starship” era tradus „navă-stea” consecvent pe 400 de pagini 😩', 220],
            ['maria.tudor', 'Florin, ha! Asta e o capcană clasică, traducerea literală a termenilor de gen. Bine că nu au pus și „sabie de lumină” la „lightsaber”... a, stai, ăla e chiar termenul oficial.', 260],
            ['andreea.citeste', '„Un veac de singurătate” în traducerea lui Tudora Șandru Mehedinți e o capodoperă în sine. Nu cred că originalul sună mai bine pentru un cititor român.', 1210],
        ],
    },
    {
        title: 'Bazarul – sfaturi pentru vânzători începători',
        category: 'bazar-si-schimburi', views: 803, isPinned: true,
        author: 'aurora_admin', daysAgo: 150, isOpen: true,
        messages: [
            ['aurora_admin', 'Câteva sfaturi pentru anunțuri care se vând repede: 1) o fotografie clară, la lumină naturală; 2) descrieți sincer starea cărții (sublinieri, colțuri îndoite); 3) legați anunțul de cartea din catalog, ca cumpărătorii să vadă prețul din librării; 4) răspundeți repede la mesaje. Spor la vânzări!'],
            ['bogdan.munteanu', 'Adaug din experiență: dacă vindeți cărți de bucate, menționați dacă au pete de ulei 😄 Toate cărțile mele au, dar măcar o spun din prima.', 1800],
            ['radu_istorie', 'Și puneți un preț realist. Am văzut ediții de buzunar uzate cerute mai scump decât noi din librărie. Comparația cu ofertele din catalog e foarte utilă aici.', 3100],
            ['oanabarbu', 'Pentru albume de artă: fotografiați și cotorul, cumpărătorii vor să știe dacă e lipit sau cusut.', 7200],
        ],
    },
    {
        title: 'Thrillere care chiar te țin treaz noaptea',
        category: 'pe-genuri', book: 'shining', views: 392, replies: { 3: 1, 5: 4 },
        author: 'alex.georgescu', daysAgo: 35, isOpen: true,
        messages: [
            ['alex.georgescu', 'Sunt în sesiune și, evident, în loc să învăț Dreptul civil, caut thrillere. Ce carte v-a ținut treji până la 4 dimineața?'],
            ['oanabarbu', '„Shining”. Am citit-o într-o cabană la munte, iarna. Nu recomand combinația 😅', 85],
            ['florin.matei', '„Crima din Orient Express” — știu, e clasic, dar Agatha Christie e greu de bătut la construcția misterului. Finalul încă e unul dintre cele mai bune.', 140],
            ['alex.georgescu', 'Am văzut filmul, deci finalul e ratat pentru mine 🙈 Dar Shining e pe listă de mult.', 190],
            ['gabi_nistor', 'Ia „Numele trandafirului”. E thriller medieval cu crime într-o mănăstire, plus semiotică cât să-ți intre și ceva cultură generală în sesiune.', 600],
            ['alex.georgescu', 'Gabi, asta e cea mai bună scuză pentru amânarea învățatului pe care am auzit-o. Mersi!', 650],
            ['cristina_reads', 'Iar dacă vrei ceva modern: Dan Brown, „Origini”. Nu e mare literatură, dar e imposibil de lăsat din mână.', 2200],
        ],
    },
    {
        title: 'Rețete din cărți vechi românești',
        category: 'pe-genuri', views: 176, replies: { 3: 2 },
        author: 'bogdan.munteanu', daysAgo: 99, isOpen: true,
        messages: [
            ['bogdan.munteanu', 'Am o colecție de cărți de bucate românești, unele din anii 70. Cineva mai gătește după ele? Cele mai bune ciorbe pe care le-am făcut vin dintr-o carte cu foile îngălbenite.'],
            ['ioana.d', 'Gătesc mult după „Jamila Cuisine” — rețetele sunt testate și explicate pas cu pas, perfect pentru serile cu doi copii flămânzi.', 140],
            ['radu_istorie', 'Recomand oricui e interesat de istoria bucătăriei noastre volumele despre gastronomia românească din secolele trecute. Afli de unde vin sarmalele și de ce le facem cum le facem.', 520],
            ['bogdan.munteanu', 'Radu, am citit și eu despre asta! Partea cu influențele otomane e fascinantă. Dacă vreți, postez aici rețeta de ciorbă de perișoare din cartea bunicii.', 610],
            ['cosmin.rusu', 'Postează! Promit să o adaptez doar puțin pentru dieta de maraton 😄', 700],
        ],
    },
    {
        title: 'Poezie contemporană – ce mai citiți?',
        category: 'pe-genuri', views: 143, replies: { 3: 2 },
        author: 'diana_poezie', daysAgo: 58, isOpen: true,
        messages: [
            ['diana_poezie', 'Simt că poezia contemporană românească trece aproape neobservată. Ce volume recente v-au plăcut? Eu am descoperit anul acesta câteva voci tinere extraordinare.'],
            ['andreea.citeste', 'Le dau elevilor la clasă texte contemporane și sunt surprinsă cât de bine reacționează. Poezia scurtă, directă, despre lucruri de zi cu zi îi atinge mai mult decât ne-am aștepta.', 300],
            ['irina.sandu', 'La facultate avem un cenaclu și citim des autori debutanți. Sincer, unii sunt mai buni decât jumătate din canonul pe care îl învățăm.', 480],
            ['diana_poezie', 'Irina, dacă organizați vreo seară deschisă, anunță-mă! Aș veni cu drag, chiar și doar ca să ascult.', 520],
        ],
    },
    {
        title: 'Cărți de dezvoltare personală care nu sunt clișee',
        category: 'pe-genuri', book: 'atomicHabits', views: 512,
        author: 'vladc', daysAgo: 128, isOpen: false,
        messages: [
            ['vladc', 'Am citit zeci de cărți de self-help și majoritatea repetă aceleași trei idei. Care sunt excepțiile? Pentru mine: „Atomic Habits” și „Puterea obișnuinței”.'],
            ['elena.marin', '„Omul în căutarea sensului vieții”, fără ezitare. Nu e o carte de self-help în sensul clasic, dar a ajutat mai mulți oameni decât toate listele cu 10 pași.', 120],
            ['cosmin.rusu', '„Atomic Habits” mi-a schimbat antrenamentele. Ideea de a te îmbunătăți cu 1% pe zi sună banal, dar aplicată chiar funcționează.', 300],
            ['vladc', 'Închid discuția, am strâns o listă bună pe care am pus-o pe blogul firmei. Mulțumesc tuturor!', 5800],
        ],
    },
    {
        title: 'Reducerile de Black Friday la librării – merită?',
        category: 'discutii-generale', views: 98, replies: { 1: 0 },
        author: 'radu_istorie', daysAgo: 6, isOpen: true,
        messages: [
            ['radu_istorie', 'An de an mă întreb dacă reducerile de Black Friday chiar sunt reduceri. Am urmărit câteva titluri pe pagina de prețuri a aplicației și unele erau mai ieftine acum o lună.'],
            ['vladc', 'Exact pentru asta folosesc comparația de prețuri de aici. Am găsit „Atomic Habits” cu 20 de lei mai ieftin într-o librărie mai mică.', 45],
            ['larisa.neagu', 'Eu am prins câteva albume de natură la jumătate de preț. Dar da, trebuie verificat — unele „reduceri” sunt de la un preț umflat cu o săptămână înainte.', 130],
            ['paul_enache', 'Sfat: puneți cărțile în coș din timp și urmăriți-le. Și mai sunt anticariatele și bazarul de aici — am luat două ghiduri de călătorie aproape noi la sub jumătate de preț.', 260],
        ],
    },
    {
        title: 'Bun venit pe forumurile Aurora Codex – citește înainte să postezi',
        category: 'comunitate', views: 1240, isPinned: true,
        author: 'aurora_admin', daysAgo: 160, isOpen: false,
        messages: [
            ['aurora_admin', `Bun venit în comunitatea Aurora Codex! 📚

Câteva reguli simple, ca discuțiile să rămână plăcute pentru toată lumea:

- **Alege categoria potrivită.** Recomandările merg la *Recomandări*, analizele la *Autori și opere*, iar cluburile de lectură la *Cluburi de carte*.
- **Fără spoilere în titluri.** În mesaje, avertizează înainte: „Atenție, spoiler!”.
- **Respect înainte de toate.** Critică ideile, nu oamenii.
- **Fără reclame.** Anunțurile de vânzare au locul lor în Bazar.

Poți cita un mesaj cu butonul *Citează*, poți aprecia răspunsurile utile și poți lega o discuție de o carte din catalog.

> Dacă vezi ceva în neregulă, folosește butonul de raportare. Moderatorii verifică fiecare raport.

Lectură plăcută!`],
        ],
    },
    {
        title: 'Sugestii pentru Aurora Codex – ce ați vrea să adăugăm?',
        category: 'comunitate', views: 214, replies: { 2: 1, 4: 3 },
        author: 'aurora_admin', daysAgo: 45, isOpen: true,
        messages: [
            ['aurora_admin', 'Suntem curioși: ce funcții v-ar face viața de cititor mai ușoară? Scrieți aici orice idee, oricât de mică.'],
            ['gabi_nistor', 'O listă „Vreau să citesc” pe profil! Acum îmi notez titlurile într-un caiet, ca pe vremuri 😄', 180],
            ['larisa.neagu', 'Plus unu pentru lista de citit. Și poate o notificare când o carte din listă apare la un preț mai mic.', 260],
            ['radu_istorie', 'Mie mi-ar plăcea să pot vedea istoricul prețului unei cărți, nu doar oferta de azi.', 900],
            ['aurora_admin', 'Mulțumim! Lista de lecturi și alertele de preț sunt deja pe lista noastră. Istoricul prețurilor e o idee foarte bună, o notăm.', 1500],
        ],
    },
];

/**
 * Marketplace listings. `price` is a fraction of the cheapest store offer (rounded), unless
 * `fixedPrice` is set. `soldAfterDays` closes the listing that many days after it was posted.
 */
export const DEMO_LISTINGS = [
    { seller: 'mihai_sf', book: 'dune', daysAgo: 52, priceFactor: 0.55, negotiable: true, title: 'Dune – Frank Herbert, ediție cartonată',
        description: 'Citită o singură dată, ținută în bibliotecă departe de soare. Coperta cartonată e impecabilă, fără sublinieri. O vând pentru că mi-am luat ediția ilustrată.' },
    { seller: 'mihai_sf', book: 'fundatia', daysAgo: 30, priceFactor: 0.5, negotiable: true, soldAfterDays: 4, title: 'Fundația – Isaac Asimov',
        description: 'Ediția Paladin, stare foarte bună. Colțul copertei ușor îndoit, interiorul fără probleme.' },
    { seller: 'andreea.citeste', book: 'enigmaOtiliei', daysAgo: 70, priceFactor: 0.45, negotiable: false, title: 'Enigma Otiliei – George Călinescu',
        description: 'Exemplar de profesor: are câteva sublinieri discrete cu creionul, utile pentru bacalaureat. Paginile sunt curate, cotorul intact.' },
    { seller: 'andreea.citeste', book: 'baltagul', daysAgo: 66, priceFactor: 0.5, negotiable: true, title: 'Baltagul – Mihail Sadoveanu',
        description: 'Perfectă pentru elevii de gimnaziu și liceu. Stare bună, fără însemnări.' },
    { seller: 'ioana.d', book: 'noapteBuna', daysAgo: 40, priceFactor: 0.6, negotiable: false, soldAfterDays: 2, title: 'Noapte bună, ursule! – carte ilustrată',
        description: 'Copiii au crescut și am făcut loc pe raft. Ilustrațiile sunt intacte, o pagină are o mică urmă de creion colorat.' },
    { seller: 'ioana.d', book: 'harryPotter', daysAgo: 18, priceFactor: 0.5, negotiable: true, title: 'Harry Potter și piatra filozofală',
        description: 'Citită de toată familia, dar îngrijită. Avem acum ediția ilustrată, așa că o dăm mai departe unui cititor nou.' },
    { seller: 'radu_istorie', book: 'padurea', daysAgo: 85, priceFactor: 0.4, negotiable: true, title: 'Pădurea spânzuraților – Liviu Rebreanu',
        description: 'Ediție mai veche, foi ușor îngălbenite, dar textul e perfect lizibil. Miros plăcut de anticariat inclus.' },
    { seller: 'radu_istorie', book: 'celMaiIubit', daysAgo: 25, priceFactor: 0.55, negotiable: true, title: 'Cel mai iubit dintre pământeni – Marin Preda (3 volume)',
        description: 'Setul complet de trei volume, stare foarte bună. Le vând doar împreună. Pot preda personal în București, zona Unirii.' },
    { seller: 'elena.marin', book: 'frankl', daysAgo: 44, priceFactor: 0.55, negotiable: false, title: 'Omul în căutarea sensului vieții – Viktor Frankl',
        description: 'Am două exemplare, unul e de prisos. Stare excelentă, practic nou.' },
    { seller: 'elena.marin', book: 'artaSubtila', daysAgo: 12, priceFactor: 0.5, negotiable: true, title: 'Arta subtilă a nepăsării – Mark Manson',
        description: 'Citită o dată, câteva pagini au colțurile îndoite ca semn de carte. Altfel arată foarte bine.' },
    { seller: 'alex.georgescu', book: 'orientExpress', daysAgo: 28, priceFactor: 0.5, negotiable: true, soldAfterDays: 6, title: 'Crima din Orient Express – Agatha Christie',
        description: 'Ediție de buzunar, perfectă pentru tren. Stare bună.' },
    { seller: 'alex.georgescu', book: 'origini', daysAgo: 9, priceFactor: 0.5, negotiable: true, title: 'Origini – Dan Brown',
        description: 'Citită într-un weekend, ca nouă. Predare personală în Iași, zona Copou, sau prin curier.' },
    { seller: 'cristina_reads', book: 'maestrul', daysAgo: 16, priceFactor: 0.5, negotiable: false, title: 'Maestrul și Margareta – Bulgakov',
        description: 'Exemplar de la clubul nostru de carte, a circulat pe la trei cititori, dar e încă în stare bună. Ideal pentru cine vrea să citească pentru întâlnirea din decembrie.' },
    { seller: 'cristina_reads', book: 'totulSeTermina', daysAgo: 33, priceFactor: 0.5, negotiable: true, title: 'Totul se termină cu noi – Colleen Hoover',
        description: 'Citită o singură dată. O carte grea, dar importantă. Stare foarte bună.' },
    { seller: 'bogdan.munteanu', book: 'jamila', daysAgo: 60, priceFactor: 0.55, negotiable: true, title: 'Jamila Cuisine – primul volum',
        description: 'Folosită în bucătărie, deci are 2–3 pete mici pe paginile cu prăjituri (le-ați fi avut și voi 😄). Altfel, completă și bine legată.' },
    { seller: 'diana_poezie', book: 'miculPrint', daysAgo: 50, priceFactor: 0.6, negotiable: false, title: 'Micul Prinț – Antoine de Saint-Exupéry',
        description: 'Ediție cu ilustrațiile originale. Am primit-o cadou de două ori, o dau mai departe celui care o va iubi.' },
    { seller: 'vladc', book: 'atomicHabits', daysAgo: 37, priceFactor: 0.6, negotiable: true, soldAfterDays: 3, title: 'Atomic Habits – James Clear (engleză)',
        description: 'Ediția în limba engleză, paperback. Câteva sublinieri cu marker galben în primele capitole.' },
    { seller: 'vladc', book: 'putereaObisnuintei', daysAgo: 20, priceFactor: 0.5, negotiable: true, title: 'Puterea obișnuinței – Charles Duhigg',
        description: 'Stare foarte bună, fără însemnări. Merge perfect în pereche cu Atomic Habits.' },
    { seller: 'larisa.neagu', book: 'copacii', daysAgo: 42, priceFactor: 0.55, negotiable: true, title: 'Viața secretă a copacilor – Peter Wohlleben',
        description: 'Una dintre cărțile mele preferate de popularizare. Am primit-o cadou deși o aveam deja. Nouă, nedeschisă.' },
    { seller: 'larisa.neagu', book: 'scurtaIstorie', daysAgo: 14, priceFactor: 0.5, negotiable: false, title: 'Scurtă istorie a timpului – Stephen Hawking',
        description: 'Ediție mai veche, coperta ușor decolorată de soare. Conținutul e neschimbat de zeci de ani 😊' },
    { seller: 'stefan_dobre', book: 'marcusAurelius', daysAgo: 95, priceFactor: 0.55, negotiable: false, title: 'Gânduri către sine însuși – Marcus Aurelius',
        description: 'Am trei ediții, păstrez două. Aceasta e într-o stare foarte bună, cu o prefață excelentă.' },
    { seller: 'maria.tudor', book: 'mandrie', daysAgo: 55, priceFactor: 0.45, negotiable: true, title: 'Mândrie și prejudecată – Jane Austen',
        description: 'Traducere bună, ediție îngrijită. Câteva note pe margine despre traducere (ocupational hazard 😅).' },
    { seller: 'maria.tudor', book: 'mizerabilii', daysAgo: 23, priceFactor: 0.5, negotiable: true, title: 'Mizerabilii – Victor Hugo',
        description: 'Ediție completă, stare foarte bună. E grea, deci recomand predare personală în București sau curier.' },
    { seller: 'andrei.lungu', book: 'hobbitul', daysAgo: 48, priceFactor: 0.5, negotiable: true, soldAfterDays: 1, title: 'Hobbitul – J.R.R. Tolkien',
        description: 'Prima mea ediție, păstrată cu grijă. Am cumpărat-o pe cea cu ilustrațiile lui Alan Lee, deci aceasta caută stăpân nou.' },
    { seller: 'andrei.lungu', book: 'numeleVantului', daysAgo: 11, priceFactor: 0.55, negotiable: true, title: 'Numele vântului – Patrick Rothfuss',
        description: 'Una dintre cele mai frumoase cărți fantasy. Stare excelentă. (Da, încă așteptăm al treilea volum.)' },
    { seller: 'andrei.lungu', book: 'narnia', daysAgo: 5, priceFactor: 0.55, negotiable: false, title: 'Leul, Vrăjitoarea și dulapul – C.S. Lewis',
        description: 'Ideală pentru citit cu voce tare copiilor. Stare foarte bună.' },
    { seller: 'oanabarbu', book: 'shining', daysAgo: 31, priceFactor: 0.5, negotiable: true, title: 'Shining – Stephen King',
        description: 'Citită (cu lumina aprinsă). Stare foarte bună, nu o mai vreau în casă 😅' },
    { seller: 'oanabarbu', book: 'numeleTrandafirului', daysAgo: 7, priceFactor: 0.5, negotiable: true, title: 'Numele trandafirului – Umberto Eco',
        description: 'Ediție Polirom, cotor ușor uzat. Interior impecabil.' },
    { seller: 'florin.matei', book: 'crimaSiPedeapsa', daysAgo: 62, priceFactor: 0.45, negotiable: true, soldAfterDays: 9, title: 'Crimă și pedeapsă – Dostoievski',
        description: 'Ediție de buzunar, citită în metrou. Coperta are urme de uzură, interiorul e în regulă.' },
    { seller: 'florin.matei', book: 'fratiiKaramazov', daysAgo: 19, priceFactor: 0.5, negotiable: true, title: 'Frații Karamazov – Dostoievski',
        description: 'Stare foarte bună. Recomand cu căldură, dar e o carte la care trebuie să revii de mai multe ori.' },
    { seller: 'irina.sandu', book: 'maitreyi', daysAgo: 26, priceFactor: 0.6, negotiable: true, title: 'Maitreyi – Mircea Eliade',
        description: 'Ediție școlară, cu câteva sublinieri cu creionul. Utilă pentru bacalaureat.' },
    { seller: 'paul_enache', book: 'alchimistul', daysAgo: 4, priceFactor: 0.55, negotiable: true, title: 'Alchimistul – Paulo Coelho',
        description: 'Am citit-o pe drum spre Portugalia, potrivit, nu? Stare foarte bună, puțin îndoită la colțuri de la rucsac.' },
];

/**
 * Conversations about listings (by index in DEMO_LISTINGS). `from` is 'buyer' or 'seller';
 * `after` is minutes since the previous message.
 */
export const DEMO_CHATS = [
    { listing: 0, buyer: 'andrei.lungu', afterDays: 3, isOpen: true, messages: [
        ['buyer', 'Bună! Mai este disponibilă Dune? Aș fi interesat, sunt în Cluj.'],
        ['seller', 'Salut! Da, încă e. Sunt și eu în Cluj, ne putem vedea în centru.', 40],
        ['buyer', 'Super. Ați lăsa la 30 de lei? Ar fi prima carte din serie pentru fratele meu.', 15],
        ['seller', 'Pentru un nou cititor de Dune, sigur 😊 Joi după 18 la Librăria Cărturești de pe Iuliu Maniu?', 25],
        ['buyer', 'Perfect, ne vedem acolo. Mulțumesc!', 5],
    ] },
    { listing: 1, buyer: 'florin.matei', afterDays: 1, isOpen: false, messages: [
        ['buyer', 'Bună ziua! Fundația mai e disponibilă? Pot ridica mâine.'],
        ['seller', 'Da! Mâine după-amiază e ok, îți trimit adresa.', 120],
        ['buyer', 'Mulțumesc, am ridicat-o, e exact cum ați descris-o. O seară bună!', 1600],
    ] },
    { listing: 5, buyer: 'gabi_nistor', afterDays: 2, isOpen: true, messages: [
        ['buyer', 'Bună, Ioana! Harry Potter ar fi perfectă pentru biblioteca noastră de cartier. Ai trimite prin curier în Brașov?'],
        ['seller', 'Bună, Gabi! Sigur, cu plăcere. Curierul e în jur de 15 lei, îl plătesc eu dacă ajunge la o bibliotecă 😊', 90],
        ['buyer', 'Ești minunată, mulțumesc! Îți scriu datele imediat.', 10],
    ] },
    { listing: 7, buyer: 'cristina_reads', afterDays: 4, isOpen: true, messages: [
        ['buyer', 'Bună ziua! Setul Preda m-ar interesa pentru clubul de carte. Ați accepta 40 de lei?'],
        ['seller', 'Bună! E un set în stare foarte bună, aș merge până la 45. Pot trimite prin curier dacă nu sunteți din București.', 300],
        ['buyer', 'Sunt din Timișoara. 45 plus curierul e în regulă, mulțumesc!', 60],
        ['seller', 'Perfect, îl împachetez mâine dimineață.', 20],
    ] },
    { listing: 12, buyer: 'irina.sandu', afterDays: 1, isOpen: true, messages: [
        ['buyer', 'Bună! Aș vrea „Maestrul și Margareta” ca să pot veni pregătită la clubul din decembrie 😊'],
        ['seller', 'Ce bine! Pot să ți-o aduc chiar la întâlnirea dinainte, pe 30 noiembrie. Te aștept!', 45],
    ] },
    { listing: 16, buyer: 'cosmin.rusu', afterDays: 1, isOpen: false, messages: [
        ['buyer', 'Salut! Atomic Habits în engleză e exact ce căutam. O pot lua azi?'],
        ['seller', 'Salut! Da, sunt la birou în Pipera până la 18.', 30],
        ['buyer', 'Am luat-o, mersi mult! Sublinierile sunt chiar utile 😄', 400],
    ] },
    { listing: 23, buyer: 'ioana.d', afterDays: 0, isOpen: false, messages: [
        ['buyer', 'Bună! Hobbitul ar fi perfect pentru băiatul meu de 9 ani. Mai e disponibil?'],
        ['seller', 'Da! Și sunt încântat că o să ajungă la un cititor de 9 ani, exact vârsta la care am citit-o eu prima dată.', 35],
        ['buyer', 'Ce frumos! O iau, vă rog. Plata la livrare e ok?', 12],
        ['seller', 'Sigur. Am trimis-o azi, mâine ar trebui să ajungă.', 180],
    ] },
    { listing: 26, buyer: 'alex.georgescu', afterDays: 2, isOpen: true, messages: [
        ['buyer', 'Bună! Am citit pe forum că Shining e terifiantă. Exact ce-mi trebuie în sesiune 😅 Mai e de vânzare?'],
        ['seller', 'Haha, da! Nu zice că nu te-am avertizat. Trimit prin curier în Iași?', 70],
    ] },
    { listing: 28, buyer: 'irina.sandu', afterDays: 3, isOpen: false, messages: [
        ['buyer', 'Bună ziua! Crimă și pedeapsă îmi trebuie pentru seminar. Ați lăsa la 20 de lei?'],
        ['seller', 'Sigur, pentru seminar 😊 O poți ridica de la metrou Victoriei.', 25],
        ['buyer', 'Mulțumesc, am ridicat-o!', 2800],
    ] },
    { listing: 31, buyer: 'maria.tudor', afterDays: 1, isOpen: true, messages: [
        ['buyer', 'Bună, Paul! Ai și alte cărți de călătorie de vânzare? Pregătesc o excursie în Portugalia.'],
        ['seller', 'Bună! Încă nu le-am pus pe bazar, dar am un ghid Lonely Planet de Portugalia aproape nou. Îl adaug diseară.', 55],
        ['buyer', 'Super, îl aștept! Iau și Alchimistul, să fie tematic 😄', 8],
    ] },
];

/**
 * Reports for the moderation queue. Targets are resolved after seeding:
 * `forumMessage` = [forum index, message index], `listing` = listing index.
 */
export const DEMO_REPORTS = [
    { reporter: 'radu_istorie', target: { forumMessage: [5, 2] }, daysAgo: 70, isOpen: false,
        reason: 'Nu e chiar o problemă, dar mesajul pare scris doar ca să ia în râs traducătorii.' },
    { reporter: 'gabi_nistor', target: { listing: 27 }, daysAgo: 6, isOpen: true,
        reason: 'Anunțul spune „interior impecabil”, dar în fotografie cotorul pare rupt. Poate ar trebui verificat.' },
    { reporter: 'stefan_dobre', target: { forumMessage: [11, 1] }, daysAgo: 5, isOpen: true,
        reason: 'Mesajul pare reclamă mascată pentru o anumită librărie. Poate un moderator să verifice?' },
];
