/**
 * Verb data for the French conjugation engine.
 *
 * The Spanish file next to this one splits its knowledge into stem changes,
 * irregulars and a search index. French divides differently, so this one holds:
 *
 *   SPELLING_EXCEPTIONS — the -eler / -eter verbs that take è rather than a
 *                         doubled consonant (acheter → achète, not achette).
 *   SHORT_IR            — -ir verbs of the partir family, which drop the last
 *                         stem consonant in the singular (partir → je pars).
 *   IRREGULARS          — explicit forms and stems.
 *   PREFIXABLE          — bases whose irregularity is inherited by derivatives.
 *   ETRE_VERBS          — the verbs whose compound tenses take être.
 *   COMMON_VERBS        — the search index for the conjugator page.
 *
 * Everything a rule can produce — the three regular patterns, -cer/-ger/-yer,
 * e_er and é_er — lives in lib/conjugator-fr.js instead.
 */

/** Model verbs on the conjugator's three tabs. */
export const MODEL_VERBS = {
  er: { verb: 'parler', gloss: 'to speak' },
  ir: { verb: 'finir', gloss: 'to finish' },
  re: { verb: 'vendre', gloss: 'to sell' },
};

/**
 * -eler and -eter verbs that lengthen the vowel with a grave accent instead of
 * doubling the consonant. The doubling pattern (appeler → j'appelle) is the
 * default, so only the exceptions are listed.
 */
export const SPELLING_EXCEPTIONS = new Set([
  'acheter', 'racheter', 'crocheter', 'fureter', 'haleter',
  'celer', 'déceler', 'receler', 'ciseler', 'démanteler', 'écarteler', 'geler',
  'dégeler', 'congeler', 'surgeler', 'marteler', 'modeler', 'peler', 'harceler',
]);

/**
 * -ir verbs conjugated like *partir* rather than like *finir*: no -iss- infix,
 * and the singular drops the final consonant of the stem (part- → je pars).
 * A closed list, because the two families are told apart by history rather
 * than by spelling — *finir* and *sentir* look identical from the outside.
 */
export const SHORT_IR = new Set([
  'partir', 'repartir', 'départir',
  'sortir', 'ressortir',
  'dormir', 'endormir', 'rendormir',
  'sentir', 'ressentir', 'consentir', 'pressentir',
  'mentir', 'démentir',
  'servir', 'desservir', 'resservir',
  'se repentir',
]);

/**
 * Explicit irregularity. Every field is optional; anything absent is generated.
 *
 *   present          full six-person present indicative
 *   imparfaitStem    stem for the imperfect (default: nous-present minus -ons)
 *   futurStem        stem for the future and conditional (default: infinitive)
 *   passeSimple      full passé simple
 *   passeSimpleStem  stem plus a type: 'i' (finis), 'u' (fus), 'in' (vins)
 *   subjonctif       full present subjunctive
 *   subjonctifStem   one stem for all six persons
 *   participePasse / participePresent
 *   imperatif        [tu, nous, vous] when it is not the present indicative
 *   aux              'être' when the compound tenses do not take avoir
 *   defective        persons that do not exist (weather and modal verbs)
 */
