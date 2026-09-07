/**
 * A Latin translator built out of the parts this site already has.
 *
 * No engine on the open web translates Latin well, and no model may be asked
 * to. But the site is not short of Latin knowledge — it has Whitaker's Words
 * for morphology, a decliner, a conjugator, and the course's own vocabulary in
 * both directions. Translation between English and Latin is largely a matter of
 * putting those together, because Latin says the grammar out loud: a noun in
 * the accusative *is* the object, and does not need to be guessed at from where
 * it happens to be sitting.
 *
 * **Latin → English** is the easy direction, and it is nearly assembly. Every
 * word is parsed, each case is read as the role it marks — nominative subject,
 * accusative object, genitive "of", dative "to", ablative "with" — and the
 * pieces are laid out in English order.
 *
 * **English → Latin** is the harder one, because English hides what Latin
 * states. The word order and the little words carry it instead: what comes
 * before the verb is the subject, what follows it is the object, "of" means
 * genitive, "to" means dative. Each content word is looked up, put into the
 * case its role calls for, and the sentence is emitted in the order Latin
 * conventionally uses — subject, then everything else, then the verb at the end.
 *
 * **What it will not do.** Subordinate clauses, participles, indirect
 * statement, relative pronouns, comparatives — anything, in short, past the
 * sentence shapes a first- or second-year class writes. It declines rather than
 * guesses: an unrecognised word or a shape it cannot account for throws, and
 * the chain falls through to the engines below. A translator that quietly
 * invents Latin would be worse than one that admits the sentence is beyond it,
 * because the reader cannot tell the difference and is here to learn.
 */

import { analyse } from './latin.js';
import {
  courseGloss, latinFor, latinCandidates, singularsOf, latinGlossOf, primeLatinGlosses,
  latinNounParts,
} from './latin-lexicon.js';
import { formOf, declineAdjective } from '../public/js/lib/decliner-la.js';
import { latinIdiom } from './latin-idioms.js';
import { conjugate } from '../public/js/lib/conjugator-la.js';

const fold = (word) => String(word ?? '').trim().toLowerCase();

/** Prepositions, and the case each one governs. */
const LATIN_PREPOSITIONS = {
  in: ['ablative', 'accusative'], ad: ['accusative'], ex: ['ablative'], e: ['ablative'],
  ab: ['ablative'], a: ['ablative'], de: ['ablative'], cum: ['ablative'], sine: ['ablative'],
  pro: ['ablative'], sub: ['ablative', 'accusative'], per: ['accusative'], post: ['accusative'],
  ante: ['accusative'], inter: ['accusative'], trans: ['accusative'], contra: ['accusative'],
  apud: ['accusative'], prope: ['accusative'], super: ['accusative'],
};

/** How each preposition reads in English. */
const PREPOSITION_ENGLISH = {
  in: 'in', ad: 'to', ex: 'out of', e: 'out of', ab: 'from', a: 'from', de: 'about',
  cum: 'with', sine: 'without', pro: 'for', sub: 'under', per: 'through', post: 'after',
  ante: 'before', inter: 'among', trans: 'across', contra: 'against', apud: 'at the house of',
  prope: 'near', super: 'above',
};

/** English prepositions, and the Latin case (and word) they turn into. */
const ENGLISH_PREPOSITIONS = {
  of: { case: 'genitive', word: null },
  to: { case: 'dative', word: null },
  for: { case: 'dative', word: null },
  with: { case: 'ablative', word: 'cum' },
  in: { case: 'ablative', word: 'in' },
  on: { case: 'ablative', word: 'in' },
  into: { case: 'accusative', word: 'in' },
  from: { case: 'ablative', word: 'ex' },
  by: { case: 'ablative', word: null },
  through: { case: 'accusative', word: 'per' },
  near: { case: 'accusative', word: 'prope' },
  without: { case: 'ablative', word: 'sine' },
};

const ARTICLES = new Set(['a', 'an', 'the']);

/**
 * Words a glossary must know, which a vocabulary list has no reason to carry.
 *
 * Pronouns above all: Latin drops them from sentences, so the course never
 * lists them, and a glossary that answers "i — ?" three times in one sentence
 * is not worth printing.
 */
const FUNCTION_GLOSS = {
  i: 'ego', you: 'tu', he: 'is', she: 'ea', it: 'id', we: 'nos', they: 'ei',
  me: 'me', him: 'eum', her: 'eam', us: 'nos', them: 'eos',
  my: 'meus', your: 'tuus', his: 'eius', our: 'noster', their: 'eorum',
  who: 'qui', which: 'qui', what: 'quid', that: 'ille', this: 'hic',
  as: 'ut', so: 'ita', very: 'valde', also: 'etiam', always: 'semper',
  never: 'numquam', now: 'nunc', then: 'tum', here: 'hic', there: 'ibi',
  yes: 'ita', no: 'non', and: 'et', or: 'aut', but: 'sed',
  not: 'non', can: 'possum', must: 'debeo', will: 'volo', may: 'possum',
  am: 'sum', is: 'est', are: 'sunt', was: 'erat', were: 'erant', be: 'sum',
  been: 'sum', do: 'facio', does: 'facit', did: 'fecit', have: 'habeo',
  has: 'habet', had: 'habebat', anymore: 'iam', longer: 'diutius',
  more: 'magis', most: 'maxime', less: 'minus', all: 'omnis', some: 'aliquis',
  every: 'omnis', many: 'multi', few: 'pauci', again: 'iterum', still: 'adhuc',
  because: 'quod', if: 'si', when: 'ubi', while: 'dum', where: 'ubi',
  why: 'cur', how: 'quomodo', with: 'cum', without: 'sine', for: 'pro',
  from: 'ex', to: 'ad', in: 'in', on: 'in', at: 'ad', of: 'de',
};

/**
 * English contractions, opened out before anything looks at them.
 *
 * "can't" is one token to a tokeniser and two words to a language, and glossing
 * it whole means glossing nothing: "i — ? · can't — ? · it — ?" is a row of
 * question marks where a reader wanted help.
 */
const CONTRACTIONS = {
  "can't": ['can', 'not'], cannot: ['can', 'not'], "won't": ['will', 'not'],
  "don't": ['do', 'not'], "doesn't": ['does', 'not'], "didn't": ['did', 'not'],
  "isn't": ['is', 'not'], "aren't": ['are', 'not'], "wasn't": ['was', 'not'],
  "weren't": ['were', 'not'], "haven't": ['have', 'not'], "hasn't": ['has', 'not'],
  "hadn't": ['had', 'not'], "i'm": ['i', 'am'], "it's": ['it', 'is'],
  "i've": ['i', 'have'], "i'd": ['i', 'would'], "i'll": ['i', 'will'],
  "you're": ['you', 'are'], "they're": ['they', 'are'], "we're": ['we', 'are'],
  "he's": ['he', 'is'], "she's": ['she', 'is'], "that's": ['that', 'is'],
};

/** Open every contraction in a list of tokens. */
function openContractions(tokens) {
  return tokens.flatMap((token) => CONTRACTIONS[token] ?? [token]);
}

/** A glossary is per-word work, so the only real limit is the input cap. */
const GLOSS_LIMIT = 120;

/**
 * Little words that are not nouns and not verbs, and each one's job.
 *
 * They have to be listed for two reasons: so they are not fed to the noun
 * builder, and so they are not *silently dropped*, which is what happened to
 * every subjunctive before this — "puer laudet" came back as "The boy", verb
 * and all its meaning quietly gone.
 */
const PARTICLES = {
  utinam: { kind: 'wish' },
  ne: { kind: 'negative', english: 'not' },
  non: { kind: 'negative', english: 'not' },
  nonne: { kind: 'negative', english: 'not' },
  si: { kind: 'conjunction', english: 'if' },
  nisi: { kind: 'conjunction', english: 'unless' },
  et: { kind: 'conjunction', english: 'and' },
  sed: { kind: 'conjunction', english: 'but' },
  quod: { kind: 'conjunction', english: 'because' },
  quia: { kind: 'conjunction', english: 'because' },
  ubi: { kind: 'conjunction', english: 'when' },
  cum: { kind: 'conjunction', english: 'when' },
  ita: { kind: 'adverb', english: 'so' },
  sic: { kind: 'adverb', english: 'thus' },
  valde: { kind: 'adverb', english: 'very' },
  iam: { kind: 'adverb', english: 'now' },
  nunc: { kind: 'adverb', english: 'now' },
  tum: { kind: 'adverb', english: 'then' },
  semper: { kind: 'adverb', english: 'always' },
  numquam: { kind: 'adverb', english: 'never' },
  saepe: { kind: 'adverb', english: 'often' },
  statim: { kind: 'adverb', english: 'at once' },
  subito: { kind: 'adverb', english: 'suddenly' },
  tandem: { kind: 'adverb', english: 'at last' },
  mox: { kind: 'adverb', english: 'soon' },
  hodie: { kind: 'adverb', english: 'today' },
  heri: { kind: 'adverb', english: 'yesterday' },
  tamen: { kind: 'adverb', english: 'however' },
  itaque: { kind: 'adverb', english: 'and so' },
  igitur: { kind: 'adverb', english: 'therefore' },
};

