/**
 * The Latin the site already knows, indexed both ways.
 *
 * Two sources, both already in the repository and both hand-checked:
 *
 *   - the Cambridge Latin Course vocabulary in `data/stages-la.js`, 571 pairs
 *     of Latin and English. Its verbs are third-person singular forms — the
 *     course teaches *laborat*, "works", long before it teaches *laboro* — and
 *     its nouns are nominatives, which is exactly the shape a beginner meets.
 *   - the verb table in `data/verbs-la.js`, which holds real principal parts.
 *
 * These glosses are better than a dictionary's for this reader. Whitaker's
 * gives *laudo* as "recommend; praise, approve, extol", and a class that has
 * been taught "praises" should be told "praises". So the course vocabulary is
 * asked first and Whitaker's is the fallback, not the other way round.
 *
 * Whitaker's still does all the morphology. This file only answers "which Latin
 * word means this English one, and which English word means this Latin one".
 */

import { allWords } from '../public/js/data/stages-la.js';
import { COMMON_VERBS, MODEL_VERBS, IRREGULARS } from '../public/js/data/verbs-la.js';
import { throttle, USER_AGENT } from './throttle.js';

const fold = (word) => String(word ?? '').trim().toLowerCase();

/**
 * Core words a beginner meets that the Cambridge lists happen not to carry.
 *
 * *agricola* is the example: it is in every first-declension paradigm ever
 * printed, and in no Cambridge stage, so "the farmer" had nowhere to go. These
 * are ordinary dictionary words, chosen for being unambiguous rather than for
 * being interesting, and they are looked at after the course vocabulary so they
 * can never displace a gloss the class was actually taught.
 */
const SUPPLEMENT = [
  ['agricola', 'farmer'], ['nauta', 'sailor'], ['poeta', 'poet'], ['incola', 'inhabitant'],
  ['dominus', 'master'], ['domina', 'mistress'], ['amicus', 'friend'], ['inimicus', 'enemy'],
  ['liber', 'book'], ['ager', 'field'], ['equus', 'horse'], ['murus', 'wall'],
  ['bellum', 'war'], ['oppidum', 'town'], ['templum', 'temple'], ['verbum', 'word'],
  ['donum', 'gift'], ['caelum', 'sky'], ['aqua', 'water'], ['terra', 'land'],
  ['insula', 'island'], ['silva', 'wood'], ['luna', 'moon'], ['stella', 'star'],
  ['regina', 'queen'], ['rex', 'king'], ['corpus', 'body'], ['tempus', 'time'],
  ['urbs', 'city'], ['nomen', 'name'], ['homo', 'man'], ['vir', 'man'],
  ['femina', 'woman'], ['vita', 'life'], ['mors', 'death'], ['manus', 'hand'],
  ['dies', 'day'], ['nox', 'night'], ['annus', 'year'], ['locus', 'place'],
  ['magnus', 'big'], ['parvus', 'small'], ['bonus', 'good'], ['malus', 'bad'],
  ['longus', 'long'], ['altus', 'high'], ['novus', 'new'], ['antiquus', 'ancient'],
  ['amo', 'love'], ['moneo', 'warn'], ['rego', 'rule'], ['audio', 'hear'],
  ['capio', 'take'], ['do', 'give'], ['duco', 'lead'], ['mitto', 'send'],
  ['porto', 'carry'], ['specto', 'watch'], ['voco', 'call'], ['supero', 'overcome'],
  ['persona', 'person'], ['heros', 'hero'], ['mundus', 'world'], ['memoria', 'memory'],
  ['discrimen', 'crisis'], ['telum', 'missile'], ['gens', 'people'], ['populus', 'nation'],
  ['memini', 'remember'], ['obliviscor', 'forget'], ['morior', 'die'], ['vivo', 'live'],
  ['cupio', 'want'], ['opto', 'wish'], ['peto', 'seek'], ['puto', 'think'],
  ['scio', 'know'], ['credo', 'believe'], ['sentio', 'feel'], ['spero', 'hope'],
];

/** Latin surface form → the course's own English gloss. */
const latinToCourse = new Map();

/** English word → Latin surface form, best (earliest, shortest) first. */
const englishToLatin = new Map();

function addEnglish(english, latin) {
  const key = fold(english);
  if (!key || key.includes(' ') === false && key.length < 2) return;
  if (!englishToLatin.has(key)) englishToLatin.set(key, []);
  const list = englishToLatin.get(key);
  if (!list.includes(latin)) list.push(latin);
}

/**
 * A gloss is often several senses: "spring, fountain", "shout, uproar". Each
 * one is a way somebody might ask for the word, so each one is indexed — and
 * the whole string too, for "res publica"-shaped entries.
 */
