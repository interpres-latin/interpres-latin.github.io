/**
 * Which word it is, decided from the sentence it is in.
 *
 * The morphology service this site runs on answers one word at a time, and a
 * Latin word out of context is routinely several words. *veni* is the perfect
 * of *venio*, "I came" — and also the genitive of *venum*, "sale". Asked in
 * isolation there is no way to tell, so the gloss ranked the readings by a
 * fixed rule — a noun before a verb, unless the word stands last — and got
 * *veni vidi vici* as "sale, I saw, I conquered".
 *
 * No amount of ranking fixes that, because the information needed is not in the
 * word. It is in the sentence.
 *
 * UDPipe is a parser trained on annotated Latin corpora, and it reads the whole
 * sentence: it returns *veni* as the first person singular perfect of *venio*
 * because of what stands around it. It is free, public, needs no key, and is
 * run by the Institute of Formal and Applied Linguistics at Charles University,
 * which maintains the Universal Dependencies treebanks.
 *
 * It is used to *choose*, not to define. Whitaker's still says what a word
 * means and what its principal parts are; this says which of Whitaker's
 * readings the sentence is actually using. Where the two disagree about whether
 * a word exists, Whitaker's wins, because a lemma with no dictionary entry is
 * no use to a reader.
 *
 * A failure here is not an error. Nothing waits on it and nothing breaks
 * without it: the old ranking is still there, and it is what runs when this is
 * unreachable, slow, or does not recognise the word.
 */

import { throttle, USER_AGENT } from './throttle.js';

const ENDPOINT = 'https://lindat.mff.cuni.cz/services/udpipe/api/process';

/**
 * Perseus is the classical treebank — Caesar, Cicero, Virgil, Ovid — so it is
 * the one trained on the Latin this site is for. The others are medieval
 * (ITTB, Aquinas) and biblical (PROIEL).
 */
const MODEL = process.env.UDPIPE_MODEL || 'latin-perseus';

const TIMEOUT_MS = 9000;
const MAX_CHARS = 900;

const cache = new Map();
const CACHE_MAX = 400;

/** Macrons off and the letters Latin editions disagree about settled. */
const fold = (word) => String(word ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/j/g, 'i')
  .replace(/v/g, 'u');

/**
 * @returns {Promise<Array<{form: string, lemma: string, upos: string, feats: string}>>}
 *          in the order the words appear, or [] if the parser could not be had.
 */
export async function tagLatin(text) {
  const sentence = String(text ?? '').trim().slice(0, MAX_CHARS);
  if (!sentence) return [];

  const key = fold(sentence);
  if (cache.has(key)) return cache.get(key);

  let tagged = [];
  try {
    const body = new URLSearchParams({
      data: sentence, model: MODEL, tokenizer: '', tagger: '',
    });

    const response = await throttle('udpipe', 250, () => fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
        'user-agent': USER_AGENT,
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }));
    if (!response.ok) throw new Error(`UDPipe responded ${response.status}`);

    const payload = await response.json();
    // CoNLL-U: one token per line, tab separated, comments start with #.
    for (const line of String(payload.result ?? '').split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const columns = line.split('\t');
      // A multiword range is written "3-4" and repeats its parts below it.
      if (columns.length < 6 || columns[0].includes('-')) continue;
      if (columns[3] === 'PUNCT') continue;
      tagged.push({
        form: columns[1], lemma: columns[2], upos: columns[3], feats: columns[5],
      });
    }
  } catch {
    // Unreachable, slow, or unhappy. The caller has its own ranking.
    tagged = [];
  }

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, tagged);
  return tagged;
}

/**
 * The parser's reading of one word of a sentence, by position.
 *
 * Matched on position and confirmed on spelling rather than by looking the word
 * up: a sentence can use the same word twice in two different cases, and *me*
 * in *quod me nutrit me destruit* is the same spelling doing the same job only
 * by coincidence.
 */
export function readingAt(tagged, index, word) {
  const at = tagged[index];
  if (!at) return null;
  // The tokeniser may split differently — enclitics especially — so a mismatch
  // means the positions have drifted and nothing here can be trusted for it.
  if (fold(at.form) !== fold(word)) return null;
  return at;
}

/** The Universal Dependencies tag, in the words this site uses elsewhere. */
export const UPOS_TO_POS = {
  NOUN: 'noun', PROPN: 'noun', VERB: 'verb', AUX: 'verb', ADJ: 'adjective',
  ADV: 'adverb', PRON: 'pronoun', DET: 'pronoun', ADP: 'preposition',
  CCONJ: 'conjunction', SCONJ: 'conjunction', NUM: 'numeral', INTJ: 'interjection',
};
