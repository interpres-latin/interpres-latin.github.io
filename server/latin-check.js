/**
 * Checking — and where it can, correcting — the case of translated Latin.
 *
 * No free engine produces reliably correct Latin. Google is good on simple
 * sentences and wrong on ordinary ones: *the dog of the girl* comes back as
 * **canem puellae**, with the dog in the accusative when nothing is doing
 * anything to it. A site that shows that to a student and says nothing has
 * taught them the wrong ending.
 *
 * So two things happen to every Latin translation.
 *
 * **Every word is parsed** through Whitaker's Words and its case, number and
 * gender are handed to the page. That is the honest part: the reader is shown
 * the grammar rather than asked to trust it, and a word that is not Latin at
 * all is flagged as such.
 *
 * **A wrong case is put right where the construction is unambiguous.** Only
 * where it is unambiguous — an English noun phrase with no verb in it has a
 * nominative head, full stop, so a head noun in some other case is an error
 * that can be corrected from the headword rather than merely reported. The
 * decliner supplies the right form; nothing is invented.
 */

import { analyse, describeInflection } from './latin.js';
import { declineNoun, parseParts } from '../public/js/lib/decliner-la.js';

/**
 * Words Whitaker's does not analyse but which are perfectly good Latin.
 *
 * The morphology service covers inflected forms and leaves most of the personal
 * pronouns alone — *ego*, *tu*, *nos*, *vos*, *te*, *se* all come back empty.
 * Without this list a translation containing "I" or "you" would be flagged as
 * not being Latin, which is the opposite of helpful.
 */
const UNPARSED_BUT_LATIN = new Set([
  'ego', 'tu', 'nos', 'vos', 'te', 'se', 'quae', 'mei', 'tui', 'sui', 'nostri', 'vestri',
  'mihi', 'tibi', 'sibi', 'nobis', 'vobis', 'mecum', 'tecum', 'secum', 'nobiscum', 'vobiscum',
]);

/** Nouns that end in s without being plural, so "the glass" is not "glasses". */
const FALSE_PLURALS = /(?:ss|us|is|as|os)$/i;
const IRREGULAR_PLURALS = /^(?:men|women|children|feet|teeth|mice|geese|people|oxen)$/i;

/**
 * Whether the English head noun is singular or plural.
 *
 * The head is what comes before "of" — in "the dog of the girl" it is the dog,
 * not the girl — and its number is the number the Latin nominative has to be
 * in. Without this, *boy* comes back as *pueri*: nominative, but plural.
 */
