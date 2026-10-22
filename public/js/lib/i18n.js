/**
 * Interface language.
 *
 * Two axes meet here and they are not the same thing:
 *
 *   the subject  — the language the site is *about*. Interpres is about Latin
 *                  and nothing else, so this axis no longer moves.
 *   this file    — the language of the *chrome*: Latin, or English.
 *
 * So the header switch reads LA | EN. Neither side is gated: English is the
 * working language of a Latin lesson rather than a way round it, so there is
 * nothing here to protect and no passcode to ask for.
 *
 * Content the site is about never changes language: verb forms, dictionary
 * headwords, the case names in the tables. Only the chrome moves.
 */

const LANG_KEY = 'interpres:lang';

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked — the choice still applies for this visit.
  }
}

/** A stored choice only counts if it is one of the two on offer. */
function settle(value) {
  return value === 'en' || value === 'la' ? value : 'la';
}

/**
 * The interface is English. The LA | EN switch was taken out with the redesign;
 * the Latin pack is still here, so putting `settle(read(LANG_KEY))` back on
 * this line and a switch in the header restores the choice.
 */
let current = 'en';

export function lang() {
  return current;
}

/** The two options the switch offers. */
export function languageOptions() {
  return ['la', 'en'];
}

export function setLang(next) {
  current = settle(next);
  write(LANG_KEY, current);
  document.documentElement.lang = current;
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } }));
  return current;
}