function senses(gloss) {
  const whole = fold(gloss).replace(/\s*\([^)]*\)/g, '').trim();
  const parts = whole.split(/[,;/]/).map((part) => part.trim()).filter(Boolean);
  return [...new Set([whole, ...parts])].filter(Boolean);
}

for (const { latin, english } of allWords()) {
  const key = fold(latin);
  if (!latinToCourse.has(key)) latinToCourse.set(key, english);
  for (const sense of senses(english)) addEnglish(sense, latin);
}

// After the course, never before it: a supplement must not out-rank a gloss the
// class was taught.
for (const [latin, english] of SUPPLEMENT) {
  const key = fold(latin);
  if (!latinToCourse.has(key)) latinToCourse.set(key, english);
  for (const sense of senses(english)) addEnglish(sense, latin);
}

// The verb tables carry infinitive glosses — "to praise" — so both "praise"
// and "to praise" have to find their way home.
for (const [parts, gloss] of [...COMMON_VERBS, ...Object.entries(MODEL_VERBS), ...Object.entries(IRREGULARS)]) {
  const principal = typeof parts === 'string' ? parts : String(parts);
  const lemma = principal.split(/,\s*/)[0];
  if (typeof gloss !== 'string') continue;

  if (!latinToCourse.has(fold(lemma))) latinToCourse.set(fold(lemma), gloss.replace(/^to\s+/, ''));
  for (const sense of senses(gloss)) {
    addEnglish(sense, lemma);
    addEnglish(sense.replace(/^to\s+/, ''), lemma);
  }
}

/** The course's gloss for a Latin form, if it teaches one. */
export function courseGloss(latin) {
  return latinToCourse.get(fold(latin)) ?? null;
}

/**
 * Latin candidates for an English word, best first.
 *
 * Plurals are tried as singulars, because the lexicon is written in the
 * singular and "the farmers" is a perfectly ordinary thing to type.
 */
export function latinFor(english) {
  const key = fold(english);
  const direct = englishToLatin.get(key);
  if (direct?.length) return direct;

  for (const singular of singularsOf(key)) {
    const found = englishToLatin.get(singular);
    if (found?.length) return found;
  }
  return [];
}

/** The English singulars a plural could have come from. */
export function singularsOf(word) {
  const key = fold(word);
  const guesses = [];
  if (/ies$/.test(key)) guesses.push(`${key.slice(0, -3)}y`);
  if (/([sxz]|ch|sh)es$/.test(key)) guesses.push(key.slice(0, -2));
  if (/s$/.test(key) && !/ss$/.test(key)) guesses.push(key.slice(0, -1));
  return guesses;
}

/** Whether the lexicon knows this English word at all, singular or plural. */
export function knowsEnglish(english) {
  return latinFor(english).length > 0;
}

export const LEXICON_SIZE = { latin: latinToCourse.size, english: englishToLatin.size };

/* ------------------------------------------------ a real dictionary behind it */

/**
 * English → Latin from Wiktionary's translation tables.
 *
 * The lists above are a vocabulary, not a dictionary: 630 words, hand-written,
 * and every word missing from them was a bug to be fixed by hand — *person*,
 * *remember*, *hero*, *lid*. That is not a gap to keep patching, it is the
 * wrong shape. Wiktionary's English entries carry `{{t|la|…}}` translations for
 * a vocabulary orders of magnitude larger, free and already the source of the
 * English glosses this site shows elsewhere.
 *
 * The course list is still asked first, because a class taught *villa* for
 * "house" should be given *villa*. This answers everything after it.
 */
const wiktionaryCache = new Map();