export const IRREGULARS = {
  être: {
    present: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
    imparfaitStem: 'ét',
    futurStem: 'ser',
    passeSimpleStem: 'f', passeSimpleType: 'u',
    subjonctif: ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient'],
    participePasse: 'été',
    participePresent: 'étant',
    imperatif: ['sois', 'soyons', 'soyez'],
  },
  avoir: {
    present: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
    imparfaitStem: 'av',
    futurStem: 'aur',
    passeSimpleStem: 'e', passeSimpleType: 'u',
    subjonctif: ['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient'],
    participePasse: 'eu',
    participePresent: 'ayant',
    imperatif: ['aie', 'ayons', 'ayez'],
  },
  aller: {
    present: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
    futurStem: 'ir',
    subjonctif: ['aille', 'ailles', 'aille', 'allions', 'alliez', 'aillent'],
    participePasse: 'allé',
    imperatif: ['va', 'allons', 'allez'],
    aux: 'être',
  },
  faire: {
    present: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'],
    futurStem: 'fer',
    passeSimpleStem: 'f', passeSimpleType: 'i',
    subjonctifStem: 'fass',
    participePasse: 'fait',
    participePresent: 'faisant',
  },
  dire: {
    present: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'],
    passeSimpleStem: 'd', passeSimpleType: 'i',
    subjonctifStem: 'dis',
    participePasse: 'dit',
  },
  pouvoir: {
    present: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'],
    futurStem: 'pourr',
    passeSimpleStem: 'p', passeSimpleType: 'u',
    subjonctifStem: 'puiss',
    participePasse: 'pu',
    imperatif: [null, null, null],
  },
  vouloir: {
    present: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'],
    futurStem: 'voudr',
    passeSimpleStem: 'voul', passeSimpleType: 'u',
    subjonctif: ['veuille', 'veuilles', 'veuille', 'voulions', 'vouliez', 'veuillent'],
    participePasse: 'voulu',
    imperatif: ['veuille', 'veuillons', 'veuillez'],
  },
  devoir: {
    present: ['dois', 'dois', 'doit', 'devons', 'devez', 'doivent'],
    futurStem: 'devr',
    passeSimpleStem: 'd', passeSimpleType: 'u',
    subjonctif: ['doive', 'doives', 'doive', 'devions', 'deviez', 'doivent'],
    participePasse: 'dû',
    imperatif: [null, null, null],
  },
  savoir: {
    present: ['sais', 'sais', 'sait', 'savons', 'savez', 'savent'],
    futurStem: 'saur',
    passeSimpleStem: 's', passeSimpleType: 'u',
    subjonctifStem: 'sach',
    participePasse: 'su',
    participePresent: 'sachant',
    imperatif: ['sache', 'sachons', 'sachez'],
  },
  voir: {
    present: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'],
    futurStem: 'verr',
    passeSimpleStem: 'v', passeSimpleType: 'i',
    subjonctif: ['voie', 'voies', 'voie', 'voyions', 'voyiez', 'voient'],
    participePasse: 'vu',
  },
  // Same stem as voir everywhere except the future, which is regular.
  prévoir: {
    present: ['prévois', 'prévois', 'prévoit', 'prévoyons', 'prévoyez', 'prévoient'],
    futurStem: 'prévoir',
    passeSimpleStem: 'prév', passeSimpleType: 'i',
    subjonctif: ['prévoie', 'prévoies', 'prévoie', 'prévoyions', 'prévoyiez', 'prévoient'],
    participePasse: 'prévu',
  },
  venir: {
    present: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'],
    futurStem: 'viendr',
    passeSimpleStem: 'v', passeSimpleType: 'in',
    subjonctif: ['vienne', 'viennes', 'vienne', 'venions', 'veniez', 'viennent'],
    participePasse: 'venu',
    aux: 'être',
  },
  tenir: {
    present: ['tiens', 'tiens', 'tient', 'tenons', 'tenez', 'tiennent'],
    futurStem: 'tiendr',
    passeSimpleStem: 't', passeSimpleType: 'in',
    subjonctif: ['tienne', 'tiennes', 'tienne', 'tenions', 'teniez', 'tiennent'],
    participePasse: 'tenu',
  },
  prendre: {
    present: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'],
    passeSimpleStem: 'pr', passeSimpleType: 'i',
    subjonctif: ['prenne', 'prennes', 'prenne', 'prenions', 'preniez', 'prennent'],
    participePasse: 'pris',
  },
  mettre: {
    present: ['mets', 'mets', 'met', 'mettons', 'mettez', 'mettent'],
    passeSimpleStem: 'm', passeSimpleType: 'i',
    subjonctifStem: 'mett',
    participePasse: 'mis',
  },
  boire: {
    present: ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent'],
    passeSimpleStem: 'b', passeSimpleType: 'u',
    subjonctif: ['boive', 'boives', 'boive', 'buvions', 'buviez', 'boivent'],
    participePasse: 'bu',
  },
  croire: {
    present: ['crois', 'crois', 'croit', 'croyons', 'croyez', 'croient'],
    passeSimpleStem: 'cr', passeSimpleType: 'u',
    subjonctif: ['croie', 'croies', 'croie', 'croyions', 'croyiez', 'croient'],
    participePasse: 'cru',
  },
  connaître: {
    present: ['connais', 'connais', 'connaît', 'connaissons', 'connaissez', 'connaissent'],
    passeSimpleStem: 'conn', passeSimpleType: 'u',
    subjonctifStem: 'connaiss',
    participePasse: 'connu',
  },
  paraître: {
    present: ['parais', 'parais', 'paraît', 'paraissons', 'paraissez', 'paraissent'],
    passeSimpleStem: 'par', passeSimpleType: 'u',
    subjonctifStem: 'paraiss',
    participePasse: 'paru',
  },
  naître: {
    present: ['nais', 'nais', 'naît', 'naissons', 'naissez', 'naissent'],
    passeSimpleStem: 'naqu', passeSimpleType: 'i',
    subjonctifStem: 'naiss',
    participePasse: 'né',
    aux: 'être',
  },
  croître: {
    present: ['croîs', 'croîs', 'croît', 'croissons', 'croissez', 'croissent'],
    passeSimple: ['crûs', 'crûs', 'crût', 'crûmes', 'crûtes', 'crûrent'],
    subjonctifStem: 'croiss',
    participePasse: 'crû',
  },
  écrire: {
    present: ['écris', 'écris', 'écrit', 'écrivons', 'écrivez', 'écrivent'],
    passeSimpleStem: 'écriv', passeSimpleType: 'i',
    subjonctifStem: 'écriv',
    participePasse: 'écrit',
  },
  lire: {
    present: ['lis', 'lis', 'lit', 'lisons', 'lisez', 'lisent'],
    passeSimpleStem: 'l', passeSimpleType: 'u',
    subjonctifStem: 'lis',
    participePasse: 'lu',
  },
  vivre: {
    present: ['vis', 'vis', 'vit', 'vivons', 'vivez', 'vivent'],
    passeSimpleStem: 'véc', passeSimpleType: 'u',
    subjonctifStem: 'viv',
    participePasse: 'vécu',
  },
  suivre: {
    present: ['suis', 'suis', 'suit', 'suivons', 'suivez', 'suivent'],
    passeSimpleStem: 'suiv', passeSimpleType: 'i',
    subjonctifStem: 'suiv',
    participePasse: 'suivi',
  },
  rire: {
    present: ['ris', 'ris', 'rit', 'rions', 'riez', 'rient'],
    passeSimpleStem: 'r', passeSimpleType: 'i',
    subjonctifStem: 'ri',
    participePasse: 'ri',
  },
  plaire: {
    present: ['plais', 'plais', 'plaît', 'plaisons', 'plaisez', 'plaisent'],
    passeSimpleStem: 'pl', passeSimpleType: 'u',
    subjonctifStem: 'plais',
    participePasse: 'plu',
  },
  taire: {
    present: ['tais', 'tais', 'tait', 'taisons', 'taisez', 'taisent'],
    passeSimpleStem: 't', passeSimpleType: 'u',
    subjonctifStem: 'tais',
    participePasse: 'tu',
  },
  craindre: {
    present: ['crains', 'crains', 'craint', 'craignons', 'craignez', 'craignent'],
    passeSimpleStem: 'craign', passeSimpleType: 'i',
    subjonctifStem: 'craign',
    participePasse: 'craint',
  },
  peindre: {
    present: ['peins', 'peins', 'peint', 'peignons', 'peignez', 'peignent'],
    passeSimpleStem: 'peign', passeSimpleType: 'i',
    subjonctifStem: 'peign',
    participePasse: 'peint',
  },
  atteindre: {
    present: ['atteins', 'atteins', 'atteint', 'atteignons', 'atteignez', 'atteignent'],
    passeSimpleStem: 'atteign', passeSimpleType: 'i',
    subjonctifStem: 'atteign',
    participePasse: 'atteint',
  },
  éteindre: {
    present: ['éteins', 'éteins', 'éteint', 'éteignons', 'éteignez', 'éteignent'],
    passeSimpleStem: 'éteign', passeSimpleType: 'i',
    subjonctifStem: 'éteign',
    participePasse: 'éteint',
  },
  joindre: {
    present: ['joins', 'joins', 'joint', 'joignons', 'joignez', 'joignent'],
    passeSimpleStem: 'joign', passeSimpleType: 'i',
    subjonctifStem: 'joign',
    participePasse: 'joint',
  },
  battre: {
    present: ['bats', 'bats', 'bat', 'battons', 'battez', 'battent'],
    passeSimpleStem: 'batt', passeSimpleType: 'i',
    subjonctifStem: 'batt',
    participePasse: 'battu',
  },
  rompre: {
    present: ['romps', 'romps', 'rompt', 'rompons', 'rompez', 'rompent'],
    passeSimpleStem: 'romp', passeSimpleType: 'i',
    subjonctifStem: 'romp',
    participePasse: 'rompu',
  },
  vaincre: {
    present: ['vaincs', 'vaincs', 'vainc', 'vainquons', 'vainquez', 'vainquent'],
    passeSimpleStem: 'vainqu', passeSimpleType: 'i',
    subjonctifStem: 'vainqu',
    participePasse: 'vaincu',
  },
  courir: {
    present: ['cours', 'cours', 'court', 'courons', 'courez', 'courent'],
    futurStem: 'courr',
    passeSimpleStem: 'cour', passeSimpleType: 'u',
    subjonctifStem: 'cour',
    participePasse: 'couru',
  },
  mourir: {
    present: ['meurs', 'meurs', 'meurt', 'mourons', 'mourez', 'meurent'],
    futurStem: 'mourr',
    passeSimpleStem: 'mour', passeSimpleType: 'u',
    subjonctif: ['meure', 'meures', 'meure', 'mourions', 'mouriez', 'meurent'],
    participePasse: 'mort',
    aux: 'être',
  },
  // The -vrir / -frir family conjugates its present like an -er verb.
  ouvrir: {
    present: ['ouvre', 'ouvres', 'ouvre', 'ouvrons', 'ouvrez', 'ouvrent'],
    passeSimpleStem: 'ouvr', passeSimpleType: 'i',
    subjonctifStem: 'ouvr',
    participePasse: 'ouvert',
  },
  couvrir: {
    present: ['couvre', 'couvres', 'couvre', 'couvrons', 'couvrez', 'couvrent'],
    passeSimpleStem: 'couvr', passeSimpleType: 'i',
    subjonctifStem: 'couvr',
    participePasse: 'couvert',
  },
  offrir: {
    present: ['offre', 'offres', 'offre', 'offrons', 'offrez', 'offrent'],
    passeSimpleStem: 'offr', passeSimpleType: 'i',
    subjonctifStem: 'offr',
    participePasse: 'offert',
  },
  souffrir: {
    present: ['souffre', 'souffres', 'souffre', 'souffrons', 'souffrez', 'souffrent'],
    passeSimpleStem: 'souffr', passeSimpleType: 'i',
    subjonctifStem: 'souffr',
    participePasse: 'souffert',
  },
  cueillir: {
    present: ['cueille', 'cueilles', 'cueille', 'cueillons', 'cueillez', 'cueillent'],
    futurStem: 'cueiller',
    passeSimpleStem: 'cueill', passeSimpleType: 'i',
    subjonctifStem: 'cueill',
    participePasse: 'cueilli',
  },
  // The base of acquérir, conquérir and requérir — none of which is a word on
  // its own any more, but all of which conjugate as prefixings of it.
  quérir: {
    present: ['quiers', 'quiers', 'quiert', 'quérons', 'quérez', 'quièrent'],
    futurStem: 'querr',
    passeSimpleStem: 'qu', passeSimpleType: 'i',
    subjonctif: ['quière', 'quières', 'quière', 'quérions', 'quériez', 'quièrent'],
    participePasse: 'quis',
  },
  fuir: {
    present: ['fuis', 'fuis', 'fuit', 'fuyons', 'fuyez', 'fuient'],
    passeSimpleStem: 'fu', passeSimpleType: 'i',
    subjonctif: ['fuie', 'fuies', 'fuie', 'fuyions', 'fuyiez', 'fuient'],
    participePasse: 'fui',
  },
  haïr: {
    present: ['hais', 'hais', 'hait', 'haïssons', 'haïssez', 'haïssent'],
    passeSimple: ['haïs', 'haïs', 'haït', 'haïmes', 'haïtes', 'haïrent'],
    subjonctifStem: 'haïss',
    participePasse: 'haï',
  },
  vêtir: {
    present: ['vêts', 'vêts', 'vêt', 'vêtons', 'vêtez', 'vêtent'],
    passeSimpleStem: 'vêt', passeSimpleType: 'i',
    subjonctifStem: 'vêt',
    participePasse: 'vêtu',
  },
  bouillir: {
    present: ['bous', 'bous', 'bout', 'bouillons', 'bouillez', 'bouillent'],
    passeSimpleStem: 'bouill', passeSimpleType: 'i',
    subjonctifStem: 'bouill',
    participePasse: 'bouilli',
  },
  résoudre: {
    present: ['résous', 'résous', 'résout', 'résolvons', 'résolvez', 'résolvent'],
    passeSimpleStem: 'résol', passeSimpleType: 'u',
    subjonctifStem: 'résolv',
    participePasse: 'résolu',
  },
  coudre: {
    present: ['couds', 'couds', 'coud', 'cousons', 'cousez', 'cousent'],
    passeSimpleStem: 'cous', passeSimpleType: 'i',
    subjonctifStem: 'cous',
    participePasse: 'cousu',
  },
  moudre: {
    present: ['mouds', 'mouds', 'moud', 'moulons', 'moulez', 'moulent'],
    passeSimpleStem: 'moul', passeSimpleType: 'u',
    subjonctifStem: 'moul',
    participePasse: 'moulu',
  },
  // recevoir, apercevoir, décevoir, concevoir and percevoir are all this one
  // base with a prefix on it. Spelled out separately, percevoir would have
  // fallen through to *voir* and come back as *je percevois*.
  cevoir: {
    present: ['çois', 'çois', 'çoit', 'cevons', 'cevez', 'çoivent'],
    futurStem: 'cevr',
    passeSimpleStem: 'ç', passeSimpleType: 'u',
    subjonctif: ['çoive', 'çoives', 'çoive', 'cevions', 'ceviez', 'çoivent'],
    participePasse: 'çu',
  },
  valoir: {
    present: ['vaux', 'vaux', 'vaut', 'valons', 'valez', 'valent'],
    futurStem: 'vaudr',
    passeSimpleStem: 'val', passeSimpleType: 'u',
    subjonctif: ['vaille', 'vailles', 'vaille', 'valions', 'valiez', 'vaillent'],
    participePasse: 'valu',
  },
  mouvoir: {
    present: ['meus', 'meus', 'meut', 'mouvons', 'mouvez', 'meuvent'],
    futurStem: 'mouvr',
    passeSimpleStem: 'm', passeSimpleType: 'u',
    subjonctif: ['meuve', 'meuves', 'meuve', 'mouvions', 'mouviez', 'meuvent'],
    participePasse: 'mû',
  },
  // The circumflex on *mû* marks a contraction that its prefixed forms lost:
  // ému and promu are spelled plainly.
  émouvoir: {
    present: ['émeus', 'émeus', 'émeut', 'émouvons', 'émouvez', 'émeuvent'],
    futurStem: 'émouvr',
    passeSimpleStem: 'ém', passeSimpleType: 'u',
    subjonctif: ['émeuve', 'émeuves', 'émeuve', 'émouvions', 'émouviez', 'émeuvent'],
    participePasse: 'ému',
  },
  promouvoir: {
    present: ['promeus', 'promeus', 'promeut', 'promouvons', 'promouvez', 'promeuvent'],
    futurStem: 'promouvr',
    passeSimpleStem: 'prom', passeSimpleType: 'u',
    subjonctif: ['promeuve', 'promeuves', 'promeuve', 'promouvions', 'promouviez', 'promeuvent'],
    participePasse: 'promu',
  },
  asseoir: {
    present: ['assieds', 'assieds', 'assied', 'asseyons', 'asseyez', 'asseyent'],
    futurStem: 'assiér',
    passeSimpleStem: 'ass', passeSimpleType: 'i',
    subjonctifStem: 'assey',
    participePasse: 'assis',
  },
  envoyer: {
    present: ['envoie', 'envoies', 'envoie', 'envoyons', 'envoyez', 'envoient'],
    futurStem: 'enverr',
    subjonctif: ['envoie', 'envoies', 'envoie', 'envoyions', 'envoyiez', 'envoient'],
    participePasse: 'envoyé',
  },
  // Impersonal: only the third person singular exists.
  falloir: {
    present: [null, null, 'faut', null, null, null],
    futurStem: 'faudr',
    passeSimpleStem: 'fall', passeSimpleType: 'u',
    subjonctif: [null, null, 'faille', null, null, null],
    participePasse: 'fallu',
    participePresent: null,
    imperatif: [null, null, null],
    defective: ['je', 'tu', 'nous', 'vous', 'ils'],
  },
  pleuvoir: {
    present: [null, null, 'pleut', null, null, null],
    futurStem: 'pleuvr',
    passeSimpleStem: 'pl', passeSimpleType: 'u',
    subjonctif: [null, null, 'pleuve', null, null, null],
    participePasse: 'plu',
    participePresent: 'pleuvant',
    imperatif: [null, null, null],
    defective: ['je', 'tu', 'nous', 'vous', 'ils'],
  },
};

