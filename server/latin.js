/**
 * Whitaker's Words, the base for everything Latin on this site.
 *
 * WORDS by William Whitaker is the standard free Latin morphological
 * dictionary: give it any inflected form and it returns the dictionary
 * headword with its principal parts, which declension or conjugation it
 * belongs to, its gender, a short definition, and — the part nothing else does
 * for free — the exact parse of the form you gave it. `puellarum` comes back as
 * the genitive plural of *puella, puellae*, feminine, first declension.
 *
 * It is reached through the Alpheios morphology service, which hosts it as
 * JSON. There is no key and no quota published; requests are cached here
 * because the same handful of words is asked for over and over in a lesson.
 *
 * Two things are built on this file:
 *   the dictionary page, which wants the headword and its principal parts;
 *   the translator, which parses every Latin word it produces so the case of
 *   each one is shown rather than trusted — see server/routes/translate.js.
 */

import { USER_AGENT } from './throttle.js';

const ALPHEIOS = 'https://morph.alpheios.net/api/v1/analysis/word';

const CACHE_TTL = 1000 * 60 * 60 * 24;
const CACHE_MAX = 3000;
const cache = new Map();

/** Whitaker's spells these out; the page and the tutor want them short. */
const GENDERS = { masculine: 'masculine', feminine: 'feminine', neuter: 'neuter', common: 'common' };

const CASES = ['nominative', 'genitive', 'dative', 'accusative', 'ablative', 'vocative', 'locative'];

/**
 * Whitaker's records how common and how old each headword is, and both matter
 * for which reading to lead with. *canem* belongs to two headwords — *canes*,
 * which is early and rare, and *canis*, which is very frequent — and offering
 * the archaic one first is how "the dog of the girl" came back as *canes*.
 */
const FREQUENCY_RANK = {
  'very frequent': 0, frequent: 1, common: 2, lesser: 3, uncommon: 4,
  'very rare': 5, inscription: 6, graffiti: 7, pliny: 8,
};
const AGE_RANK = {
  '': 0, common: 0, classical: 0, late: 2, early: 3, archaic: 3,
  medieval: 4, scholar: 5, modern: 5,
};

function standing(dict, text) {
  const freq = FREQUENCY_RANK[text(dict.freq).toLowerCase()] ?? 2;
  const age = AGE_RANK[text(dict.age).toLowerCase()] ?? 1;
  return freq + age;
}

/**
 * Latin has no j or v as separate letters, and editions differ on both. A
 * lookup should not fail because the text spells it *iam* and the reader typed
 * *jam*, so both are tried.
 */
export function latinVariants(word) {
  const lower = String(word).toLowerCase().replace(/[^a-zāēīōūăĕĭŏŭïöüéè'-]/gi, '');
  const plain = lower.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const set = new Set([lower, plain]);
  set.add(plain.replace(/j/g, 'i').replace(/v/g, 'u'));
  set.add(plain.replace(/^u/, 'v'));
  return [...set].filter(Boolean);
}

function remember(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), value });
}

/** The `$` wrapper Alpheios puts around every leaf value. */
const text = (node) => {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(text).filter(Boolean).join(', ');
  return typeof node.$ === 'string' ? node.$ : '';
};

const list = (node) => (node == null ? [] : (Array.isArray(node) ? node : [node]));

/**
 * Every analysis Alpheios returns, flattened.
 *
 * The shape is awkward on purpose — it is RDF — and it varies: an unambiguous
 * word has one Body, an ambiguous one has several, and each Body holds one or
 * more entries, each of which holds one or more inflections. `bellum` is three
 * different words and eight different parses of them.
 */
