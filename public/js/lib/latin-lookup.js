/**
 * Working out what a Latin word is before declining it.
 *
 * A noun is quoted with its genitive because the genitive is what carries the
 * declension and the stem — but a reader does not always have it to hand, and
 * typing *puella* on its own is a perfectly reasonable thing to do. So the
 * dictionary is asked, and it supplies the missing part.
 *
 * The same lookup catches a wrong one. *puer, pueris* is not a word: puer's
 * genitive is *pueri*, and declining the second declension noun as though it
 * were third would produce a whole table of forms that do not exist. Better to
 * refuse and say what the genitive actually is.
 */

import { getJson } from './dom.js';
import { parseParts } from './decliner-la.js';

/** The noun and adjective readings Whitaker's has for a word. */
async function readings(lemma) {
  const data = await getJson(`/api/dictionary?word=${encodeURIComponent(lemma)}&study=la`)
    .catch(() => null);
  return data?.entries?.[0]?.senses ?? [];
}

/** The genitive out of a headword like "puella, puellae" or "rex, regis". */
function genitiveOf(sense) {
  const parts = sense.principalParts ?? parseParts(sense.headword ?? '');
  return parts[1] ?? '';
}

/**
 * The declinable part of a Whitaker adjective headword.
 *
 * Whitaker's quotes the comparative and superlative too, and compresses the
 * base forms:
 *
 *   bonus, bona -um, melior -or -us, optimus -a -um   ->  bonus, bona, bonum
 *   acer, acris -e, acrior -or -us, acerrimus -a -um  ->  acer, acris, acre
 *   fortis, forte, fortior -or -us, fortissimus       ->  fortis, forte
 *   ingens, ingentis (gen.), ingentior -or -us        ->  ingens, ingentis
 *
 * Taken whole, the decliner reads *ingentior* as the neuter nominative.
 */
export function adjectiveBaseParts(headword) {
  const out = [];

  for (const segment of String(headword).split(',').map((part) => part.trim())) {
    // The comparative is where the base forms stop, and it always offers -or.
    if (/\s-or\b/.test(segment)) break;

    const [first, ...rest] = segment.split(/\s+/);
    const word = first.replace(/[^a-z]/gi, '').toLowerCase();
    if (!word) continue;
    out.push(word);

    // "bona -um" carries the neuter as an ending on the same segment.
    for (const piece of rest) {
      if (!piece.startsWith('-')) continue;
      const ending = piece.replace(/[^a-z]/gi, '').toLowerCase();
      if (!ending) continue;
      out.push(word.replace(/(?:us|um|is|a|e)$/, '') + ending);
    }
  }

  return out;
}

/** A noun reading only describes the word if its nominative is the word. */
const nominativeMatches = (sense, lemma) => {
  const parts = sense.principalParts ?? parseParts(sense.headword ?? '');
  return (parts[0] ?? '').toLowerCase() === lemma.toLowerCase();
};

/**
 * Settle what a reader typed into something declinable.
 *
 * @returns {Promise<{ok: boolean, parts?: string[], gender?: string,
 *                    kind?: string, error?: string, expected?: string}>}
 */
export async function resolveLatinWord(input) {
  const parts = parseParts(input);
  if (!parts.length) return { ok: false, error: 'empty' };

  // Three parts can only be an adjective, and it carries its own genders.
  if (parts.length >= 3) return { ok: true, parts, kind: 'adjective', gender: '' };

  const senses = await readings(parts[0]);
  // *fortis* is listed as a noun, but only as the genitive of *fors* — it does
  // not describe the word that was typed, so it must not be used to judge it.
  const noun = senses.find((sense) => sense.category === 'noun' && nominativeMatches(sense, parts[0]));
  const adjective = senses.find((sense) => sense.category === 'adjective');

  // Nothing known: take the reader at their word if they gave two parts, and
  // admit defeat if they gave one, since there is nothing to complete it with.
  if (!noun && !adjective) {
    return parts.length >= 2
      ? { ok: true, parts, kind: '', gender: '' }
      : { ok: false, error: 'unknown' };
  }

  if (parts.length === 1) {
    const full = noun
      ? (noun.principalParts ?? parseParts(noun.headword ?? ''))
      : adjectiveBaseParts(adjective.headword ?? '');
    if (full.length < 2) return { ok: false, error: 'unknown' };
    return {
      ok: true,
      parts: full,
      kind: noun ? 'noun' : 'adjective',
      gender: noun ? (noun.gender || '') : '',
      completed: true,
    };
  }

  // Two parts given: check the second against what the dictionary has. An
  // adjective quoting its neuter (fortis, forte) is not quoting a genitive, so
  // only a noun is checked this way.
  if (noun) {
    const expected = genitiveOf(noun);
    if (expected && expected.toLowerCase() !== parts[1].toLowerCase()) {
      // The word may be an adjective the reader quoted correctly, in which case
      // the noun reading is the wrong one to judge it by — and the answer is an
      // adjective table, not a rejection.
      const adjectiveParts = adjective ? adjectiveBaseParts(adjective.headword ?? '') : [];
      if (adjectiveParts.some((part) => part.toLowerCase() === parts[1].toLowerCase())) {
        return { ok: true, parts, kind: 'adjective', gender: '' };
      }
      return { ok: false, error: 'wrong-genitive', expected, lemma: parts[0] };
    }
    return { ok: true, parts, kind: 'noun', gender: noun.gender || '' };
  }

  return { ok: true, parts, kind: 'adjective', gender: '' };
}