/**
 * Bases whose irregularity is inherited by prefixed derivatives, so *reprendre*
 * comes free from *prendre* and *découvrir* from *couvrir*. Longest first, so
 * *entreprendre* matches *prendre* and not the shorter *prendre* inside another
 * candidate. French prefixes never move an accent, so a derivative is simply
 * the prefix stuck onto every form.
 */
export const PREFIXABLE = [
  'prendre', 'mettre', 'venir', 'tenir', 'dire', 'faire', 'écrire',
  'lire', 'voir', 'courir', 'ouvrir', 'couvrir', 'offrir', 'souffrir', 'battre', 'rompre',
  'connaître', 'paraître', 'naître', 'croître', 'vivre', 'suivre', 'rire', 'plaire', 'taire',
  'craindre', 'peindre', 'atteindre', 'éteindre', 'joindre', 'mourir', 'quérir', 'valoir',
  'mouvoir', 'asseoir', 'boire', 'croire', 'fuir', 'vêtir', 'résoudre', 'coudre', 'moudre',
  'partir', 'sortir', 'dormir', 'servir', 'sentir', 'mentir', 'cueillir', 'aller',
  'vaincre', 'cevoir',
];

/**
 * The -uire family: conduire, traduire, construire, cuire and the rest all run
 * on one pattern, so they are a rule rather than twelve near-identical entries.
 * A handful end in -ui rather than -uit.
 */