/** Look a string up, with {placeholders}. */
export function t(key, vars = null) {
  const entry = key.split('.').reduce((node, part) => node?.[part], STRINGS);
  let text = entry?.[current] ?? entry?.la ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Pick the right half of an object that already carries both languages. */
export function pick(pair) {
  return pair?.[current] ?? pair?.la ?? pair?.en ?? '';
}

const latine = (la, en) => ({ la, en });

/**
 * The Latin pack.
 *
 * The Latin is real Latin where Latin has a word for the thing, and a
 * respectable coinage where it does not — *colloquium* for the chat, *stadia*
 * for the course's stages. It is a curiosity to opt into rather than the
 * default, which is why nothing important depends on reading it.
 *
 * Two sections here have no counterpart in the other packs, because two pages
 * do not exist elsewhere: the declension tables and the stage vocabulary.
 */
const LATIN = {
  nav: {
    conjugation: latine('Coniugatio', 'Conjugation'),
    declension: latine('Declinatio', 'Declension'),
    stages: latine('Stadia', 'Stages'),
    dictionary: latine('Lexicon', 'Dictionary'),
    theme: latine('Mutare speciem', 'Switch theme'),
    menu: latine('Aperire indicem', 'Open menu'),
    langLabel: latine('Lingua paginae', 'Site language'),
    more: latine('Plura', 'More'),
  },

  meta: {
    home: latine('Interpres', 'Interpres'),
    skip: latine('Ad contenta', 'Skip to content'),
    footer: latine('significationes ex', 'definitions from'),
    copyright: latine('© Yuzhe (Julian) Chen 2026', '© Yuzhe (Julian) Chen 2026'),
    footerDict: latine('Whitaker’s Words', 'Whitaker’s Words'),
    footerHref: latine('https://mk270.github.io/whitakers-words/', 'https://mk270.github.io/whitakers-words/'),
    footerCredit: latine(' (in publico)', ' (public domain)'),
  },

  hero: {
    sub: latine(
      'Verte Latine et Anglice, coniuga verba, declina nomina, quaere verba in lexico, roga quaestiones.',
      'Conjugate any verb, decline any noun, and look up any word, with the Cambridge course vocabulary stage by stage.',
    ),
    title: latine('interpres|lingua latina|sine lacrimis', 'interpres|latin without|the tears'),
    ctaConjugate: latine('Verba coniugare', 'Conjugate a verb'),
    ctaDictionary: latine('Lexicon aperire', 'Open the dictionary'),
  },

  finder: {
    eyebrow: latine('Lexicon', 'Dictionary'),
    title: latine('Quaere verbum', 'Look up a word'),
    lead: latine(
      'Scribe quamlibet formam. Lexicon dat verbum principale, partes principales, et quomodo forma legatur.',
      'Type any form of a word. The dictionary gives its dictionary form, its principal parts, and how the form you typed can be read.',
    ),
    button: latine('Quaerere', 'Search'),
    tryWith: latine('Proba', 'Try'),
    note: latine('Preme Enter ut paginam lexici aperias.', 'Press Enter to open the dictionary page.'),
    label: latine('Quaerere verbum in lexico', 'Search for a word in the dictionary'),
    samples: latine('canem,puellae,rexit,urbium,amavissent', 'canem,puellae,rexit,urbium,amavissent'),
  },

  features: {
    title: latine('instrumenta', 'tools'),
    conjugation: latine('Coniugatio', 'Conjugation'),
    conjugationBody: latine(
      'Tabulae verborum: omnia tempora, modi, voces, quinque coniugationes.',
      'Verb tables: all tenses, moods and voices, across the five conjugations.',
    ),
    declension: latine('Declinatio', 'Declension'),
    declensionBody: latine(
      'Tabulae nominum et adiectivorum: omnis casus, numerus, genus.',
      'Noun and adjective tables: every case, number and gender.',
    ),
    dictionary: latine('Lexicon', 'Dictionary'),
    dictionaryBody: latine(
      'Partes principales, genus, declinatio, et omnis lectio formae quam scripsisti.',
      'Principal parts, gender, declension, and every reading of the form you typed.',
    ),
  },

  conjugator: {
    eyebrow: latine('Coniugatio', 'Conjugation'),
    title: latine('Coniugationes Latinae', 'Latin conjugations'),
    lead: latine(
      'Elige coniugationem, aut scribe verbum cum partibus principalibus. Sine eis verbum coniugari non potest.',
      'Pick a conjugation, or type a verb with its principal parts. A Latin verb cannot be conjugated without them.',
    ),
    tab: latine('coniugatio {ending}', '{ending} conjugation'),
    search: latine('Quaerere verbum', 'Search a verb'),
    searchLabel: latine('Quaerere verbum', 'Search for a verb'),
    highlight: latine('Notare irregularia', 'Highlight irregulars'),
    notAVerb: latine('Hoc verbum non agnosco', "I don't recognise that verb"),
    indicative: latine('Indicativus', 'Indicative'),
    subjunctive: latine('Coniunctivus', 'Subjunctive'),
    imperative: latine('Imperativus', 'Imperative'),
    simple: latine('Activum', 'Active'),
    compound: latine('Passivum', 'Passive'),
    affirmative: latine('Affirmativus', 'Affirmative'),
    negative: latine('Negativus', 'Negative'),
    gerund: latine('participium praesens', 'present participle'),
    participle: latine('participium perfectum', 'perfect participle'),
    compoundInf: latine('gerundivum', 'gerundive'),
    compoundGer: latine('supinum', 'supine'),
    fullTable: latine('Tabula plena', 'Full conjugation'),
    verbClass: latine('coniugatio {ending}', '{ending} conjugation'),
    irregular: latine('irregulare', 'irregular'),
    stemChange: latine('{change}', '{change}'),
    spelling: latine('{change}', '{change}'),
    likeVerb: latine('compositum ex {verb}', 'compound of {verb}'),
    pronominal: latine('deponens', 'deponent'),
    principalParts: latine('partes principales', 'principal parts'),
    needsParts: latine(
      'Verbum Latinum sine partibus principalibus coniugari non potest. Scribe eas omnes, ut “rego, regere, rexi, rectus”.',
      'A Latin verb cannot be conjugated without its principal parts. Type them all, like “rego, regere, rexi, rectus”.',
    ),
  },

  declension: {
    eyebrow: latine('Declinatio', 'Declension'),
    title: latine('Declinationes Latinae', 'Latin declensions'),
    lead: latine(
      'Scribe nomen cum genetivo, ut “rex, regis”, aut adiectivum cum omnibus formis. Genetivus declinationem et stirpem dat.',
      'Type a noun with its genitive, like “rex, regis”, or an adjective with all its forms. The genitive is what gives the declension and the stem.',
    ),
    search: latine('rex, regis', 'rex, regis'),
    searchLabel: latine('Quaerere nomen aut adiectivum', 'Search a noun or adjective'),
    button: latine('Declinare', 'Decline'),
    tab: latine('declinatio {n}', '{n} declension'),
    adjectives: latine('Adiectiva', 'Adjectives'),
    singular: latine('singularis', 'singular'),
    plural: latine('pluralis', 'plural'),
    notANoun: latine('Hoc declinare non possum', "I can't decline that"),
    needsGenitive: latine(
      'Scribe etiam genetivum, ut “puella, puellae”. Sine eo declinatio ignota est.',
      'Give the genitive too, as in “puella, puellae”. Without it the declension cannot be worked out.',
    ),
    wrongGenitive: latine(
      'Genetivus verbi “{lemma}” est “{expected}”, non id quod scripsisti.',
      'The genitive of “{lemma}” is “{expected}”, not what you typed.',
    ),
    unknown: latine(
      'Hoc verbum in lexico non est. Scribe et nominativum et genetivum.',
      'The dictionary does not have that word. Give both the nominative and the genitive.',
    ),
    completed: latine(
      'Genetivum ex lexico addidi: {parts}.',
      'Genitive filled in from the dictionary: {parts}.',
    ),
    completedNominative: latine(
      'Hoc genetivus est. Nominativum ex lexico addidi: {parts}.',
      'That is a genitive. Nominative filled in from the dictionary: {parts}.',
    ),
    gendered: latine('masculinum / femininum', 'masculine / feminine'),
    pickGender: latine('Elige genus', 'Choose a gender'),
    iStem: latine('stirps in -i', 'i-stem'),
    stem: latine('stirps', 'stem'),
    cases: latine('Casus', 'Cases'),
    masculine: latine('masculinum', 'masculine'),
    feminine: latine('femininum', 'feminine'),
    neuter: latine('neutrum', 'neuter'),
    nominative: latine('nominativus', 'nominative'),
    vocative: latine('vocativus', 'vocative'),
    accusative: latine('accusativus', 'accusative'),
    genitive: latine('genetivus', 'genitive'),
    dative: latine('dativus', 'dative'),
    ablative: latine('ablativus', 'ablative'),
  },

  stages: {
    eyebrow: latine('Stadia', 'Stages'),
    title: latine('Vocabula per stadia', 'Course vocabulary by stage'),
    lead: latine(
      'Scribe numerum stadii ut omnia eius vocabula videas.',
      'Type a stage number to see all of its vocabulary.',
    ),
    search: latine('numerus stadii', 'stage number'),
    searchLabel: latine('Quaerere stadium', 'Search a stage'),
    button: latine('Ostendere', 'Show'),
    notFound: latine('Hoc stadium non habeo', "I don't have that stage"),
    wordCount: latine('{n} vocabula', '{n} words'),
    latinWord: latine('Latine', 'Latin'),
    englishWord: latine('Anglice', 'English'),
    allStages: latine('Omnia stadia', 'All stages'),
    fromStage: latine('Unde', 'From'),
    lookUp: latine('In lexico quaerere', 'Look it up in the dictionary'),
  },

  dictionary: {
    eyebrow: latine('Lexicon', 'Dictionary'),
    title: latine('Lexicon et stadia', 'dictionary'),
    pageLead: latine(
      'Ad sinistram vocabula cursus per stadia; ad dextram lexicon. Preme verbum ut id quaeras.',
      'Course vocabulary stage by stage, with the dictionary beside it. Click any word in a stage to look it up.',
    ),
    lead: latine(
      'Scribe formam quam in textu invenisti. Lexicon verbum principale, partes principales, et omnem lectionem formae dat.',
      'Type the form you found in the text. The dictionary gives its dictionary form, its principal parts, and every way the form can be read.',
    ),
    search: latine('Quaerere verbum', 'Search a word'),
    button: latine('Quaerere', 'Search'),
    emptyTitle: latine('Scribe verbum', 'Type a word'),
    emptyBody: latine(
      'Proba canem, puellae, rexit, urbium: quamlibet formam, non solum verbum principale.',
      'Try canem, puellae, rexit, urbium. Any form works, not just the dictionary form.',
    ),
    looking: latine('Lexicon consulens…', 'Looking it up…'),
    noResults: latine('Nihil inventum', 'No results'),
    didYouMean: latine('Fortasse?', 'Did you mean?'),
    seeOnRae: latine('videre plenum lemma ↗', 'view the full entry ↗'),
    synonyms: latine('Synonyma', 'Synonyms'),
    antonyms: latine('Contraria', 'Antonyms'),
    locutions: latine('Locutiones', 'Phrases'),
    inUse: latine('In usu', 'In use'),
    speak: latine('Verbum audire', 'Hear the word'),
    speakFailed: latine('Non potest pronuntiari.', 'Could not pronounce that.'),
    speakSpent: latine('Pronuntiationes huius mensis consumptae sunt.', 'This month’s pronunciations are used up.'),
    // Said next to the button, not buried in a footnote: no speech model has
    // Latin, so this is an approximation and closer to ecclesiastical than to
    // the classical pronunciation the course teaches.
    speakLatin: latine(
      'Sonus per machinam fictus est. Non est pronuntiatio classica.',
      'Approximated by a machine. Closer to church Latin than to the classical pronunciation a course teaches.'),
    templateNote: latine('', ''),
    parses: latine('Formae lectiones', 'How this form reads'),
    principalParts: latine('Partes principales', 'Principal parts'),
  },

};

export const STRINGS = LATIN;
