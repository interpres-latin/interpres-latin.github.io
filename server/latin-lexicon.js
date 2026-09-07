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