export const UIRE_SHORT_PARTICIPLE = new Set(['nuire', 'entrenuire', 'luire', 'reluire']);

/**
 * Verbs whose compound tenses take *être*, plus every pronominal verb.
 *
 * Several of these take *avoir* when used transitively — *j'ai sorti la
 * poubelle* against *je suis sorti* — which is a lesson in itself rather than
 * something a table can show, so the table gives the intransitive reading and
 * the grammar note covers the rest.
 */
export const ETRE_VERBS = new Set([
  'aller', 'arriver', 'entrer', 'rentrer', 'monter', 'remonter', 'descendre', 'redescendre',
  'tomber', 'retomber', 'rester', 'passer', 'naître', 'renaître', 'mourir', 'décéder',
  'partir', 'repartir', 'sortir', 'ressortir', 'venir', 'revenir', 'devenir', 'parvenir',
  'survenir', 'intervenir', 'retourner', 'apparaître', 'demeurer',
]);

/** Search index: [infinitive, English gloss]. */
export const COMMON_VERBS = [
  ['être', 'to be'],
  ['avoir', 'to have'],
  ['aller', 'to go'],
  ['faire', 'to do, to make'],
  ['dire', 'to say'],
  ['pouvoir', 'to be able to'],
  ['vouloir', 'to want'],
  ['devoir', 'to have to, to owe'],
  ['savoir', 'to know (a fact)'],
  ['connaître', 'to know (be familiar with)'],
  ['voir', 'to see'],
  ['venir', 'to come'],
  ['tenir', 'to hold'],
  ['prendre', 'to take'],
  ['mettre', 'to put'],
  ['parler', 'to speak'],
  ['aimer', 'to like, to love'],
  ['donner', 'to give'],
  ['penser', 'to think'],
  ['trouver', 'to find'],
  ['passer', 'to pass, to spend (time)'],
  ['demander', 'to ask'],
  ['rester', 'to stay'],
  ['porter', 'to carry, to wear'],
  ['montrer', 'to show'],
  ['regarder', 'to watch, to look at'],
  ['chercher', 'to look for'],
  ['travailler', 'to work'],
  ['jouer', 'to play'],
  ['écouter', 'to listen'],
  ['habiter', 'to live (somewhere)'],
  ['arriver', 'to arrive, to happen'],
  ['entrer', 'to enter'],
  ['rentrer', 'to go back home'],
  ['monter', 'to go up'],
  ['tomber', 'to fall'],
  ['retourner', 'to return'],
  ['apporter', 'to bring'],
  ['garder', 'to keep'],
  ['oublier', 'to forget'],
  ['étudier', 'to study'],
  ['expliquer', 'to explain'],
  ['raconter', 'to tell (a story)'],
  ['marcher', 'to walk, to work (function)'],
  ['danser', 'to dance'],
  ['chanter', 'to sing'],
  ['dessiner', 'to draw'],
  ['manger', 'to eat'],
  ['nager', 'to swim'],
  ['voyager', 'to travel'],
  ['changer', 'to change'],
  ['ranger', 'to tidy up'],
  ['partager', 'to share'],
  ['commencer', 'to begin'],
  ['avancer', 'to move forward'],
  ['lancer', 'to throw'],
  ['placer', 'to place'],
  ['prononcer', 'to pronounce'],
  ['remplacer', 'to replace'],
  ['payer', 'to pay'],
  ['essayer', 'to try'],
  ['employer', 'to use, to employ'],
  ['envoyer', 'to send'],
  ['nettoyer', 'to clean'],
  ['ennuyer', 'to bore, to annoy'],
  ['appuyer', 'to press, to lean'],
  ['acheter', 'to buy'],
  ['geler', 'to freeze'],
  ['lever', 'to lift'],
  ['emmener', 'to take (someone) along'],
  ['amener', 'to bring (someone)'],
  ['peser', 'to weigh'],
  ['appeler', 'to call'],
  ['rappeler', 'to call back, to remind'],
  ['jeter', 'to throw'],
  ['espérer', 'to hope'],
  ['préférer', 'to prefer'],
  ['répéter', 'to repeat'],
  ['posséder', 'to own'],
  ['céder', 'to give in'],
  ['inquiéter', 'to worry'],
  ['finir', 'to finish'],
  ['choisir', 'to choose'],
  ['réussir', 'to succeed'],
  ['grandir', 'to grow up'],
  ['grossir', 'to put on weight'],
  ['maigrir', 'to lose weight'],
  ['réfléchir', 'to think it over'],
  ['obéir', 'to obey'],
  ['punir', 'to punish'],
  ['remplir', 'to fill'],
  ['bâtir', 'to build'],
  ['guérir', 'to heal'],
  ['nourrir', 'to feed'],
  ['saisir', 'to seize'],
  ['ralentir', 'to slow down'],
  ['applaudir', 'to applaud'],
  ['avertir', 'to warn'],
  ['définir', 'to define'],
  ['établir', 'to establish'],
  ['haïr', 'to hate'],
  ['vendre', 'to sell'],
  ['attendre', 'to wait for'],
  ['entendre', 'to hear'],
  ['descendre', 'to go down'],
  ['perdre', 'to lose'],
  ['rendre', 'to give back'],
  ['répondre', 'to answer'],
  ['défendre', 'to defend, to forbid'],
  ['dépendre', 'to depend'],
  ['prétendre', 'to claim'],
  ['tendre', 'to stretch, to hold out'],
  ['fondre', 'to melt'],
  ['mordre', 'to bite'],
  ['tordre', 'to twist'],
  ['confondre', 'to confuse'],
  ['correspondre', 'to correspond'],
  ['interrompre', 'to interrupt'],
  ['rompre', 'to break off'],
  ['corrompre', 'to corrupt'],
  ['battre', 'to beat'],
  ['combattre', 'to fight'],
  ['abattre', 'to knock down'],
  ['partir', 'to leave'],
  ['sortir', 'to go out'],
  ['dormir', 'to sleep'],
  ['servir', 'to serve'],
  ['sentir', 'to feel, to smell'],
  ['mentir', 'to lie'],
  ['ressentir', 'to feel (an emotion)'],
  ['consentir', 'to consent'],
  ['endormir', 'to send to sleep'],
  ['courir', 'to run'],
  ['parcourir', 'to travel through'],
  ['secourir', 'to rescue'],
  ['mourir', 'to die'],
  ['ouvrir', 'to open'],
  ['rouvrir', 'to reopen'],
  ['couvrir', 'to cover'],
  ['découvrir', 'to discover'],
  ['offrir', 'to offer'],
  ['souffrir', 'to suffer'],
  ['cueillir', 'to pick'],
  ['accueillir', 'to welcome'],
  ['acquérir', 'to acquire'],
  ['conquérir', 'to conquer'],
  ['fuir', 'to flee'],
  ['vêtir', 'to clothe'],
  ['bouillir', 'to boil'],
  ['lire', 'to read'],
  ['relire', 'to reread'],
  ['élire', 'to elect'],
  ['écrire', 'to write'],
  ['décrire', 'to describe'],
  ['inscrire', 'to enrol, to write down'],
  ['vivre', 'to live'],
  ['survivre', 'to survive'],
  ['suivre', 'to follow'],
  ['poursuivre', 'to pursue'],
  ['rire', 'to laugh'],
  ['sourire', 'to smile'],
  ['plaire', 'to please'],
  ['déplaire', 'to displease'],
  ['taire', 'to keep quiet about'],
  ['boire', 'to drink'],
  ['croire', 'to believe'],
  ['conduire', 'to drive'],
  ['produire', 'to produce'],
  ['traduire', 'to translate'],
  ['construire', 'to build'],
  ['détruire', 'to destroy'],
  ['introduire', 'to introduce'],
  ['réduire', 'to reduce'],
  ['séduire', 'to seduce'],
  ['cuire', 'to cook'],
  ['nuire', 'to harm'],
  ['craindre', 'to fear'],
  ['plaindre', 'to pity'],
  ['peindre', 'to paint'],
  ['éteindre', 'to switch off'],
  ['atteindre', 'to reach'],
  ['joindre', 'to join, to reach (someone)'],
  ['rejoindre', 'to rejoin, to meet up with'],
  ['vaincre', 'to defeat'],
  ['convaincre', 'to convince'],
  ['résoudre', 'to solve'],
  ['coudre', 'to sew'],
  ['moudre', 'to grind'],
  ['naître', 'to be born'],
  ['renaître', 'to be reborn'],
  ['paraître', 'to seem'],
  ['apparaître', 'to appear'],
  ['disparaître', 'to disappear'],
  ['reconnaître', 'to recognise'],
  ['croître', 'to grow'],
  ['recevoir', 'to receive'],
  ['apercevoir', 'to catch sight of'],
  ['décevoir', 'to disappoint'],
  ['concevoir', 'to conceive'],
  ['valoir', 'to be worth'],
  ['falloir', 'to be necessary'],
  ['pleuvoir', 'to rain'],
  ['mouvoir', 'to move'],
  ['émouvoir', 'to move (emotionally)'],
  ['asseoir', 'to seat'],
  ['prévoir', 'to foresee'],
  ['revoir', 'to see again'],
  ['apprendre', 'to learn'],
  ['comprendre', 'to understand'],
  ['reprendre', 'to take back, to resume'],
  ['surprendre', 'to surprise'],
  ['entreprendre', 'to undertake'],
  ['permettre', 'to allow'],
  ['promettre', 'to promise'],
  ['remettre', 'to hand over, to put back'],
  ['admettre', 'to admit'],
  ['soumettre', 'to submit'],
  ['transmettre', 'to transmit'],
  ['devenir', 'to become'],
  ['revenir', 'to come back'],
  ['prévenir', 'to warn'],
  ['obtenir', 'to obtain'],
  ['contenir', 'to contain'],
  ['retenir', 'to retain'],
  ['maintenir', 'to maintain'],
  ['appartenir', 'to belong'],
  ['soutenir', 'to support'],
  ['refaire', 'to redo'],
  ['défaire', 'to undo'],
  ['satisfaire', 'to satisfy'],
  ['interdire', 'to forbid'],
  ['prédire', 'to predict'],
];
