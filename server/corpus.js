/**
 * Example sentences and English glosses, from corpora rather than a model.
 *
 * Asking a frontier model to write one short sentence is absurd on its face,
 * and on a free tier it is also the thing that runs the quota down. Both of
 * these are free, unmetered, and better suited to the job:
 *
 *   Tatoeba    real sentences written by native speakers, already paired with
 *              English translations. CC BY.
 *   Wiktionary English definitions of a foreign word. CC BY-SA.
 *
 * A model is only asked when both come back empty.
 *
 * Both are asked for whichever language the site is currently about, so the
 * sentence in a result is keyed `text` rather than by a language code.
 */

import { throttle, USER_AGENT } from './throttle.js';

/** Tatoeba and Wiktionary disagree about language codes; this is the bridge. */
const CORPUS_LANGUAGES = {
  es: { tatoeba: 'spa', wiktionary: 'es' },
  fr: { tatoeba: 'fra', wiktionary: 'fr' },
  la: { tatoeba: 'lat', wiktionary: 'la' },
};

const TATOEBA = 'https://tatoeba.org/en/api_v0/search';
const WIKTIONARY = 'https://en.wiktionary.org/api/rest_v1/page/definition';

const fold = (text) => String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const CACHE_TTL = 1000 * 60 * 60 * 24;
const cache = new Map();

function cached(key, produce) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value;
  const value = produce().catch(() => null);
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Sentences a learner can actually read: short, and not all caps or fragments. */
function usable(text) {
  return text.length >= 12 && text.length <= 110 && /[.!?…]$/.test(text.trim());
}

/**
 * Real sentences using the word, with their English translations.
 * @returns {Promise<Array<{text: string, en: string}>|null>}
 */
export function tatoebaExamples(word, limit = 2, language = 'es') {
  const codes = CORPUS_LANGUAGES[language] ?? CORPUS_LANGUAGES.es;
  return cached(`tatoeba:${language}:${word}`, async () => {
    const url = `${TATOEBA}?from=${codes.tatoeba}&to=eng&query=${encodeURIComponent(word)}&sort=relevance`;
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;

    const body = await response.json();
    const found = [];

    for (const sentence of body.results || []) {
      const source = String(sentence.text || '').trim();
      if (!source) continue;

      const english = (sentence.translations || [])
        .flat()
        .find((item) => item.lang === 'eng' && item.text);
      if (!english) continue;

      found.push({ text: source, en: String(english.text).trim() });
    }

    // Prefer sentences that actually contain the word — Tatoeba's search also
    // returns relatives, so "madrugar" can come back with "madrugador" — then
    // the ones a beginner can hold in their head.
    const needle = fold(word);
    const contains = (item) => new RegExp(`\\b${needle}`, 'i').test(fold(item.text));

    const ranked = found.sort((a, b) => {
      const byMatch = Number(contains(b)) - Number(contains(a));
      if (byMatch) return byMatch;
      const byReadable = Number(usable(b.text)) - Number(usable(a.text));
      if (byReadable) return byReadable;
      return a.text.length - b.text.length;
    });
    return ranked.slice(0, limit);
  });
}

function stripMarkup(html) {
  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A short English gloss for a word in the language the site is about.
 * @returns {Promise<string[]|null>}
 */
export function wiktionaryGloss(word, limit = 3, language = 'es') {
  const codes = CORPUS_LANGUAGES[language] ?? CORPUS_LANGUAGES.es;
  return cached(`wiktionary:${language}:${word}`, async () => {
    // Shares Wikimedia's limit with the Wiktionnaire, so it shares the queue.
    const response = await throttle('wikimedia', 180, () => fetch(`${WIKTIONARY}/${encodeURIComponent(word)}`, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(12000),
    }));
    if (!response.ok) return null;

    const body = await response.json();
    const glosses = [];

    for (const section of body[codes.wiktionary] || []) {
      for (const entry of section.definitions || []) {
        const text = stripMarkup(entry.definition);
        // Wiktionary carries bare form-of pointers; they are not definitions.
        if (!text || text.length < 3) continue;
        glosses.push(section.partOfSpeech ? `${text}` : text);
        if (glosses.length >= limit) return glosses;
      }
    }
    return glosses.length ? glosses : null;
  });
}

export const ATTRIBUTION = {
  tatoeba: { name: 'Tatoeba', url: 'https://tatoeba.org', licence: 'CC BY 2.0 FR' },
  wiktionary: { name: 'Wiktionary', url: 'https://en.wiktionary.org', licence: 'CC BY-SA' },
};