/**
 * English subject pronouns, and the ending they call for.
 *
 * They translate to nothing at all, which is the point: Latin puts the person
 * in the verb and writes *ego* only for emphasis. So "I work" is *laboro*, one
 * word — and before this it failed outright for want of a Latin word for "I".
 */
const SUBJECT_PRONOUNS = {
  i: { person: '1st', number: 'singular' },
  we: { person: '1st', number: 'plural' },
  you: { person: '2nd', number: 'singular' },
  he: { person: '3rd', number: 'singular' },
  she: { person: '3rd', number: 'singular' },
  it: { person: '3rd', number: 'singular' },
  they: { person: '3rd', number: 'plural' },
};

/** Object pronouns, which Latin does write out. */
const OBJECT_PRONOUNS = {
  me: 'me', us: 'nos', him: 'eum', her: 'eam', them: 'eos', it: 'id',
};

/** The person and number a Latin verb takes, as `conjugate` names its cells. */
const PERSON_CELL = {
  '1st': { singular: 's1', plural: 'p1' },
  '2nd': { singular: 's2', plural: 'p2' },
  '3rd': { singular: 's3', plural: 'p3' },
};

/**
 * English for a Latin pronoun, by case.
 *
 * Pronouns are what a beginner's sentence is mostly made of, and they were the
 * words this had no idea about: *id* was read as a form of *eo*, "go", because
 * Whitaker's lists that analysis first, so "ita id est" came out as "He is go
 * the he".
 */
const PRONOUN_ENGLISH = {
  ego: { nominative: 'I', accusative: 'me', genitive: 'my', dative: 'to me', ablative: 'by me' },
  tu: { nominative: 'you', accusative: 'you', genitive: 'your', dative: 'to you', ablative: 'by you' },
  nos: { nominative: 'we', accusative: 'us', genitive: 'our', dative: 'to us', ablative: 'by us' },
  vos: { nominative: 'you', accusative: 'you', genitive: 'your', dative: 'to you', ablative: 'by you' },
};

/** *is, ea, id* — one word for he, she and it, told apart by gender. */
const IS_ENGLISH = {
  masculine: { nominative: 'he', accusative: 'him', genitive: 'his', dative: 'to him', ablative: 'by him' },
  feminine: { nominative: 'she', accusative: 'her', genitive: 'her', dative: 'to her', ablative: 'by her' },
  neuter: { nominative: 'it', accusative: 'it', genitive: 'its', dative: 'to it', ablative: 'by it' },
  plural: { nominative: 'they', accusative: 'them', genitive: 'their', dative: 'to them', ablative: 'by them' },
};

function pronounEnglish(lemma, inflection) {
  const wanted = inflection.case;
  const table = PRONOUN_ENGLISH[lemma];
  if (table) return table[wanted] ?? table.nominative;

  if (['is', 'idem', 'ille', 'hic', 'iste'].includes(lemma)) {
    const gender = inflection.number === 'plural' ? 'plural' : (inflection.gender || 'masculine');
    return (IS_ENGLISH[gender] ?? IS_ENGLISH.masculine)[wanted] ?? 'it';
  }
  return null;
}

/**
 * Which part of speech to believe when a form has several readings.
 *
 * Closed classes first: the language has a few dozen pronouns and adverbs and
 * thousands of verbs, so a form that could be either is almost always the
 * pronoun. Except at the end of a clause, where Latin puts its verb.
 */
/**
 * How common Whitaker's says a word is, as a number to sort by.
 *
 * This is the field that settles the collisions nothing else can. *sum* is
 * listed after *sumo*, so "laetus sum" was read as "take, happy!" — an
 * imperative from a verb meaning "pick up" — and the copula never got a look
 * in. A reader disambiguates by knowing which word is common; so does this.
 */
const FREQUENCY_RANK = {
  'very frequent': 0, frequent: 1, common: 2, uncommon: 3, rare: 4,
  'very rare': 5, inscription: 6, graffiti: 7,
};

function frequencyRank(analysis) {
  return FREQUENCY_RANK[String(analysis?.frequency ?? '').toLowerCase()] ?? 3;
}

/**
 * How out-of-the-way a form is, as a number to sort by.
 *
 * A word is far likelier to be a plain present indicative active than a
 * pluperfect passive subjunctive, and likelier to be a nominative singular than
 * a vocative plural. Whitaker's lists every reading a form *could* have, with
 * no view about which one a sentence probably means; this supplies the view.
 */
function complexityRank(inflection) {
  const mood = { indicative: 0, imperative: 1, subjunctive: 2, infinitive: 3, participle: 3 };
  const voice = { active: 0, passive: 2 };
  const tense = { present: 0, imperfect: 1, perfect: 1, future: 2, pluperfect: 3, futureperfect: 4 };
  const grammaticalCase = {
    nominative: 0, accusative: 0, genitive: 1, dative: 1, ablative: 1, vocative: 3, locative: 4,
  };

  return (mood[inflection.mood] ?? 1)
    + (voice[inflection.voice] ?? 0)
    + (tense[String(inflection.tense).toLowerCase()] ?? 1)
    + (grammaticalCase[inflection.case] ?? 0)
    + (inflection.number === 'plural' ? 0.5 : 0);
}

function rankPos(pos, last) {
  const order = last
    ? ['verb', 'pronoun', 'adverb', 'noun', 'adjective']
    : ['pronoun', 'adverb', 'noun', 'adjective', 'verb'];
  const at = order.indexOf(pos);
  return at === -1 ? order.length : at;
}

/** The pronoun a Latin verb implies when its subject is not written out. */
const IMPLIED_SUBJECT = {
  '1st': { singular: 'I', plural: 'we' },
  '2nd': { singular: 'you', plural: 'you' },
  '3rd': { singular: 'he', plural: 'they' },
};

/** English verbs whose third person singular is not the stem plus -s. */
const IRREGULAR_THIRD = { have: 'has', be: 'is', do: 'does', go: 'goes' };
const STEM_OF_THIRD = { has: 'have', is: 'be', does: 'do', goes: 'go' };

/** Irregular English past tenses the site is likely to meet. */
const ENGLISH_PAST = {
  be: 'was', is: 'was', have: 'had', go: 'went', see: 'saw', give: 'gave', take: 'took',
  make: 'made', come: 'came', run: 'ran', say: 'said', tell: 'told', write: 'wrote',
  read: 'read', eat: 'ate', drink: 'drank', sit: 'sat', stand: 'stood', sleep: 'slept',
  lead: 'led', send: 'sent', hear: 'heard', hold: 'held', build: 'built', buy: 'bought',
  bring: 'brought', catch: 'caught', teach: 'taught', think: 'thought', find: 'found',
};