function readAnalyses(payload) {
  const annotation = payload?.RDF?.Annotation;
  if (!annotation) return [];

  const entries = list(annotation.Body).flatMap((body) => list(body?.rest?.entry));

  return entries.flatMap((entry) => {
    const inflections = list(entry.infl).filter(Boolean).map((infl) => ({
      stem: text(infl.term?.stem),
      suffix: text(infl.term?.suff),
      pos: text(infl.pofs),
      declension: text(infl.decl),
      conjugation: text(infl.conj),
      case: text(infl.case),
      number: text(infl.num),
      gender: text(infl.gend),
      person: text(infl.pers),
      tense: text(infl.tense),
      mood: text(infl.mood),
      voice: text(infl.voice),
      degree: text(infl.comp),
    }));

    const meaning = text(entry.mean).replace(/\s*;\s*$/, '').trim();

    // `dict` is a list when one form belongs to several headwords that inflect
    // alike — *canem* is the accusative of both *canes* and *canis*. Read as a
    // single object it comes back blank and the whole analysis disappears,
    // which is how the accusative of "dog" briefly stopped existing.
    return list(entry.dict).map((dict) => {
      const headword = text(dict?.hdwd);
      if (!headword) return null;
      return {
        // "amo, amare, amavi, amatus" — the principal parts, as a Latin
        // teacher writes them and as the dictionary page prints them.
        headword,
        frequency: text(dict.freq),
        age: text(dict.age),
        standing: standing(dict, text),
        principalParts: headword.split(',').map((part) => part.trim()).filter(Boolean),
        lemma: headword.split(',')[0].trim(),
        pos: text(dict.pofs) || inflections[0]?.pos || '',
        // Which of the five declensions, or which of the four conjugations.
        declension: text(dict.decl) || inflections[0]?.declension || '',
        conjugation: text(dict.conj) || inflections[0]?.conjugation || '',
        gender: GENDERS[text(dict.gend)] ?? text(dict.gend),
        definition: meaning,
        inflections,
      };
    }).filter(Boolean);
  })
    // Most standard first: a rare or archaic headword should never be the one
    // a reader is shown, or the one a correction is built from.
    .sort((a, b) => a.standing - b.standing);
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/** One request, retried twice: the service drops the occasional connection. */
async function ask(form, attempt = 0) {
  const url = `${ALPHEIOS}?word=${encodeURIComponent(form)}&engine=whitakerLat&lang=lat`;
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(12000),
    });
    // The service answers 201, not 200, when it has something to say.
    if (!response.ok) throw new Error(`Whitaker's Words responded ${response.status}`);
    return readAnalyses(await response.json());
  } catch (error) {
    if (attempt < 2) {
      await wait(400 * (attempt + 1));
      return ask(form, attempt + 1);
    }
    throw error;
  }
}

/**
 * Ask Whitaker's about one word.
 *
 * Returns an empty array for a word it does not know, and throws when it could
 * not be reached — the two must stay apart, because only the first is worth
 * caching. Recording a failed request as "no such word" for a day is how
 * `canem` briefly stopped being the accusative of *canis*.
 */

/* ------------------------------------------------------------- the pronouns */

/**
 * The personal and reflexive pronouns, written out.
 *
 * The morphology service does not have them. Asked about *ego* it answers
 * nothing at all, and asked about *me* it answers with the verb *meio*, "to
 * urinate" — so the dictionary told a reader that *ego* is not a Latin word,
 * and every path built on this one inherited the same hole.
 *
 * A closed class is a list. There are about thirty forms, they have not changed
 * in two thousand years, and they are among the commonest words in the
 * language, so they are answered from here before the service is asked.
 *
 * Shaped exactly like an analysis from the wire, so nothing downstream has to
 * know the difference.
 */
const PRONOUNS = {
  ego:     ['ego, mei', 'ego', 'I', [['nominative', 'singular', '1st']]],
  mei:     ['ego, mei', 'ego', 'of me', [['genitive', 'singular', '1st']]],
  mihi:    ['ego, mei', 'ego', 'to/for me', [['dative', 'singular', '1st']]],
  me:      ['ego, mei', 'ego', 'me', [['accusative', 'singular', '1st'], ['ablative', 'singular', '1st']]],
  nos:     ['nos, nostrum', 'nos', 'we, us', [['nominative', 'plural', '1st'], ['accusative', 'plural', '1st']]],
  nostrum: ['nos, nostrum', 'nos', 'of us', [['genitive', 'plural', '1st']]],
  nostri:  ['nos, nostrum', 'nos', 'of us', [['genitive', 'plural', '1st']]],
  nobis:   ['nos, nostrum', 'nos', 'to/for us, by us', [['dative', 'plural', '1st'], ['ablative', 'plural', '1st']]],

  tu:      ['tu, tui', 'tu', 'you', [['nominative', 'singular', '2nd']]],
  tui:     ['tu, tui', 'tu', 'of you', [['genitive', 'singular', '2nd']]],
  tibi:    ['tu, tui', 'tu', 'to/for you', [['dative', 'singular', '2nd']]],
  te:      ['tu, tui', 'tu', 'you', [['accusative', 'singular', '2nd'], ['ablative', 'singular', '2nd']]],
  vos:     ['vos, vestrum', 'vos', 'you', [['nominative', 'plural', '2nd'], ['accusative', 'plural', '2nd']]],
  vestrum: ['vos, vestrum', 'vos', 'of you', [['genitive', 'plural', '2nd']]],
  vestri:  ['vos, vestrum', 'vos', 'of you', [['genitive', 'plural', '2nd']]],
  vobis:   ['vos, vestrum', 'vos', 'to/for you, by you', [['dative', 'plural', '2nd'], ['ablative', 'plural', '2nd']]],

  sui:     ['sui', 'sui', 'of himself/herself/itself/themselves', [['genitive', '', '3rd']]],
  sibi:    ['sui', 'sui', 'to/for himself/herself/themselves', [['dative', '', '3rd']]],
  se:      ['sui', 'sui', 'himself, herself, itself, themselves', [['accusative', '', '3rd'], ['ablative', '', '3rd']]],
  sese:    ['sui', 'sui', 'himself, herself, itself, themselves', [['accusative', '', '3rd'], ['ablative', '', '3rd']]],
};

