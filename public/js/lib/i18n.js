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
    translator: latine('Interpres', 'Translator'),
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
      'Translate between Latin and English, conjugate verbs, decline nouns and look up any word.',
    ),
    title: latine('interpres|lingua latina|sine lacrimis', 'interpres|latin without|the tears'),
    ctaTranslate: latine('Interpretem probare', 'Start translating'),
    ctaDictionary: latine('Lexicon aperire', 'Open the dictionary'),
  },

  translator: {
    eyebrow: latine('Interpres', 'Translator'),
    title: latine('Interpres Latinus', 'Latin translation'),
    lead: latine(
      'Scribe Latine aut Anglice. Nodus medius partes permutat et textum secum fert.',
      'Type in either language. The centre button swaps the direction and carries the text across.',
    ),
    button: latine('Vertere', 'Translate'),
    clear: latine('Delere', 'Clear'),
    copy: latine('Exscribere', 'Copy'),
    copied: latine('Exscriptum!', 'Copied'),
    copyFailed: latine('Non potuit', 'Could not copy'),
    ready: latine('Paratus', 'Ready'),
    working: latine('vertens…', 'translating…'),
    done: latine('Versum', 'Translated'),
    sourceLabel: latine('Textus originalis', 'Source text'),
    swap: latine('Permutare Latinum et Anglicum', 'Swap Latin and English'),
    swapTitle: latine('Mutare linguam', 'Swap languages'),
    studyName: latine('Latine', 'Latin'),
    englishName: latine('English', 'English'),
    placeholderStudy: latine('Scribe aliquid Latine…', 'Write something in Latin…'),
    placeholderEn: latine('Type something in English…', 'Type something in English…'),
    outStudy: latine('Translatio hic apparebit.', 'The translation will appear here.'),
    outEn: latine('The translation will appear here.', 'The translation will appear here.'),
    engine: latine('versum per {engine}', 'translated with {engine}'),
    uncertain: latine(
      'Interpres dubitat: versiones servatae inter se discrepant. Cave.',
      'The translator is unsure of this one: its stored versions disagree. Check it.'),
    unsureWord: latine(
      'Interpres hoc verbum non novit et intactum reliquit.',
      'The translator did not know this word and left it as it was.'),
    wordByWord: latine(
      'Haec sententia non est. Verbum de verbo, cum munere cuiusque. Tu compone.',
      'This is not a sentence. It is the text word by word, with what each one is doing. You assemble it.'),
    uncertainLatin: latine(
      'Hoc ex memoria versionum venit, non ex grammatica huius paginae. Verbum de verbo cave.',
      'This came from a translation memory rather than from the site’s own grammar. Check it word by word.'),

    // The two-route check. See server/latin-sentence.js.
    readingsDiffer: latine(
      'Haec sententia bis versa est, semel ex ipso Latino, semel ex verbis singulis. Versiones inter se discrepant. Cave.',
      'This sentence was read twice, once from the Latin and once from the words one by one. The two readings disagree. Treat it with care.'),
    readingsPartial: latine(
      'Duae versiones fere consentiunt, non omnino.',
      'The two readings mostly agree, but not entirely.'),
    readingCheck: latine('Duae versiones', 'The two readings'),
    readingDirect: latine('Ex ipso Latino', 'Read from the Latin'),
    readingGrounded: latine('Ex verbis singulis', 'Assembled from the words'),
    readingAgreed: latine('consentiunt', 'they agree'),
    readingPartly: latine('fere consentiunt', 'they mostly agree'),
    readingDiffers: latine('discrepant', 'they disagree'),
    readingSingle: latine('una tantum versio', 'only one reading was available'),
    wordList: latine('Verbum ac verbum', 'Word by word'),
    parseTitle: latine('Verbum ac verbum', 'Word by word'),
    parseLead: latine(
      'Omne verbum Latinum, cum significatione et forma.',
      'Every Latin word, with its meaning and its form.',
    ),
    parseUnknown: latine('non agnitum', 'not recognised'),
    caseFixed: latine('casus correctus', 'case corrected'),

    // Latin into English is parsed, not modelled. This is the way to ask a
    // model anyway, and it is never the automatic answer.
    retranslate: latine('Iterum vertere per machinam', 'Re-translate with a model'),
    retranslating: latine('vertens…', 'translating…'),
    retranslated: latine('Versio machinae', 'The model’s translation'),
    retranslateFailed: latine('Machina respondere non potuit.', 'The model could not answer.'),
    parseFailed: latine(
      'Hanc sententiam legere non possum. Verbum principale non inveni.',
      'This sentence could not be read. No verb was found in it.',
    ),

    // The word-by-word breakdown is behind a button now. Most readers want the
    // sentence and nothing else; the ones who want the grammar ask for it.
    details: latine('Plura videre', 'See more information'),
    detailsTitle: latine('Quomodo haec versio facta est', 'How this translation was made'),
    detailsClose: latine('Claudere', 'Close'),
    detailsSource: latine('Textus originalis', 'Source'),
    detailsResult: latine('Translatio', 'Translation'),

    // Shown only when a word came back that is not Latin at all.
    notLatin: latine('Verba non Latina ({words})', 'Not Latin ({words})'),
    report: latine('Errorem nuntiare', 'Report a problem'),
    reportReason: latine('Quid falsum est?', 'What went wrong?'),
    reasonUntranslated: latine('Verbum omnino non versum est', 'A word was not translated at all'),
    reasonFormatting: latine('Forma corrupta', 'Formatting is wrong'),
    reasonWrongWord: latine('Verbum Latinum falsum', 'Wrong Latin word'),
    reasonWrongGrammar: latine('Grammatica falsa', 'Wrong grammar'),
    reasonOther: latine('Aliud', 'Something else'),
    reportTitle: latine('Errorem nuntiare', 'Report a problem'),
    reportLead: latine(
      'Dic quid falsum sit. Nuntius in tabulas refertur.',
      'Say what went wrong. The report goes into the log for someone to work through.',
    ),
    reportNote: latine('Quid falsum est? (non necessarium)', 'What went wrong? (optional)'),
    reportSend: latine('Mittere', 'Send report'),
    reportSent: latine('Nuntiatum. Gratias.', 'Reported. Thank you.'),
    reportFailed: latine('Nuntius mitti non potuit.', 'The report could not be sent.'),
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