const tokenise = (text) => String(text ?? '').match(/[\p{L}\p{M}']+|[.,;:!?]/gu) ?? [];
const isWord = (token) => /^[\p{L}\p{M}']+$/u.test(token);

function fail(message) {
  const error = new Error(message);
  error.latinFallback = true;
  throw error;
}

/* ------------------------------------------------------------------ English */

export function pluralise(noun) {
  if (/(?:[sxz]|ch|sh)$/.test(noun)) return `${noun}es`;
  if (/[^aeiou]y$/.test(noun)) return `${noun.slice(0, -1)}ies`;
  return `${noun}s`;
}

export function thirdPerson(verb) {
  if (IRREGULAR_THIRD[verb]) return IRREGULAR_THIRD[verb];
  if (/(?:[sxz]|ch|sh|o)$/.test(verb)) return `${verb}es`;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ies`;
  return `${verb}s`;
}

export function pastOf(verb) {
  if (ENGLISH_PAST[verb]) return ENGLISH_PAST[verb];
  if (/e$/.test(verb)) return `${verb}d`;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ied`;
  return `${verb}ed`;
}

/** The first usable sense of a gloss: "girl, (female) child/daughter" → "girl". */
export function firstSense(definition) {
  const clean = String(definition ?? '').replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const first = clean.split(/[;,/]/)[0]?.trim();
  return first || null;
}

/**
 * The English for a Latin word: the course's own gloss where there is one,
 * because a class taught "works" should be told "works" and not "labour, toil".
 */
function glossFor(surface, analysis) {
  const gloss = courseGloss(surface)
    ?? courseGloss(analysis?.lemma)
    ?? latinGlossOf(surface)
    ?? latinGlossOf(analysis?.lemma)
    ?? analysis?.definition;
  // Trimmed even when it came from the course list: those carry alternatives
  // too — *villa* is glossed "house, villa" — and a translation wants one word.
  return firstSense(gloss);
}

/** A verb gloss reduced to its bare stem: "works" → "work", "to praise" → "praise". */
export function verbStem(gloss) {
  /**
   * "to praise", "I defend", "praises" — three ways a gloss can be written and
   * all three have to come back as the bare stem.
   *
   * The Cambridge lists give the first person for the verbs Books II and III
   * teach in it: *defendo* is glossed "I defend". Left in, that produced "The
   * soldier I defends the city".
   */
  let stem = String(gloss ?? '').replace(/^(?:to|i)\s+/i, '').trim();
  if (STEM_OF_THIRD[stem]) return STEM_OF_THIRD[stem];
  if (/ies$/.test(stem)) stem = `${stem.slice(0, -3)}y`;
  else if (/(?:[sxz]|ch|sh|o)es$/.test(stem)) stem = stem.slice(0, -2);
  else if (/s$/.test(stem) && !/(?:ss|us|is)$/.test(stem)) stem = stem.slice(0, -1);
  return stem;
}

/**
 * English for a Latin subjunctive.
 *
 * English gave up most of its subjunctive, so this is what is left of it: the
 * modals. A present subjunctive is "may", an imperfect "might" — and after
 * *utinam* the whole thing becomes a wish, which is the one place English still
 * inflects for it: "I wish I **were** dead".
 */
function subjunctiveVerb(stem, { tense, number, person }, wish, conditional = false) {
  const singular = number !== 'plural';

  // "si puer laudaret" is "if the boy were to praise", not "if the boy might".
  if (conditional) {
    if (stem === 'be') return 'were';
    return tense === 'imperfect' ? `were to ${stem}` : `should ${stem}`;
  }

  if (wish) {
    if (stem === 'be') return singular ? 'were' : 'were';
    if (tense === 'present') return `would ${stem}`;
    if (tense === 'pluperfect' || tense === 'perfect') return `had ${pastOf(stem)}`;
    return `were ${stem.replace(/e$/, '')}ing`;
  }

  switch (tense) {
    case 'imperfect':
      return `might ${stem}`;
    case 'perfect':
      return `may have ${pastOf(stem)}`;
    case 'pluperfect':
      return `would have ${pastOf(stem)}`;
    default:
      return `may ${stem}`;
  }
}

/** Put an English verb into the tense and number the Latin was in. */
export function englishVerb(stem, { tense, number, person }) {
  const singular = number !== 'plural';
  const third = person === '3rd';

  switch (tense) {
    case 'imperfect':
      return `${singular ? 'was' : 'were'} ${stem === 'be' ? 'being' : `${stem.replace(/e$/, '')}ing`}`;
    case 'perfect':
    case 'aorist':
      return pastOf(stem);
    case 'pluperfect':
      return `had ${pastOf(stem)}`;
    case 'future':
      return `will ${stem}`;
    default:
      if (stem === 'be') return singular ? (third ? 'is' : 'am') : 'are';
      return third && singular ? thirdPerson(stem) : stem;
  }
}

/* --------------------------------------------------------- Latin → English */

/** Every reading of a word, flattened to one entry per possible inflection. */
/**
 * The personal pronouns, supplied here because Whitaker's does not parse them.
 *
 * `analyse('ego')` returns nothing at all, so "ego laboro" was refused as
 * unknown Latin — the first person singular pronoun, in a beginner's sentence.
 */
const BARE_PRONOUNS = {
  ego: { lemma: 'ego', case: 'nominative', number: 'singular' },
  me: { lemma: 'ego', case: 'accusative', number: 'singular' },
  mihi: { lemma: 'ego', case: 'dative', number: 'singular' },
  tu: { lemma: 'tu', case: 'nominative', number: 'singular' },
  te: { lemma: 'tu', case: 'accusative', number: 'singular' },
  tibi: { lemma: 'tu', case: 'dative', number: 'singular' },
  nos: { lemma: 'nos', case: 'nominative', number: 'plural' },
  vos: { lemma: 'vos', case: 'nominative', number: 'plural' },
  nobis: { lemma: 'nos', case: 'dative', number: 'plural' },
  vobis: { lemma: 'vos', case: 'dative', number: 'plural' },
};

async function readingsOf(word) {
  const bare = BARE_PRONOUNS[fold(word)];
  if (bare) {
    return [{
      analysis: { lemma: bare.lemma, pos: 'pronoun', definition: '', principalParts: [bare.lemma] },
      inflection: { case: bare.case, number: bare.number, pos: 'pronoun' },
      surface: word,
      pos: 'pronoun',
    }];
  }

  const analyses = await analyse(word).catch(() => null);
  if (!analyses?.length) return [];

  const ranked = [...analyses].sort((one, other) => (rankPos(one.pos, false) - rankPos(other.pos, false))
    || (frequencyRank(one) - frequencyRank(other))
    || (complexityRank(one.inflections?.[0] ?? {}) - complexityRank(other.inflections?.[0] ?? {})));
  return ranked.flatMap((analysis) => (analysis.inflections ?? []).map((inflection) => ({
    // The inflection knows it is a participle where the headword only says
    // "verb", and a participle behaves like an adjective. Losing that turned
    // "utinam mortuus essem" back into "I wish the dead were".
    analysis,
    inflection,
    surface: word,
    pos: String(inflection.pos).startsWith('verb participle')
      ? inflection.pos
      : (analysis.pos || inflection.pos),
  })));
}

/** Preference order for the role a noun fills, once the obvious ones are taken. */
const CASE_ROLE = {
  nominative: 'subject',
  accusative: 'object',
  dative: 'indirect',
  genitive: 'possessive',
  ablative: 'adverbial',
  vocative: 'address',
};

export async function latinToEnglish(text) {
  const tokens = tokenise(text).filter(isWord);
  if (!tokens.length) fail('nothing to translate');
  if (tokens.length > 12) fail('too long for the rules translator');

  const parsed = await Promise.all(tokens.map(readingsOf));

  // Glosses for the words as written *and* for the dictionary forms behind
  // them: Wiktionary answers "filiam" with its morphology and "filia" with its
  // meaning, and the meaning is what a translation needs.
  await primeLatinGlosses([
    ...tokens.map(fold),
    ...parsed.flat().map((reading) => reading.analysis?.lemma).filter(Boolean),
  ]);
  if (parsed.some((readings) => !readings.length)) {
    fail(`unknown Latin: ${tokens.filter((_, i) => !parsed[i].length).join(', ')}`);
  }

  refuseWhatItCannotSee(tokens, parsed);

  // The finite verb, taken from the end: Latin puts it there, and a word that
  // could be either reads better as the verb when nothing else can be.
  /**
   * The finite verb of a clause, preferring a statement to a command and a
   * common word to a rare one.
   *
   * Order as Whitaker's returns it is not a ranking: *sum* comes after *sumo*,
   * so "laetus sum" was being built around an imperative meaning "take!".
   */
  const finiteAt = (i) => {
    const finite = parsed[i].filter((reading) => reading.pos === 'verb'
      && reading.inflection.person
      && ['indicative', 'imperative', 'subjunctive'].includes(reading.inflection.mood));
    if (!finite.length) return null;

    return [...finite].sort((one, other) => {
      const command = (reading) => (reading.inflection.mood === 'imperative' ? 1 : 0);
      return (command(one) - command(other))
        || (frequencyRank(one.analysis) - frequencyRank(other.analysis))
        || (complexityRank(one.inflection) - complexityRank(other.inflection));
    })[0];
  };

  const alsoNoun = (i) => parsed[i].some((reading) => reading.pos === 'noun');

  /**
   * The finite verb, looked for from the end, because that is where Latin puts
   * it.
   *
   * A word that is also a noun is only taken as the verb if it stands last or
   * if nothing else in the sentence can be one. *canis* is both "dog" and "you
   * sing", and "canis puellae" is a dog belonging to a girl, not a person
   * singing one.
   */
  let verb = null;
  for (let i = parsed.length - 1; i >= 0 && !verb; i -= 1) {
    const found = finiteAt(i);
    if (!found) continue;
    if (alsoNoun(i) && i !== parsed.length - 1) continue;
    verb = found;
    verb.index = i;
  }

  if (!verb) {
    for (let i = parsed.length - 1; i >= 0 && !verb; i -= 1) {
      const found = finiteAt(i);
      if (found && !alsoNoun(i)) { verb = found; verb.index = i; }
    }
  }

  /**
   * What the sentence looks like, which is what settles *puellae*.
   *
   * Genitive, dative and nominative plural are the same word, and no amount of
   * staring at it decides. The sentence around it does: a sentence with a verb
   * and an object wants "gives the money **to the girl**", while a phrase with
   * neither wants "the dog **of the girl**".
   */
  const shape = {
    /**
     * With *sum* and a first- or second-person ending, the subject is the
     * pronoun the verb already carries — so a nominative standing alone can
     * only be the complement, and has to be read as a describing word.
     *
     * *mortuus* is both "dead" and "a dead man", and a fixed order of parts of
     * speech cannot choose between them: "utinam mortuus essem" wants the
     * adjective ("I wish I were dead") and nothing about the word says so. The
     * verb does.
     */
    complementWanted: Boolean(verb)
      && verb.analysis?.lemma === 'sum'
      && ['1st', '2nd'].includes(verb.inflection.person),
    hasVerb: Boolean(verb),
    hasAccusative: parsed.some((readings, i) => i !== verb?.index
      && readings.some((reading) => reading.inflection.case === 'accusative')),
  };

  const phrases = [];
  const taken = new Set(verb ? [verb.index] : []);
  const particles = [];
  let wish = false;
  let governing = null;

  for (let i = 0; i < parsed.length; i += 1) {
    if (taken.has(i)) continue;
    const surface = fold(tokens[i]);

    // A preposition fixes the case of whatever follows it, which removes the
    // ambiguity that makes this hard everywhere else. `cum` is both preposition
    // and conjunction; standing last, with no noun to govern, it is the latter.
    if (LATIN_PREPOSITIONS[surface] && !(surface === 'cum' && i === parsed.length - 1)) {
      governing = { word: surface, cases: LATIN_PREPOSITIONS[surface] };
      taken.add(i);
      continue;
    }

    if (PARTICLES[surface]) {
      const particle = PARTICLES[surface];
      if (particle.kind === 'wish') wish = true;
      else particles.push(particle);
      taken.add(i);
      continue;
    }

    // The locative is dropped rather than ranked. It is a real case and
    // *puellae* genuinely has one, but no beginner's sentence means it — and
    // left in, it won every contest below, because a case absent from the order
    // list scored -1 and sorted first. That is how the subject of "agricolae
    // puellam laudant" silently disappeared.
    const candidates = parsed[i].filter((reading) => reading.inflection.case
      && reading.inflection.case !== 'locative');

    /**
     * A word that is recognised but fills no role is refused, never skipped.
     *
     * Skipping is how "puer laudet" became "The boy": the subjunctive was not
     * accepted as a verb, was not a noun either, and simply fell out of the
     * sentence — leaving a confident translation with its meaning removed. A
     * word this cannot place means the sentence is beyond it, and the chain
     * below should be given the chance instead.
     */
    if (!candidates.length) fail(`cannot place "${tokens[i]}"`);
    taken.add(i);

    const wanted = governing?.cases ?? null;
    const usable = wanted
      ? candidates.filter((reading) => wanted.includes(reading.inflection.case))
      : candidates;
    const chosen = pickCase(usable.length ? usable : candidates, phrases, shape);

    // A pronoun is not a noun with an article in front of it.
    const asPronoun = chosen.pos === 'pronoun'
      ? pronounEnglish(chosen.analysis.lemma, chosen.inflection)
      : null;

    const gloss = asPronoun ?? glossFor(surface, chosen.analysis);
    if (!gloss) fail(`no English for ${surface}`);

    // Pronouns take no article either, so they render like a modifier does.
    const modifier = Boolean(asPronoun) || chosen.pos === 'adjective'
      || String(chosen.pos).startsWith('verb participle');

    phrases.push({
      index: i,
      case: chosen.inflection.case,
      number: chosen.inflection.number || 'singular',
      role: governing ? 'prepositional' : CASE_ROLE[chosen.inflection.case],
      preposition: governing?.word ?? null,
      pos: chosen.pos,
      // Only nouns take an English plural. *laeta* is nominative feminine
      // singular and neuter plural at once, and pluralising the adjective gave
      // "the girl is happies".
      english: chosen.inflection.number === 'plural' && !modifier ? pluralise(gloss) : gloss,
      bare: gloss,
    });
    governing = null;
  }

  if (!verb && !phrases.length) fail('nothing recognisable');

  // Nothing may go missing between the parse and the sentence.
  for (let i = 0; i < parsed.length; i += 1) {
    if (!taken.has(i)) fail(`cannot place "${tokens[i]}"`);
  }

  return assembleEnglish(verb, phrases, { wish, particles });
}

/**
 * The three constructions this cannot parse, refused by name.
 *
 * Refusing matters more than it sounds. Every word of "urbe capta milites
 * redierunt" is placeable — an ablative here, a participle there — so the guard
 * against dropping words was satisfied and the sentence came out as "Take
 * returned the soldiers to the city", confidently and completely wrong. A
 * construction the rules do not model has to be recognised as such, not merely
 * survived.
 */
function refuseWhatItCannotSee(tokens, parsed) {
  const RELATIVES = new Set(['qui', 'quae', 'quod', 'quem', 'quam', 'quos', 'quas',
    'cuius', 'cui', 'quo', 'qua', 'quibus', 'quorum', 'quarum']);

  for (const token of tokens) {
    if (RELATIVES.has(fold(token))) fail('a relative clause is beyond the rules translator');
  }

  // An infinitive with an accusative beside it is indirect statement: "he says
  // that the farmer works" is *agricolam laborare*, and read as a plain
  // sentence it becomes nonsense about a farmer being worked.
  // Only a form actually marked infinitive. Testing for "a verb with a tense
  // and no person" also caught participles and gerunds, and refused "ita id
  // est" as indirect statement.
  const hasInfinitive = parsed.some((readings) => readings.some((reading) => reading.inflection.mood === 'infinitive'));
  const hasAccusative = parsed.some((readings) => readings.some((reading) => reading.inflection.case === 'accusative'));
  if (hasInfinitive && hasAccusative) fail('indirect statement is beyond the rules translator');

  /**
   * An ablative absolute: a noun and a participle, both ablative, agreeing, and
   * with no preposition in front of them to explain why.
   */
  for (let i = 0; i < parsed.length - 1; i += 1) {
    if (LATIN_PREPOSITIONS[fold(tokens[i])]) continue;
    const noun = parsed[i].find((reading) => reading.pos === 'noun' && reading.inflection.case === 'ablative');
    if (!noun) continue;

    const participle = parsed[i + 1].some((reading) => String(reading.pos).startsWith('verb participle')
      && reading.inflection.case === 'ablative'
      && reading.inflection.number === noun.inflection.number);
    if (participle) fail('an ablative absolute is beyond the rules translator');
  }
}

/**
 * Which reading of an ambiguous form to believe.
 *
 * *puellae* is genitive, dative and nominative plural at once, and the sentence
 * decides. Preference goes to the role nothing has filled yet, in the order the
 * cases are actually used, so the first noun of a verbless phrase becomes the
 * subject and a second one becomes its genitive.
 */
function pickCase(candidates, phrases, shape = {}) {
  // See `complementWanted`: a describing reading beats a naming one here.
  if (shape.complementWanted) {
    const describing = candidates.filter((reading) => reading.pos === 'adjective'
      || String(reading.pos).startsWith('verb participle'));
    if (describing.length) return describing[0];
  }
  /**
   * An adjective agrees with its noun, and that is the answer before any
   * preference is consulted.
   *
   * *laeti* is nominative plural and genitive singular; in "pueri laeti sunt"
   * it plainly goes with *pueri*. Without this the nominative role was already
   * taken, the free-role preference chose the genitive, and the sentence came
   * out as "The boys of happy are".
   */
  const agreeing = candidates.filter((reading) => {
    const modifier = reading.pos === 'adjective'
      || String(reading.pos).startsWith('verb participle');
    if (!modifier) return false;
    return phrases.some((phrase) => phrase.case === reading.inflection.case
      && phrase.number === (reading.inflection.number || 'singular'));
  });
  if (agreeing.length) return agreeing[0];

  const filled = new Set(phrases.map((phrase) => phrase.role));

  // A verb with an object in it makes an indirect object the likelier reading
  // of an ambiguous ending than a possessive; with no verb, the reverse.
  const order = shape.hasVerb && shape.hasAccusative
    ? ['nominative', 'accusative', 'dative', 'genitive', 'ablative', 'vocative']
    : ['nominative', 'accusative', 'genitive', 'dative', 'ablative', 'vocative'];

  const rank = (reading) => {
    const at = order.indexOf(reading.inflection.case);
    return at === -1 ? order.length : at;
  };

  const ranked = [...candidates].sort((a, b) => {
    const freeA = filled.has(CASE_ROLE[a.inflection.case]) ? 1 : 0;
    const freeB = filled.has(CASE_ROLE[b.inflection.case]) ? 1 : 0;
    if (freeA !== freeB) return freeA - freeB;
    // Part of speech before frequency. *amicus* is "friendly" more often than
    // "friend" by Whitaker's count, but "cum amico" is a person, not a quality,
    // and letting frequency win rendered it "with friend" — an adjective, so no
    // article, so not English either.
    // Part of speech before case. *mensa* is a table in the ablative and also
    // the participle of *metior* in the accusative plural; "in" governs both
    // cases, so ranking the case first chose the participle and rendered "in
    // table" — a measured thing, with no article, in no language.
    return (rankPos(a.pos, false) - rankPos(b.pos, false))
      || (rank(a) - rank(b))
      || (frequencyRank(a.analysis) - frequencyRank(b.analysis))
      || (complexityRank(a.inflection) - complexityRank(b.inflection));
  });
  return ranked[0];
}

/** Adjectives and participles describe; they do not take an article. */
function isModifier(phrase) {
  return phrase.pos === 'adjective' || phrase.pos === 'pronoun'
    || String(phrase.pos).startsWith('verb participle');
}

function noun(phrase, attached = null) {
  const describing = attached?.get(phrase)?.join(' ');
  if (isModifier(phrase)) return phrase.english;
  return `the ${[describing, phrase.english].filter(Boolean).join(' ')}`;
}

function assembleEnglish(verb, phrases, { wish = false, particles = [] } = {}) {
  /**
   * *sum* takes a complement, not an object.
   *
   * "utinam mortuus essem" is "I wish I were dead" — *mortuus* is nominative,
   * but it describes the subject rather than being it, and read as a subject it
   * gave "I wish the dead were". So with a copula, a nominative that describes
   * (an adjective, or a participle like *mortuus*) becomes the complement; and
   * where two nouns are both nominative, the second one is.
   */
  const copula = verb?.analysis?.lemma === 'sum';
  const nominatives = phrases.filter((phrase) => phrase.role === 'subject');

  let complement = null;
  if (copula && nominatives.length) {
    complement = nominatives.find(isModifier)
      ?? (nominatives.length > 1 ? nominatives[nominatives.length - 1] : null);
  }

  /**
   * An adjective goes in front of its noun in English, and must not be left to
   * stand as a phrase of its own: "puer bonus agricolam laudat" rendered the
   * boy and the farmer and quietly lost *bonus*.
   */
  const attached = new Map();
  const modifiers = new Set();
  for (const phrase of phrases) {
    if (!isModifier(phrase) || phrase === complement) continue;
    const host = phrases.find((other) => other !== phrase && !isModifier(other)
      && other.case === phrase.case && other.number === phrase.number);
    if (!host) continue;
    if (!attached.has(host)) attached.set(host, []);
    attached.get(host).push(phrase.bare);
    modifiers.add(phrase);
  }

  const subject = phrases.find((phrase) => phrase.role === 'subject'
    && phrase !== complement && !modifiers.has(phrase));
  const object = phrases.find((phrase) => phrase.role === 'object');
  const indirect = phrases.find((phrase) => phrase.role === 'indirect');
  const possessives = phrases.filter((phrase) => phrase.role === 'possessive');
  const adverbials = phrases.filter((phrase) => phrase.role === 'adverbial');
  const prepositional = phrases.filter((phrase) => phrase.role === 'prepositional');

  // A genitive belongs to whatever it follows, which in Latin is the word
  // before it: "canis puellae" is the dog *of the girl*.
  const owned = new Map();
  for (const possessive of possessives) {
    const host = phrases[phrases.indexOf(possessive) - 1];
    if (host) owned.set(host, `of ${noun(possessive, attached)}`);
  }

  const used = new Set(modifiers);
  const render = (phrase) => {
    if (!phrase) return null;
    used.add(phrase);
    const genitive = owned.get(phrase);
    if (genitive) used.add(possessives.find((one) => `of ${noun(one, attached)}` === genitive));
    return [noun(phrase, attached), genitive].filter(Boolean).join(' ');
  };

  const words = [];
  for (const particle of particles.filter((one) => one.kind === 'conjunction')) {
    words.push(particle.english);
  }
  if (wish) words.push('I wish');

  /**
   * Latin leaves the subject out whenever the ending says it, and English
   * cannot. Without this "laboro" translated as "work" rather than "I work",
   * and every first- and second-person sentence lost its subject.
   */
  if (subject) words.push(render(subject));
  else if (verb?.inflection.person) {
    words.push(IMPLIED_SUBJECT[verb.inflection.person]?.[verb.inflection.number || 'singular'] ?? 'he');
  }

  if (verb) {
    const gloss = glossFor(verb.surface, verb.analysis);
    if (!gloss) fail(`no English for ${verb.surface}`);
    const stem = verbStem(gloss);
    const negative = particles.some((one) => one.kind === 'negative');

    const conditional = particles.some((one) => ['if', 'unless'].includes(one.english));

    const built = verb.inflection.mood === 'subjunctive'
      ? subjunctiveVerb(stem, verb.inflection, wish, conditional)
      : englishVerb(stem, verb.inflection);

    words.push(negative ? notted(built) : built);
  }

  if (complement) words.push(render(complement));
  if (object) words.push(render(object));
  if (indirect) words.push(`to ${render(indirect)}`);
  for (const phrase of adverbials) words.push(`with ${render(phrase)}`);
  for (const phrase of prepositional) {
    words.push(`${PREPOSITION_ENGLISH[phrase.preposition] ?? phrase.preposition} ${render(phrase)}`);
  }

  // A genitive with nothing before it to own — a bare "puellae" — still has to
  // be said, or the word silently disappears from the translation.
  for (const possessive of possessives) {
    if (![...owned.values()].includes(`of ${noun(possessive)}`)) words.push(`of ${noun(possessive)}`);
  }

  for (const particle of particles.filter((one) => one.kind === 'adverb')) {
    words.unshift(particle.english);
  }

  // Every parsed word reached the sentence, or the sentence is not a
  // translation of it. This is the same rule as the one upstream, applied to
  // the assembly rather than the parse.
  for (const phrase of phrases) {
    if (!used.has(phrase) && phrase !== complement) fail(`left out "${phrase.bare}"`);
  }

  const sentence = words.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!sentence) fail('nothing to say');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** Put an English verb phrase into the negative, wherever its auxiliary is. */
export function notted(phrase) {
  const [first, ...rest] = phrase.split(' ');
  if (rest.length) return [first, 'not', ...rest].join(' ');
  if (['is', 'are', 'was', 'were'].includes(first)) return `${first} not`;
  return `does not ${first.replace(/e?s$/, '')}`;
}

/* --------------------------------------------------------- English → Latin */

/**
 * An adjective in one case, number and gender.
 *
 * Adjectives do not decline like nouns and cannot be built with `formOf`, which
 * wants a nominative and a genitive: *laetus, laeta, laetum* is three genders,
 * not two principal parts, and asking formOf for it simply failed.
 */
function adjectiveForm(parts, gender, wantedCase, number) {
  const built = declineAdjective(adjectiveCitation(parts));
  return built?.table?.[gender || 'masculine']?.[number]?.[wantedCase] ?? null;
}

/**
 * Whitaker's adjective parts, expanded into a citation the decliner can read.
 *
 * They arrive compressed, the way a paper dictionary prints them:
 * `["laetus", "laeta -um", "laetior -or -us", …]` — comparative and superlative
 * included, and the neuter written as a bare ending. Handed over as they stand
 * they produced *laetaes*, which is not a word in any language.
 */
export function adjectiveCitation(principalParts) {
  const pieces = principalParts.slice(0, 2).join(' ').split(/[,\s]+/).filter(Boolean);
  if (!pieces.length) return '';

  const head = pieces[0];
  const stem = head.replace(/(?:us|er|is|e|s)$/, '');

  const expanded = pieces.map((piece) => (piece.startsWith('-') ? stem + piece.slice(1) : piece));
  return [...new Set(expanded)].slice(0, 3).join(', ');
}

/**
 * *sum* is written out rather than looked up.
 *
 * Its principal parts are irregular and its lemma collides: asking the lexicon
 * for "be" and analysing what came back landed on *sumo*, "I take", so "the boy
 * is good" was rendered *puer bonus sumit* — the boy takes goodly.
 */
const SUM = 'sum, esse, fui, futurus';

/**
 * An adjective, or something that behaves like one.
 *
 * *mortuus* is the participle of *morior* and Whitaker's files it as a verb, so
 * asking for an adjective found nothing and "I wish I were dead" had no word
 * for "dead". A participle in *-us* declines exactly as a first-and-second
 * declension adjective does, so where the dictionary offers no adjective and
 * the word has that shape, its citation is built from the word itself.
 */
async function adjectiveLike(english) {
  const direct = await latinWord(english, 'adjective');
  if (direct) return { citation: adjectiveCitation(direct.analysis.principalParts), surface: direct.surface };

  for (const candidate of await latinCandidates(english)) {
    if (!/(?:us|a|um)$/.test(candidate)) continue;
    const stem = candidate.replace(/(?:us|a|um)$/, '');
    if (!stem) continue;
    return { citation: `${stem}us, ${stem}a, ${stem}um`, surface: candidate };
  }
  return null;
}

/** Decline whichever of the two shapes `adjectiveLike` handed back. */
function declineLike(adjective, gender, wantedCase, number) {
  const built = declineAdjective(adjective.citation);
  return built?.table?.[gender || 'masculine']?.[number]?.[wantedCase] ?? null;
}

/** Find the Latin word for an English one, of the part of speech wanted. */
async function latinWord(english, wantedPos) {
  if (!english) return null;
  for (const candidate of await latinCandidates(english)) {
    const analyses = await analyse(candidate).catch(() => null);
    if (!analyses?.length) continue;

    const match = analyses.find((analysis) => analysis.pos === wantedPos) ?? null;
    if (!match) continue;

    // Whitaker's genitive is not always one a decliner can work back from; see
    // latinNounParts. Where Wiktionary states the declension, it wins.
    if (wantedPos === 'noun') {
      const stated = await latinNounParts(match.lemma ?? candidate);
      if (stated) {
        return {
          analysis: { ...match, principalParts: [stated.nominative, stated.genitive] },
          surface: candidate,
        };
      }
    }

    return { analysis: match, surface: candidate };
  }
  return null;
}

/** Whether an English token is a plural whose singular the lexicon knows. */
function looksPlural(english) {
  if (!/s$/.test(english) || /ss$/.test(english)) return false;
  return singularsOf(english).some((singular) => latinFor(singular).length > 0);
}

/**
 * The English words that start a subordinate clause, and what Latin does with
 * each one.
 *
 * `subjunctive` is the mood the clause takes regardless; `unreal` marks the
 * ones whose mood depends on whether the clause is about something that did
 * not happen — "if the boy praises" is indicative, "if the boy were praising"
 * is not.
 */
const CLAUSE_MARKERS = [
  { english: /^i wish\b/, lead: 'utinam', subjunctive: true, unreal: true },
  { english: /^if only\b/, lead: 'utinam', subjunctive: true, unreal: true },
  { english: /^(?:so that|in order that|in order to)\b/, lead: 'ut', subjunctive: true },
  { english: /^(?:lest|so that not)\b/, lead: 'ne', subjunctive: true },
  { english: /^(?:although|though)\b/, lead: 'quamquam' },
  { english: /^unless\b/, lead: 'nisi', unreal: true },
  { english: /^if\b/, lead: 'si', unreal: true },
  { english: /^(?:when|whenever)\b/, lead: 'ubi' },
  { english: /^while\b/, lead: 'dum' },
  { english: /^(?:because|since)\b/, lead: 'quod' },
  { english: /^and\b/, lead: 'et' },
  { english: /^but\b/, lead: 'sed' },
];

/**
 * Tags that add emphasis and no content: "…, I really do".
 *
 * English says these with a whole clause and Latin with one adverb, so they are
 * recognised rather than pushed through a clause builder that would rightly
 * refuse them for having no verb of their own.
 */
const EMPHATIC_TAGS = {
  'i really do': 'vere', 'i really am': 'vere', 'i do': 'vere',
  'i really did': 'vere', really: 'vere', indeed: 'vere', truly: 'vere',
};

/**
 * Cut an English sentence into clauses at the words that mark them.
 *
 * @returns {Array<{lead: string|null, subjunctive: boolean, unreal: boolean, text: string}>}
 */
export function splitEnglishClauses(text) {
  const clean = String(text ?? '').toLowerCase().replace(/[.!?]+\s*$/, '').trim();
  if (!clean) return [];

  const clauses = [];
  let rest = clean;
  let pending = { lead: null, subjunctive: false, unreal: false };

  while (rest) {
    // The earliest marker that is not at position zero ends the current clause;
    // one at position zero opens it.
    let cutAt = -1;
    let found = null;

    for (let i = 0; i < rest.length; i += 1) {
      if (i > 0 && !/\s|,/.test(rest[i - 1])) continue;
      const tail = rest.slice(i);
      const marker = CLAUSE_MARKERS.find((one) => one.english.test(tail));
      if (!marker) continue;
      if (i === 0) {
        pending = {
          lead: marker.lead,
          subjunctive: Boolean(marker.subjunctive),
          unreal: Boolean(marker.unreal),
        };
        rest = tail.replace(marker.english, '').trim();
        i = -1;
        continue;
      }
      cutAt = i;
      found = marker;
      break;
    }

    // A comma ends a clause too, and the one after it is a main clause unless
    // it opens with a marker of its own — "if the boy praises, the farmer
    // works" is two clauses and only the first is conditional.
    const comma = rest.indexOf(',');
    if (comma !== -1 && (cutAt === -1 || comma < cutAt)) {
      cutAt = comma;
      found = null;
    }

    const head = (cutAt === -1 ? rest : rest.slice(0, cutAt)).replace(/[,;]\s*$/, '').trim();
    if (head) clauses.push({ ...pending, text: head });

    if (cutAt === -1) break;
    pending = {
      lead: found?.lead ?? null,
      subjunctive: Boolean(found?.subjunctive),
      unreal: Boolean(found?.unreal),
    };
    rest = found
      ? rest.slice(cutAt).replace(found.english, '').trim()
      : rest.slice(cutAt + 1).trim();
  }

  return clauses;
}

/**
 * English to Latin, clause by clause.
 *
 * Each clause is built on its own, in the mood its marker calls for, and they
 * are joined in the order English gave them — which is the order Latin wants
 * too for the shapes here: the *si* clause before its main clause, the *quod*
 * clause after the statement it explains.
 */
export async function englishToLatin(text) {
  // An idiom before a rule: a rule applied to an idiom is confident nonsense.
  const idiomatic = latinIdiom(text);
  if (idiomatic) return idiomatic;

  const clauses = splitEnglishClauses(text);
  if (!clauses.length) fail('nothing to translate');
  if (clauses.length > 3) fail('too many clauses for the rules translator');

  const built = [];
  for (const clause of clauses) {
    const tag = EMPHATIC_TAGS[clause.text];
    if (tag) { built.push(tag); continue; }

    const tokens = tokenise(clause.text).filter(isWord).map(fold);
    built.push(await buildClause(tokens, {
      subjunctive: clause.subjunctive,
      unreal: clause.unreal,
      lead: clause.lead,
    }));
  }

  const sentence = built.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!sentence) fail('nothing to say');
  return sentence;
}

/**
 * One clause, in the mood and tense the sentence around it calls for.
 *
 * This was the whole of `englishToLatin` until clauses arrived. It still does
 * all the work; what changed is that it is told which mood to build in, so a
 * subordinate clause can come out subjunctive.
 */
async function buildClause(tokens, { subjunctive = false, unreal = false, lead = null } = {}) {
  if (!tokens.length) fail('nothing to translate');
  if (tokens.length > 14) fail('too long for the rules translator');

  // Tense markers are little words in English and endings in Latin, so they are
  // read off and removed before anything else is looked at.
  let tense = 'praesens';
  let past = false;
  const content = [];

  /**
   * Which content words stood straight after "the" or "a".
   *
   * English hides its parts of speech, but not entirely: a word following an
   * article is a noun, and that one fact settles the case that breaks this
   * otherwise. *dog* is `canis`, which Whitaker's reads as both "dog" and "you
   * sing", so "the dog of the girl" was being built around a verb and came out
   * as *puellae canit*.
   */
  const determined = new Set();
  let article = false;
  let negated = false;
  let copula = false;
  let subjectPerson = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (ARTICLES.has(token)) { article = true; continue; }

    // A pronoun subject is not a word in Latin, it is an ending. Read off and
    // dropped — "I work" is one word, laboro.
    if (SUBJECT_PRONOUNS[token] && !OBJECT_PRONOUNS[token]) {
      subjectPerson = SUBJECT_PRONOUNS[token];
      article = false;
      continue;
    }

    // "does not work" is non laborat: the auxiliary carries nothing Latin needs
    // and the negative is a word of its own, placed before the verb.
    if (['not', 'never', 'nt'].includes(token)) { negated = true; continue; }
    if (['do', 'does', 'did'].includes(token)) {
      if (token === 'did') tense = 'perfectum';
      continue;
    }

    if (article) { determined.add(content.length); article = false; }
    if (token === 'will') { tense = 'futurum'; continue; }
    if (['was', 'were'].includes(token)) {
      past = true;
      // "was working" is imperfect; "was happy" is the copula in the past.
      if (/ing$/.test(tokens[i + 1] ?? '')) tense = 'imperfectum';
      else { copula = true; tense = 'imperfectum'; }
      continue;
    }
    /**
     * "has" is an auxiliary only when a past participle follows it.
     *
     * "the master has the house" is *dominus villam habet* — a sentence about
     * owning, not a perfect tense — and swallowing "has" as a tense marker left
     * the clause with no verb at all, so it came out as "domina villa".
     */
    if (['has', 'have', 'had'].includes(token)) {
      const next = tokens[i + 1] ?? '';
      if (/ed$/.test(next) || Object.values(ENGLISH_PAST).includes(next)) {
        tense = 'perfectum';
        past = true;
        continue;
      }
    }
    if (['is', 'are', 'am', 'be'].includes(token)) {
      // "is working" is a tense; "is happy" is *sum* with a complement.
      if (!/ing$/.test(tokens[i + 1] ?? '')) copula = true;
      continue;
    }
    content.push(token);
  }
  if (!content.length && !copula) fail('nothing to translate');

  // The verb, and everything else hangs off where it is.
  let verbAt = -1;
  let verb = null;

  if (copula) {
    verb = { surface: 'sum', analysis: { principalParts: SUM.split(', ') } };
    verbAt = content.length;   // the complement is everything before it
  }

  for (let i = 0; i < content.length && !verb; i += 1) {
    if (ENGLISH_PREPOSITIONS[content[i]]) continue;
    if (determined.has(i)) continue;

    for (const guess of verbCandidates(content[i])) {
      const found = await latinWord(guess, 'verb');
      if (found) { verb = found; verbAt = i; break; }
    }
    if (verb && isPastForm(content[i])) tense = 'perfectum';
  }

  // With a verb, everything before it is the subject and everything after it
  // hangs off the prepositions. With no verb — "the dog of the girl" — the
  // first preposition does the same job, and without this the phrase reached
  // the noun builder with "of" still inside it and failed for want of a Latin
  // word for it.
  const boundary = verbAt === -1
    ? content.findIndex((token) => ENGLISH_PREPOSITIONS[token])
    : verbAt;

  const before = copula
    ? content.slice(0, subjectPerson ? 0 : Math.max(0, content.length - 1))
    : content.slice(0, boundary === -1 ? content.length : boundary);

  const after = copula
    ? content.slice(subjectPerson ? 0 : Math.max(0, content.length - 1))
    : (boundary === -1 ? [] : content.slice(verbAt === -1 ? boundary : boundary + 1));

  /**
   * With *sum* the words after "is" describe the subject, so they go into the
   * nominative and not the accusative: "the boy is good" is *puer bonus est*,
   * never *puer bonum est*. The subject's gender is what they agree with, which
   * is why the complement is built after it rather than beside it.
   */
  const subject = before.length ? await nounPhrase(before, 'nominative') : null;
  const rest = copula
    ? []
    : await taggedPhrases(after);

  /**
   * What the complement has to agree with. An explicit subject gives its gender
   * and number; a pronoun subject gives only number, since "I am happy" says
   * nothing about who is speaking — masculine is the conventional default.
   */
  const agreement = subject
    ? { gender: subject.gender, number: subject.number }
    : { gender: 'masculine', number: subjectPerson?.number ?? 'singular' };

  const complement = copula && after.length
    ? await nounPhrase(after, 'nominative', null, agreement)
    : null;

  if (!verb && !subject && !rest.length) fail('nothing recognisable');

  const pieces = [];
  if (subject) pieces.push(...subject.words);
  if (complement) pieces.push(...complement.words);
  for (const phrase of rest) pieces.push(...phrase.words);

  if (verb) {
    const table = conjugate(verb.analysis.principalParts.join(', '))?.table;

    // The ending carries the person, whether it came from a pronoun that is not
    // written or from the number of a subject that is.
    const person = subjectPerson?.person ?? '3rd';
    const number = subjectPerson?.number ?? (subject?.number ?? 'singular');
    const cell = PERSON_CELL[person]?.[number] ?? 's3';

    /**
     * The mood, decided here because only here is it known whether the clause
     * is about something that did not happen.
     *
     * "if the boy praises" is a plain condition and stays indicative; "I wish I
     * were dead" is a wish about what is not the case, and English marks it the
     * same way Latin does — with a past form that is not about the past. That
     * is the imperfect subjunctive: *essem*.
     */
    const useSubjunctive = subjunctive || (unreal && past);
    const mood = useSubjunctive ? 'coniunctivus' : 'indicativus';
    const wanted = useSubjunctive ? (past ? 'imperfectum' : 'praesens') : tense;

    const form = table?.[mood]?.[wanted]?.[cell];
    if (!form) fail(`cannot conjugate ${verb.surface}`);
    // `ne` is itself the negative in a subjunctive clause; `non` before it too
    // would say it twice.
    if (negated && lead !== 'ne') pieces.push('non');
    pieces.push(form);
  }

  const sentence = [lead, ...pieces].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!sentence) fail('nothing to say');
  return sentence;
}

