/**
 * Finding the word someone meant when they left the accents off.
 *
 * Students type *jamon*, and *jamón* is what the dictionary has. Neither the
 * RAE nor the Wiktionnaire will match without the accent, so a perfectly
 * ordinary vocabulary question came back as "not found" and went to a language
 * model instead — spending one of the reader's free questions to be told
 * something the dictionary knew all along.
 *
 * The rule is deliberately narrow. It only runs when the word as typed was
 * **not found at all**, and it only accepts a candidate that is the same word
 * once accents are stripped. So *bebe* is never quietly turned into *bebé* —
 * both are words, so the first lookup succeeds and this never runs — and
 * *jamon* is never turned into *jabón*, which is a different word rather than
 * the same one spelled carelessly.
 */

/** Lowercase, and with every diacritic removed. */
export const foldAccents = (text) => String(text ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

/** Whether a word actually carries an accent, as opposed to merely differing in case. */
const hasDiacritic = (word) => foldAccents(word) !== String(word).toLowerCase();

/**
 * The candidate that is the typed word with its accents put back, or null.
 *
 * Case-insensitive, because a suggestion list will happily offer "Ecole"
 * alongside "école" and only one of them is the answer.
 */
export function accentedForm(typed, candidates) {
  const target = foldAccents(typed);
  if (!target) return null;

  return (candidates ?? [])
    .map((candidate) => String(candidate ?? '').trim())
    .find((candidate) => candidate
      && foldAccents(candidate) === target
      && hasDiacritic(candidate)) ?? null;
}
