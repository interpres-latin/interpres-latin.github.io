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

/** Words that mean the English source has a finite verb in it. */
const ENGLISH_VERBS = /\b(is|are|was|were|am|be|been|being|has|have|had|do|does|did|will|would|can|could|shall|should|may|might|must|says?|said|goes?|went|sees?|saw|loves?|loved|gives?|gave|takes?|took|makes?|made|comes?|came|wants?|carries|carried|calls?|called|walks?|walked|lives?|lived|works?|worked|writes?|wrote|reads?|read|hears?|heard|finds?|found|leads?|led|holds?|held|sends?|sent|fights?|fought|kills?|killed|praises?|praised|watches|watched|asks?|asked|replies|replied|shouts?|shouted|sits?|sat|stands?|stood|sleeps?|slept|drinks?|drank|eats?|ate|runs?|ran|builds?|built|conquers?|conquered)\b/i;

/** A bare noun phrase: no verb, so its head noun is nominative. */
function isVerblessPhrase(source) {
  const text = String(source).trim();
  if (!text || /[.!?;]/.test(text)) return false;
  if (text.split(/\s+/).length > 8) return false;
  return !ENGLISH_VERBS.test(text);
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
function nominativeOf(reading, number) {
  const parts = parseParts(reading.principalParts.join(', '));
  if (parts.length < 2) return null;
  const declined = declineNoun(parts[0], parts[1], reading.gender);
  if (!declined.ok) return null;
  return declined.table[number === 'plural' ? 'plural' : 'singular'].nominative ?? null;
}

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

  if (isVerblessPhrase(source)) {
    // The head of a verbless phrase is nominative. Find the first noun of the
    // Latin and see whether it is.
    const head = parses.find((entry) => entry.readings.some((r) => r.pos === 'noun'));
    if (head) {
      const nounReadings = head.readings.filter((r) => r.pos === 'noun');
      const alreadyRight = nounReadings.some((r) => r.cases.includes('nominative'));

      if (!alreadyRight) {
        const reading = nounReadings[0];
        const number = reading.numbers[0] ?? 'singular';
        const corrected = nominativeOf(reading, number);
        if (corrected && corrected.toLowerCase() !== head.word.toLowerCase()) {
          text = text.replace(new RegExp(`\\b${head.word}\\b`), corrected);
          expectations.set(corrected.toLowerCase(), { pos: 'noun', case: 'nominative' });
          notes.push({
            kind: 'case',
            from: head.word,
            to: corrected,
            why: `“${source.trim()}” has no verb, so its head noun is nominative. ${head.word} is ${nounReadings[0].parses[0] ?? 'not nominative'}.`,
          });
        }
      }
    }
  }

  const unknown = parses.filter((entry) => !entry.known && !entry.unchecked);
  for (const entry of unknown) {
    notes.push({
      kind: 'unknown',
      from: entry.word,
      why: `Whitaker’s Words does not recognise “${entry.word}” — it may not be Latin.`,
    });
  }

  // Re-parse if anything was changed, so the page shows the corrected forms.
  const finalParses = text === translated ? parses : await parseLatin(text, expectations);

  return { text, parses: finalParses, notes };
}