/** English past tenses, so "praised" and "walked" reach their infinitives. */
function isPastForm(token) {
  if (Object.values(ENGLISH_PAST).includes(token)) return true;
  return /ed$/.test(token) && token.length > 3;
}

/**
 * The forms an English verb might be hiding behind.
 *
 * More than one, because "praised" is *praise* with a d and *prais* with an ed,
 * and only the lexicon knows which. Returning a single guess meant "the boy
 * praised the farmer" failed for want of a Latin word for "prais".
 */
export function verbCandidates(token) {
  const guesses = [token];
  // "has" is not "ha" with an s on it. The irregular third persons have to be
  // named, or "the master has the house" looks for a Latin verb called "ha".
  if (STEM_OF_THIRD[token]) guesses.push(STEM_OF_THIRD[token]);
  for (const [stem, past] of Object.entries(ENGLISH_PAST)) if (past === token) guesses.push(stem);
  if (/ied$/.test(token)) guesses.push(`${token.slice(0, -3)}y`);
  if (/ed$/.test(token) && token.length > 3) guesses.push(token.slice(0, -1), token.slice(0, -2));
  if (/ing$/.test(token) && token.length > 4) guesses.push(token.slice(0, -3), `${token.slice(0, -3)}e`);
  if (/e?s$/.test(token)) guesses.push(token.replace(/e?s$/, ''), token.replace(/s$/, ''));
  return [...new Set(guesses)].filter(Boolean);
}