function pronounAnalysis(word) {
  const entry = PRONOUNS[String(word).toLowerCase()];
  if (!entry) return null;
  const [headword, lemma, definition, forms] = entry;

  return [{
    headword,
    frequency: 'very frequent',
    age: '',
    standing: 0,
    principalParts: headword.split(',').map((part) => part.trim()),
    lemma,
    pos: 'pronoun',
    declension: '',
    conjugation: '',
    gender: '',
    definition,
    inflections: forms.map(([grammaticalCase, number, person]) => ({
      stem: lemma, suffix: '', pos: 'pronoun', declension: '', conjugation: '',
      case: grammaticalCase, number, gender: '', person, tense: '', mood: '', voice: '', degree: '',
    })),
  }];
}

export async function analyse(word) {
  const key = String(word).toLowerCase();

  // The closed class first: the service does not have it, and a word it does
  // have under the same spelling is the wrong word.
  const pronoun = pronounAnalysis(key);
  if (pronoun) return pronoun;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value;

  let lastError = null;
  for (const form of latinVariants(word)) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const found = await ask(form);
      if (found.length) {
        remember(key, found);
        return found;
      }
    } catch (error) {
      lastError = error;
    }
  }

  // Every spelling was asked and none was known: that is an answer, so cache it.
  if (!lastError) {
    remember(key, []);
    return [];
  }
  throw lastError;
}

/** Like analyse, but an outage reads as "nothing known" rather than throwing. */
export async function analyseQuietly(word) {
  return analyse(word).catch(() => []);
}

// ---------------------------------------------------------------------------
// reading a parse back as English
// ---------------------------------------------------------------------------

const SHORT_CASE = {
  nominative: 'nom.', genitive: 'gen.', dative: 'dat.',
  accusative: 'acc.', ablative: 'abl.', vocative: 'voc.', locative: 'loc.',
};
const SHORT_NUMBER = { singular: 'sg.', plural: 'pl.' };

/** "accusative singular", or "3rd singular present indicative active". */
export function describeInflection(infl, { short = false } = {}) {
  if (!infl) return '';
  const parts = [];

  if (infl.case) parts.push(short ? SHORT_CASE[infl.case] ?? infl.case : infl.case);
  if (infl.person) parts.push(`${infl.person}`);
  if (infl.number) parts.push(short ? SHORT_NUMBER[infl.number] ?? infl.number : infl.number);
  if (infl.gender && infl.case) parts.push(infl.gender);
  if (infl.tense) parts.push(infl.tense);
  if (infl.mood) parts.push(infl.mood);
  if (infl.voice) parts.push(infl.voice);
  if (infl.degree && infl.degree !== 'positive') parts.push(infl.degree);

  return parts.filter(Boolean).join(' ');
}

/** Whether an analysis carries a given case anywhere in its inflections. */
export function hasCase(analysis, wanted) {
  return analysis.inflections.some((infl) => infl.case === wanted);
}

export const LATIN_CASES = CASES;

export const WHITAKER_CREDIT = {
  name: 'Whitaker’s Words',
  url: 'https://mk270.github.io/whitakers-words/',
  licence: 'public domain, via the Alpheios morphology service',
};