export function expectedNumber(source) {
  const head = String(source).trim().split(/\s+of\s+/i)[0]
    .replace(/^(?:the|a|an)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .at(-1) ?? '';

  if (IRREGULAR_PLURALS.test(head)) return 'plural';
  if (/s$/i.test(head) && !FALSE_PLURALS.test(head)) return 'plural';
  return 'singular';
}

/** Split a Latin sentence into words, keeping what sat between them. */
function tokenise(text) {
  return String(text).split(/(\s+|[^\p{L}\s]+)/u).filter((piece) => piece !== '');
}

const isWord = (piece) => /^\p{L}+$/u.test(piece);

/**
 * Parse every Latin word of a translation.
 * @returns {Promise<Array<{word, known, readings: Array}>>}
 */
export async function parseLatin(text, expectations = new Map()) {
  const words = [...new Set(tokenise(text).filter(isWord))];

  const parsed = await Promise.all(words.map(async (word) => {
    const analyses = await analyse(word).catch(() => null);
    if (analyses === null) return { word, known: true, unchecked: true, readings: [] };
    return {
      word,
      known: analyses.length > 0,
      readings: analyses.slice(0, 3).map((analysis) => ({
        headword: analysis.headword,
        principalParts: analysis.principalParts,
        pos: analysis.pos,
        declension: analysis.declension,
        conjugation: analysis.conjugation,
        gender: analysis.gender,
        definition: analysis.definition,
        // Every way this form can be read — canem is only ever accusative
        // singular, but puellae is genitive, dative or nominative plural.
        parses: analysis.inflections.map((infl) => describeInflection(infl)).filter(Boolean),
        cases: [...new Set(analysis.inflections.map((infl) => infl.case).filter(Boolean))],
        numbers: [...new Set(analysis.inflections.map((infl) => infl.number).filter(Boolean))],
        // Case and number have to stay paired. *pueri* is genitive singular
        // and nominative plural; asking separately whether it has a nominative
        // and whether it has a singular says yes to both and means nothing.
        forms: analysis.inflections
          .filter((infl) => infl.case)
          .map((infl) => ({ case: infl.case, number: infl.number || 'singular' })),
      })),
    };
  }));

  // Where the sentence tells us what a word must be, lead with that reading.
  // *canis* is both "dog" and "you sing", and after correcting a head noun to
  // the nominative it would otherwise be shown as a verb.
  for (const entry of parsed) {
    const wanted = expectations.get(entry.word.toLowerCase());
    if (!wanted) continue;
    entry.readings.sort((a, b) => score(b, wanted) - score(a, wanted));
  }

  // Back into reading order, since the set above deduplicated them.
  const byWord = new Map(parsed.map((entry) => [entry.word, entry]));
  return tokenise(text).filter(isWord).map((word) => byWord.get(word)).filter(Boolean);
}

/** How well a reading matches what the sentence says the word has to be. */
function score(reading, wanted) {
  let points = 0;
  if (wanted.pos && reading.pos === wanted.pos) points += 2;
  if (wanted.case && reading.cases.includes(wanted.case)) points += 1;
  return points;
}

/** The nominative of a noun whose headword we have, in the number it is already in. */
/**
 * Check a translation, and correct the head noun's case where the English
 * source leaves no room for doubt.
 *
 * @returns {{text, parses, notes}} the translation as it should read, every
 *          word's parse, and a note for anything changed or unrecognised.
 */
export async function checkLatin(source, translated) {
  const expectations = new Map();
  const parses = await parseLatin(translated);
  const notes = [];

  let text = translated;

  /**
   * The head noun's case is no longer overruled.
   *
   * This used to rewrite the first noun into the nominative whenever the
   * English looked like a bare noun phrase, and "looked like" meant "contains
   * none of the verbs on a hand written list". No such list is ever complete:
   * *help* and *save* were not on it, so "help me save the queen" read as
   * verbless and the correct *reginam*, accusative and the object of the
   * sentence, was corrected into *regina*. The reading that was right got
   * overruled by the one that was guessed.
   *
   * A check that cannot tell "the queen" from "help me save the queen" has no
   * business rewriting either. What is left below still reports what it sees,
   * which was always the useful half.
   */

  const unknown = parses.filter((entry) => !entry.known && !entry.unchecked
    && !UNPARSED_BUT_LATIN.has(entry.word.toLowerCase()));
  for (const entry of unknown) {
    notes.push({
      kind: 'unknown',
      from: entry.word,
      why: `The dictionary does not recognise “${entry.word}”. It may not be Latin.`,
    });
  }

  /**
   * A word Whitaker's does not know, sitting in the English that was asked
   * about, is not a doubtful reading — it is a word the engine gave up on and
   * copied across. "the boy praises the farmer" coming back as "puella complens
   * the Farmer" is not a translation, and a study aid must not present it as
   * one: this is the page where a student decides what to write down.
   */
  const englishWords = new Set(String(source ?? '').toLowerCase().match(/\p{L}+/gu) ?? []);
  const untranslated = unknown.filter((entry) => englishWords.has(entry.word.toLowerCase()));
  if (untranslated.length) {
    notes.push({
      kind: 'untranslated',
      from: untranslated.map((entry) => entry.word).join(', '),
      why: untranslated.length === 1
        ? `The engine left “${untranslated[0].word}” in English, so this is not a full translation. Trust the words below, not the sentence.`
        : `The engine left ${untranslated.length} words in English: ${untranslated.map((e) => `“${e.word}”`).join(', ')} — so this is not a full translation. Trust the words below, not the sentence.`,
    });
  }

  // Re-parse if anything was changed, so the page shows the corrected forms.
  const finalParses = text === translated ? parses : await parseLatin(text, expectations);

  return { text, parses: finalParses, notes, reliable: untranslated.length === 0 };
}