export function baseVerb(token) {
  return verbCandidates(token)[1] ?? token;
}

/**
 * A run of English words as one Latin noun phrase, in the case its role wants.
 * Adjectives are put into the same case, number and gender as their noun, which
 * is the agreement the whole exercise is about.
 */
async function nounPhrase(tokens, wantedCase, preposition = null, agreeWith = null) {
  const words = tokens.filter((token) => !ARTICLES.has(token));
  if (!words.length) return null;

  /**
   * A complement agrees with its subject, not with itself.
   *
   * "the boys are happy" has nothing plural in the word *happy*, and reading
   * the number off the complement's own tokens gave *pueri laetus sunt* — a
   * plural subject with a singular adjective, which is the one mistake this
   * whole exercise exists to prevent.
   */
  const number = agreeWith?.number ?? (words.some(looksPlural) ? 'plural' : 'singular');

  // An object pronoun is a word Latin does write, and it is already in the
  // case it needs.
  if (words.length === 1 && OBJECT_PRONOUNS[words[0]] && wantedCase === 'accusative') {
    return { number: 'singular', gender: null, words: [preposition, OBJECT_PRONOUNS[words[0]]].filter(Boolean) };
  }

  const resolved = [];
  for (const token of words) {
    const singular = looksPlural(token)
      ? (singularsOf(token).find((one) => latinFor(one).length) ?? token)
      : token;
    const asNoun = await latinWord(singular, 'noun');
    const asAdjective = await adjectiveLike(singular);
    if (!asNoun && !asAdjective) fail(`no Latin for "${token}"`);
    resolved.push({ token, asNoun, asAdjective });
  }

  /**
   * The head is the *last* word that can be a noun, because that is where
   * English puts it: in "the good boy", *good* can be a noun too (bonus is one)
   * and taking the first match made it the head and dropped *boy* on the floor
   * — "bonus agricolam laudat", a sentence about nobody.
   */
  let headAt = -1;
  for (let i = resolved.length - 1; i >= 0 && headAt === -1; i -= 1) {
    if (resolved[i].asNoun) headAt = i;
  }

  // With a copula the complement may be an adjective alone — "the boys are
  // happy" — and then there is no noun to find and none needed.
  if (headAt === -1) {
    if (!agreeWith) fail(`no noun in "${words.join(' ')}"`);
    const only = resolved.find((one) => one.asAdjective);
    if (!only) fail(`no noun in "${words.join(' ')}"`);
    const form = declineLike(only.asAdjective, agreeWith.gender, wantedCase, number);
    if (!form) fail(`cannot decline ${only.asAdjective.surface}`);
    return { number, gender: agreeWith.gender, words: [preposition, form].filter(Boolean) };
  }

  const head = resolved[headAt].asNoun;
  const gender = head.analysis.gender;

  const parts = head.analysis.principalParts;
  const form = formOf(parts[0], parts[1] ?? parts[0], gender, wantedCase, number);
  if (!form) fail(`cannot decline ${head.surface}`);

  // Everything that is not the head has to be an adjective agreeing with it.
  // Nothing may be quietly left out.
  const rendered = [];
  for (let i = 0; i < resolved.length; i += 1) {
    if (i === headAt) continue;
    const { token, asAdjective } = resolved[i];
    if (!asAdjective) fail(`cannot place "${token}"`);
    const built = declineLike(asAdjective, gender, wantedCase, number);
    if (!built) fail(`cannot decline ${asAdjective.surface}`);
    rendered.push(built);
  }

  return {
    number,
    gender,
    words: [preposition, ...rendered, form].filter(Boolean),
  };
}