/** Macrons are a teaching aid; Whitaker's and the decliner want them off. */
function stripMacrons(word) {
  return word.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

async function fromWiktionary(english) {
  const key = fold(english);
  if (wiktionaryCache.has(key)) return wiktionaryCache.get(key);

  const url = new URL('https://en.wiktionary.org/w/api.php');
  url.searchParams.set('action', 'parse');
  url.searchParams.set('page', key);
  url.searchParams.set('prop', 'wikitext');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('origin', '*');

  let found = [];
  try {
    const response = await throttle('wikimedia', 180, () => fetch(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(12000),
    }));
    if (response.ok) {
      const wikitext = (await response.json())?.parse?.wikitext ?? '';
      /**
       * Wiktionary writes a translation four ways — `t`, `t+`, `tt`, `tt+`,
       * and `t-check` — and matching only the first two silently lost words
       * that were plainly there: "sad" has *tristis* and *maestus* under `tt`,
       * and the lookup reported nothing and went wandering through the
       * definition instead, arriving at *corpus*.
       */
      found = [...wikitext.matchAll(/\{\{tt?\+?(?:-check)?\|la\|([^}|]+)/g)]
        .map((match) => stripMacrons(match[1].trim()))
        .filter((word) => /^[\p{L}\s-]+$/u.test(word));
      found = [...new Set(found)];
    }
  } catch {
    // Offline, or Wiktionary is having a day. The course list already answered
    // everything it could; this simply adds nothing.
  }

  wiktionaryCache.set(key, found);
  return found;
}

/**
 * Words too common to carry meaning in a definition.
 *
 * A definition is prose, and looking up "the" or "of" in Latin tells you
 * nothing about the word being defined.
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from',
  'or', 'and', 'that', 'this', 'is', 'are', 'be', 'being', 'been', 'as', 'it',
  'its', 'which', 'who', 'whom', 'having', 'used', 'especially', 'something',
  'someone', 'one', 'any', 'some', 'such', 'other', 'more', 'most', 'very',
  'not', 'no', 'so', 'than', 'then', 'when', 'where', 'while', 'form',
  'alternative', 'plural', 'singular', 'past', 'tense', 'participle',
]);

/** Wiktionary's way of saying "look at another entry instead". */
const POINTS_ELSEWHERE = /(?:alternative (?:form|spelling)|obsolete form|plural|past tense|past participle|present participle|comparative|superlative|inflection|misspelling)\s+of\s+([\p{L}' -]+)/iu;

const definitionCache = new Map();

/** The first English definitions Wiktionary gives for a word. */
async function definitionsOf(english) {
  const key = fold(english);
  if (definitionCache.has(key)) return definitionCache.get(key);

  let found = [];
  try {
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(key)}`;
    const response = await throttle('wikimedia', 180, () => fetch(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(12000),
    }));
    if (response.ok) {
      const body = await response.json();
      found = (body.en ?? []).flatMap((section) => (section.definitions ?? [])
        .map((entry) => String(entry.definition ?? '').replace(/<[^>]+>/g, '').trim()))
        .filter(Boolean)
        .slice(0, 3);
    }
  } catch {
    // No definitions is the same as no help; the caller has already tried the
    // direct translation.
  }

  definitionCache.set(key, found);
  return found;
}

/**
 * Every Latin candidate for an English word.
 *
 * Four places, in order of how directly they answer:
 *
 *   1. the course vocabulary, so a class taught *villa* is given *villa*;
 *   2. Wiktionary's translation table for the word itself;
 *   3. the same for the word Wiktionary points at, when the entry is only a
 *      pointer — "anymore" is an alternative form of "any more";
 *   4. the same for the words Wiktionary *defines* it with.
 *
 * The fourth is the one that matters here. "worth" has no Latin translation and
 * never will have a tidy one, but Wiktionary defines it as "having a value of",
 * and *value* is **pretium**. Following the definition is what a person does
 * with a bilingual dictionary that has failed them, and there is no reason the
 * site should not do it too.
 */
export async function latinCandidates(english, depth = 0) {
  const known = latinFor(english);
  if (known.length) return known;

  const direct = await fromWiktionary(english);
  if (direct.length) return direct;

  for (const singular of singularsOf(english)) {
    const asSingular = await fromWiktionary(singular);
    if (asSingular.length) return asSingular;
  }

  if (depth > 1) return [];

  const definitions = await definitionsOf(english);

  // A pointer to another entry is followed before anything is read out of it.
  for (const definition of definitions) {
    const pointer = POINTS_ELSEWHERE.exec(definition);
    if (!pointer) continue;
    const followed = await latinCandidates(pointer[1].trim(), depth + 1);
    if (followed.length) return followed;
  }

  // Otherwise the words it was defined with, in the order they were written:
  // a definition puts its nearest synonym first.
  const words = definitions.flatMap((definition) => definition
    .toLowerCase()
    .match(/[\p{L}']+/gu) ?? [])
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  for (const word of [...new Set(words)].slice(0, 6)) {
    const viaMeaning = await latinCandidates(word, depth + 1);
    if (viaMeaning.length) return viaMeaning;
  }

  return [];
}

/* ------------------------------------------------- Latin → English glosses */

/**
 * Wiktionary's gloss for a Latin word, which is usually kinder than Whitaker's.
 *
 * Whitaker's writes for a parser: *laudo* is "recommend; praise, approve,
 * extol", and the first sense is not the one anybody means. Wiktionary writes
 * for a reader: "to praise, laud, extol". The course list still wins, because a
 * class taught "works" for *laborat* should be told "works".
 *
 * Filled in before a sentence is assembled, so the assembly can stay
 * synchronous; `latinGlossOf` only reads what priming has already fetched.
 */
const latinGlosses = new Map();

export function latinGlossOf(word) {
  return latinGlosses.get(fold(word)) ?? null;
}

export async function primeLatinGlosses(words) {
  await Promise.all([...new Set(words.map(fold))].map(async (word) => {
    if (latinGlosses.has(word)) return;
    latinGlosses.set(word, null);

    try {
      const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
      const response = await throttle('wikimedia', 180, () => fetch(url, {
        headers: { accept: 'application/json', 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(12000),
      }));
      if (!response.ok) return;

      const body = await response.json();
      for (const section of body.la ?? []) {
        for (const entry of section.definitions ?? []) {
          const text = String(entry.definition ?? '').replace(/<[^>]+>/g, '').trim();
          /**
           * A pointer, not a meaning.
           *
           * Wiktionary answers an inflected form with its morphology —
           * "accusative singular of fīlia" — which read as a gloss produced
           * "The father sees the accusative singular of fīlia". Anything
           * opening with a grammatical term is describing the form rather than
           * saying what it means; the lemma is asked separately.
           */
          if (!text) continue;
          if (/^(?:inflection|inflected form|form|nominative|vocative|accusative|genitive|dative|ablative|locative|singular|plural|masculine|feminine|neuter|first|second|third|present|imperfect|perfect|pluperfect|future|active|passive|indicative|subjunctive|imperative|infinitive|participle|gerund|supine|comparative|superlative|alternative|obsolete|archaic|synonym)\b/i.test(text)) continue;
          latinGlosses.set(word, text);
          return;
        }
      }
    } catch {
      // Whitaker's definition is still there to fall back on.
    }
  }));
}

/* ------------------------------------------------------- noun stems, properly */

/**
 * The principal parts of a Latin noun, from Wiktionary's headword template.
 *
 * Whitaker's genitives cannot always be built on. It gives *filius, fili* — the
 * syncopated genitive — so a decliner working back from it gets the stem "fil"
 * and produces *filum*, "thread", for "son". And it answers *liber* with the
 * adjective's *liberi*, so "book" declines as *liberum* instead of *librum*.
 *
 * Wiktionary states the declension and, where it is irregular, the stem
 * outright: `puella<1>`, `dominus<2>`, `liber/libr<2>`. For the first two
 * declensions that is enough to build the genitive with certainty, which is
 * exactly where Whitaker's was letting the side down. Third declension is left
 * to Whitaker's, which is reliable there.
 */
const nounPartsCache = new Map();

export async function latinNounParts(word) {
  const key = fold(word);
  if (nounPartsCache.has(key)) return nounPartsCache.get(key);
  nounPartsCache.set(key, null);

  try {
    const url = new URL('https://en.wiktionary.org/w/api.php');
    url.searchParams.set('action', 'parse');
    url.searchParams.set('page', key);
    url.searchParams.set('prop', 'wikitext');
    url.searchParams.set('format', 'json');
    url.searchParams.set('formatversion', '2');

    const response = await throttle('wikimedia', 180, () => fetch(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(12000),
    }));
    if (!response.ok) return null;

    const wikitext = (await response.json())?.parse?.wikitext ?? '';
    const latin = wikitext.includes('==Latin==') ? wikitext.split('==Latin==')[1] : '';
    /**
     * A page can carry more than one noun: *liber* is both "book" (stem
     * *libr-*) and "free man" (stem *liber-*). Where a stem is written out
     * explicitly it is written out *because* the regular derivation would be
     * wrong, so that entry is the one to trust.
     */
    const templates = [...latin.matchAll(/\{\{la-noun\|([^}|]+)/g)].map((match) => match[1]);
    if (!templates.length) return null;
    const chosen = templates.find((one) => one.includes('/')) ?? templates[0];

    // "((fīlius<2.voci>,fīlius<2>))" — the doubled form lists variants; the
    // first is the one to build on.
    const raw = stripMacrons(chosen.replace(/^\(\(/, '').split(',')[0].trim());
    const shape = /^([\p{L}]+)(?:\/([\p{L}]+))?<(\d)/u.exec(raw);
    if (!shape) return null;

    const [, nominative, explicitStem, declension] = shape;
    const stem = explicitStem
      ?? (declension === '1' ? nominative.replace(/a$/, '')
        : nominative.replace(/us$/, '').replace(/um$/, ''));

    const genitive = declension === '1' ? `${stem}ae`
      : (declension === '2' ? `${stem}i` : null);
    if (!genitive) return null;

    const parts = { nominative, genitive };
    nounPartsCache.set(key, parts);
    return parts;
  } catch {
    return null;
  }
}