/** Everything after the verb, split on the English prepositions that mark case. */
async function taggedPhrases(tokens) {
  const phrases = [];
  let current = [];
  let marker = null;

  const flush = async () => {
    if (!current.length) return;
    const rule = marker ? ENGLISH_PREPOSITIONS[marker] : { case: 'accusative', word: null };
    const phrase = await nounPhrase(current, rule.case, rule.word);
    if (phrase) phrases.push(phrase);
    current = [];
  };

  for (const token of tokens) {
    if (ENGLISH_PREPOSITIONS[token]) {
      await flush();
      marker = token;
      continue;
    }
    current.push(token);
  }
  await flush();
  return phrases;
}

/* ---------------------------------------------------------------- as an engine */

/**
 * The chain's entry point. Latin only, and it declines everything else by name
 * so the log says which pair it was asked for.
 */
/* ------------------------------------------------- word by word, as a last resort */

/**
 * When the grammar is beyond it, the vocabulary still is not.
 *
 * A relative clause, an indirect statement, an ablative absolute — the rules
 * translator refuses all three, and what it falls to is a translation memory
 * that answers Latin with *Ego sum mortis*. A word-by-word decoding beats that,
 * and beats it honestly: Whitaker's knows each word's case and tense for
 * certain, and it is only the shape of the sentence that is unknown.
 *
 * **It is not a sentence and does not pretend to be.** The words stay in Latin
 * order, each with the grammar that is actually on it, so a reader can do the
 * assembling the translator could not. Presenting this as a translation would
 * be the same lie as MyMemory's, in better handwriting.
 */
export async function latinWordByWord(text) {
  const tokens = tokenise(text).filter(isWord);
  if (!tokens.length) fail('nothing to translate');
  // No length limit worth failing on. Capping this at twenty words is exactly
  // how a twenty-seven word sentence fell past the glossary and into MyMemory's
  // Malagasy; a long sentence is the case that needs decoding most.
  if (tokens.length > GLOSS_LIMIT) fail('too long even to gloss');

  const glossed = [];
  for (const token of tokens) {
    const surface = fold(token);

    const particle = PARTICLES[surface];
    if (particle?.english) { glossed.push(`${token} — ${particle.english}`); continue; }
    if (PREPOSITION_ENGLISH[surface]) {
      glossed.push(`${token} — ${PREPOSITION_ENGLISH[surface]}`);
      continue;
    }

    const analyses = await analyse(token).catch(() => null);
    if (!analyses?.length) { glossed.push(`${token} — ?`); continue; }

    /**
     * Which reading to show when a form has several.
     *
     * A noun before a verb, unless the word stands last, where Latin puts its
     * verb — *canis* is "dog" far more often than "you sing", and glossing it
     * as a verb in "canis puellae" was simply unhelpful. The locative is
     * skipped for the same reason it is skipped upstream: it is real, and it is
     * never what a beginner's sentence means.
     */
    const last = token === tokens[tokens.length - 1];
    const ranked = [...analyses].sort((one, other) => rankPos(one.pos, last) - rankPos(other.pos, last));

    const analysis = ranked[0];
    const gloss = glossFor(surface, analysis) ?? '?';
    glossed.push(`${token} — ${gloss}${describe(analysis.inflections)}`);
  }

  return glossed.join(' · ');
}

/**
 * The grammar actually on a form, short enough to sit beside it.
 *
 * *Every* case it could be, not the first one listed. A gloss is for decoding,
 * and *urbe* being ablative or dative is exactly the thing the reader needs to
 * weigh — picking one silently would be guessing at the grammar in a fallback
 * whose whole point is that the grammar is beyond us.
 */
function describe(inflections) {
  const list = (inflections ?? []).filter((one) => one.case !== 'locative');
  if (!list.length) return '';

  const cases = [...new Set(list.filter((one) => one.case)
    .map((one) => `${one.case.slice(0, 3)}.${one.number === 'plural' ? ' pl.' : ' sg.'}`))];
  if (cases.length) return ` (${cases.slice(0, 3).join(' / ')})`;

  const finite = list.find((one) => one.person);
  if (!finite) return '';
  const number = finite.number === 'plural' ? 'pl.' : 'sg.';
  return ` (${[finite.person, number, finite.tense].filter(Boolean).join(' ')})`;
}

/**
 * The other way round, and deliberately *less* than a translation.
 *
 * Word-by-word English into Latin would mean guessing at cases, and in Latin
 * the case is the grammar — a guessed case is a confidently wrong sentence that
 * reads like a right one. So this hands back dictionary forms, the way a
 * glossary at the back of a textbook does, and leaves the sentence to the
 * reader who knows what they meant.
 */
/**
 * Latin words that carry another verb and stand at the end of the clause.
 *
 * "I can't take it anymore" is *possum* plus *capio*, and Latin does not leave
 * the modal where English put it — it goes last, after everything it governs.
 */
const LATIN_MODALS = new Set(['possum', 'debeo', 'volo', 'nolo', 'malo', 'soleo', 'coepi']);

/** Subject pronouns, which Latin writes only for emphasis. */
const LATIN_SUBJECT_PRONOUNS = new Set(['ego', 'nos', 'tu', 'vos']);

export async function englishGlossary(text) {
  const tokens = openContractions(tokenise(text).filter(isWord).map(fold))
    .filter((token) => !ARTICLES.has(token));
  if (!tokens.length) fail('nothing to translate');
  if (tokens.length > GLOSS_LIMIT) fail('too long even to gloss');

  const glossed = [];
  for (const token of tokens) {
    const singular = looksPlural(token)
      ? (singularsOf(token).find((one) => latinFor(one).length) ?? token)
      : token;

    if (FUNCTION_GLOSS[token]) { glossed.push(`${token} — ${FUNCTION_GLOSS[token]}`); continue; }

    let found = null;
    for (const guess of [singular, ...verbCandidates(token)]) {
      const [first] = await latinCandidates(guess);
      if (first) { found = first; break; }
    }
    glossed.push(found ? `${token} — ${found}` : `${token} — ?`);
  }

  // Only if there was nothing at all to say. With a dictionary behind it rather
  // than a word list, that should not happen for English.
  if (glossed.every((entry) => entry.endsWith('— ?'))) fail('no Latin for any of it');

  /**
   * The words, put into Latin order rather than listed.
   *
   * A column of "word — word" is a lookup table, and nobody asked for a lookup
   * table; they asked what the sentence is in Latin. The grammar is still
   * beyond this — the cases are dictionary forms, and the page says so — but
   * the *order* is not guesswork: Latin drops a pronoun subject its verb
   * already carries, and puts a modal at the end after everything it governs.
   * "I can't take it anymore" is *non capio id iam possum*, not a list.
   */
  // A word with no Latin stays visible, in brackets and in English. Dropping it
  // would hand back a sentence quietly missing a piece of what was asked.
  const words = glossed.map((entry) => {
    const [english, latin] = entry.split(' — ');
    return !latin || latin === '?' ? `[${english}]` : latin;
  });

  const kept = words.filter((word, i) => !(LATIN_SUBJECT_PRONOUNS.has(word) && i === 0));

  /**
   * The verb goes last, which is the order Latin is taught in.
   *
   * Neutral Latin is subject–object–verb, so leaving *est* where English put it
   * gives a sentence that reads like English wearing Latin words. Everything
   * that is not a verb keeps its order; the verbs follow; a modal follows them,
   * since it governs the rest.
   */
  const verbs = new Set();
  await Promise.all(kept.map(async (word) => {
    if (word.startsWith('[')) return;
    const analyses = await analyse(word).catch(() => null);
    if (analyses?.some((one) => one.pos === 'verb')) verbs.add(word);
  }));

  const body = [
    ...kept.filter((word) => !verbs.has(word) && !LATIN_MODALS.has(word)),
    ...kept.filter((word) => verbs.has(word) && !LATIN_MODALS.has(word)),
    ...kept.filter((word) => LATIN_MODALS.has(word)),
  ];

  return body.join(' ');
}

/** What this engine calls itself, so the chain can tell its work from a guess. */
export const LATIN_RULES_ENGINE = 'Whitaker’s Words';

export async function latinRules(text, from, to) {
  if (from === 'la' && to === 'en') {
    return { text: await latinToEnglish(text), engine: LATIN_RULES_ENGINE };
  }
  if (from === 'en' && to === 'la') {
    return { text: await englishToLatin(text), engine: LATIN_RULES_ENGINE };
  }
  throw new Error(`the rules translator is Latin only, not ${from}|${to}`);
}

/**
 * The glossary, for English into Latin — and it sits *above* the free engines.
 *
 * Not symmetry for its own sake: measured. Asked for "the boy who praises the
 * farmer is happy", MyMemory returns *boy qui derae agricola est happy* — Latin
 * words and English ones in a heap, which a reader could copy out believing it.
 * A list of dictionary forms is less than a translation and is worth more,
 * because it is true.
 */
export async function englishToLatinGloss(text, from, to) {
  if (from !== 'en' || to !== 'la') throw new Error(`the glossary is en|la only, not ${from}|${to}`);
  return { text: await englishGlossary(text), engine: LATIN_RULES_ENGINE, wordByWord: true };
}

/**
 * The word-by-word decoding, for Latin into English — and it sits at the very
 * bottom, because MyMemory's Latin *into* English is occasionally right, and a
 * correct sentence beats a correct list.
 */
export async function latinToEnglishGloss(text, from, to) {
  if (from !== 'la' || to !== 'en') throw new Error(`the gloss is la|en only, not ${from}|${to}`);
  return { text: await latinWordByWord(text), engine: LATIN_RULES_ENGINE, wordByWord: true };
}
