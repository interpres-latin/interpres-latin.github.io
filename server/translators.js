/**
 * Translation engines, none of which is a language model.
 *
 * Latin is answered by this site or not at all.
 *
 * The free engines this file used to carry — Lingva, MyMemory, Apertium and
 * DeepL — are gone with the Spanish and French sides they were built for. None
 * of them can do Latin, and one of them was worse than useless: asked for
 * Latin, MyMemory returns *Malagasy*. "…the First World War hero who died in
 * the Cuban Missile Crisis" came back as "…maherifo Worlde, izay maty tao
 * amin'ny Krizin'ny Balafomanga Kiobana" — a real translation into a language
 * nobody asked for, wearing enough Latin to pass a glance.
 *
 * What is left is procedural from end to end, and tried in order:
 *
 *   0. Wikipedia   for names and titles. Machine translation renders them
 *                  literally, and its cross-language links hold the established
 *                  name instead. Looking up what Latin actually calls a thing
 *                  is not a guess.
 *   1. the rules   the site's own grammar — see latin-translate.js.
 *   2. the gloss   dictionary forms in Latin word order going in, and a
 *                  word-by-word decoding coming out. Neither claims a grammar,
 *                  so neither can be wrong about one.
 */

import { USER_AGENT } from './throttle.js';
import {
  latinRules, englishToLatinGloss, englishToLatinSentence,
  latinToEnglishGloss, latinToEnglishSentence, LATIN_RULES_ENGINE,
} from './latin-translate.js';
import { latinToEnglishParse } from './latin-parse.js';

const WIKIPEDIA = (lang) => `https://${lang}.wikipedia.org/w/api.php`;

const normalise = (text) => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Split on sentence boundaries so each piece still reads as a sentence. */
export function chunk(text, size) {
  const parts = [];
  let rest = text;
  while (rest.length > size) {
    const window = rest.slice(0, size);
    let cut = Math.max(
      window.lastIndexOf('. '), window.lastIndexOf('\n'),
      window.lastIndexOf('! '), window.lastIndexOf('? '),
    );
    if (cut < size * 0.4) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = size;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1);
  }
  if (rest.trim()) parts.push(rest.trim());
  return parts;
}

async function translateChunks(text, size, translateOne) {
  const out = [];
  for (const part of chunk(text, size)) out.push(await translateOne(part));
  return out.join(' ');
}

// ---------------------------------------------------------------------------

/**
 * A phrase worth asking Wikipedia about: several words, but not prose.
 * Sentence punctuation inside the text means it is a sentence, not a title;
 * a single word is left to the ordinary engines, since the encyclopedia's
 * article for a common noun is often about the wrong thing.
 */
function looksLikeAName(text) {
  const trimmed = text.trim();
  if (trimmed.length > 80) return false;
  // A title does not end in a full stop, and does not contain sentence punctuation.
  if (/[.!?;:,]/.test(trimmed)) return false;
  if (/\n/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 8;
}

/**
 * Words a name does not begin or end with. Trims the candidate list sharply.
 *
 * The pronouns and the rest of "to be" are here for a reason worth writing
 * down: *am* was missing while *is*, *are*, *was* and *were* were present, and
 * Wikipedia has an article called "I Am". So every sentence a student is most
 * likely to write — "I am tired", "I am a student" — came back as "I Am
 * fatigué", the two commonest words in English restored as the title of an
 * album.
 */
const EDGE_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'from', 'by', 'with',
  'was', 'were', 'is', 'are', 'am', 'be', 'been', 'being', 'has', 'have', 'had', 'that',
  'this', 'these', 'those', 'it', 'as', 'do', 'does', 'did', 'not', 'no', 'so', 'very',
  'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'y', 'o', 'en', 'con',
  'por', 'para', 'que', 'fue', 'era', 'es', 'son', 'ser', 'muy', 'su', 'sus', 'se', 'al', 'lo',
  'yo', 'tu', 'él', 'ella', 'nosotros', 'ellos', 'estoy', 'soy', 'eres', 'está', 'están',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'suis', 'est', 'sont', 'les',
  'des', 'du', 'et', 'ou', 'ne', 'pas', 'mon', 'ma', 'mes', 'son', 'sa', 'ses', 'ce', 'cette',
]);

/**
 * A name has to contain something that is not an everyday word.
 *
 * Guarding only the edges is not enough — it stops "I am tired" but not "am I
 * tired", and the failure is the same either way. A span made entirely of words
 * this common is a sentence fragment, whatever Wikipedia may also happen to
 * call an album.
 */
export function allEverydayWords(span) {
  const words = span.toLowerCase().match(/[\p{L}\p{N}'’-]+/gu) ?? [];
  return words.length > 0 && words.every((word) => EDGE_WORDS.has(word));
}

const LEADING_ARTICLE = /^(?:the|a|an|el|la|los|las|un|una)\s+/i;

const MIN_NAME_WORDS = 2;
const MAX_NAME_WORDS = 5;
const MAX_CANDIDATES = 45;   // one Wikipedia request holds 50 titles
const MAX_NAMES = 3;

/**
 * Every phrase in the text that could be a name.
 *
 * Capitalisation is not required: a student types "the cuban missile crisis"
 * in lower case and still deserves the real name back. Instead every span of
 * two to five words is a candidate, minus those starting or ending on a
 * function word, and the encyclopedia decides which are real — all of them in
 * a single request.
 */
function nameCandidates(text) {
  const words = [...text.matchAll(/[\p{L}\p{N}''-]+/gu)];
  const spans = [];

  for (let size = MAX_NAME_WORDS; size >= MIN_NAME_WORDS; size -= 1) {
    for (let i = 0; i + size <= words.length; i += 1) {
      const first = words[i];
      const last = words[i + size - 1];
      if (EDGE_WORDS.has(first[0].toLowerCase())) continue;
      if (EDGE_WORDS.has(last[0].toLowerCase())) continue;
      const span = text.slice(first.index, last.index + last[0].length);
      if (allEverydayWords(span)) continue;
      spans.push(span);
    }
  }

  return [...new Set(spans)].slice(0, MAX_CANDIDATES);
}

/**
 * Ask Wikipedia which of these phrases are articles, and what each is called in
 * the other language — in one request rather than one per phrase.
 * @returns {Promise<Map<string, string>>} phrase as written → established name
 */
/**
 * The same lookup, but reporting the names Wikipedia knows *and has no name for
 * in the other language*.
 *
 * `officialNames` drops those, correctly — there is nothing to substitute. A
 * glossary wants them anyway: Latin Wikipedia has an article on the First World
 * War and none on the Cuban Missile Crisis, and "there is no Latin name for
 * this" is a fact about Latin worth telling a reader, where "cuban — ?" is only
 * a fact about our vocabulary list.
 *
 * @returns {Promise<Map<string, string|null>>} phrase → name, or null if the
 *          article exists and the other language has no version of it
 */
async function namesAndGaps(phrases, from, to) {
  return officialNames(phrases, from, to, { keepGaps: true });
}

async function officialNames(phrases, from, to, { keepGaps = false } = {}) {
  const found = new Map();
  if (!phrases.length) return found;

  const url = new URL(WIKIPEDIA(from));
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', phrases.join('|'));
  url.searchParams.set('prop', 'langlinks');
  url.searchParams.set('lllang', to);
  url.searchParams.set('redirects', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return found;

  const query = (await response.json())?.query;
  if (!query) return found;

  // A title travels query -> normalised -> redirect before naming a page, and
  // the answer has to be traced back to the phrase the reader actually wrote.
  const step = (pairs) => new Map((pairs || []).map((pair) => [pair.from, pair.to]));
  const normalised = step(query.normalized);
  const redirected = step(query.redirects);

  const pages = new Map();
  for (const page of Object.values(query.pages || {})) {
    // A missing page is not a name at all; a page with no langlink is a name
    // the other language has never given itself a word for.
    if (page?.missing !== undefined) continue;
    if (!isProperName(page.title)) continue;
    pages.set(page.title, page?.langlinks?.[0]?.['*'] ?? null);
  }

  for (const phrase of phrases) {
    const resolved = redirected.get(normalised.get(phrase) ?? phrase)
      ?? normalised.get(phrase) ?? phrase;
    if (!pages.has(resolved)) continue;
    const link = pages.get(resolved);
    if (link || keepGaps) found.set(phrase, link);
  }

  return found;
}

/**
 * Wikipedia capitalises a title only where the words are proper nouns, so the
 * title itself says whether an article names something. "Cuban Missile Crisis"
 * and "Statue of Liberty" do; "Social studies" and "Train station" do not —
 * and without this check "history class" is an article too, and a sentence
 * about one comes back talking about social studies.
 */
function isProperName(title) {
  return (String(title).match(/\b\p{Lu}[\p{L}]*/gu) || []).length >= 2;
}

/** One phrase, for the whole-input path. */
async function officialName(phrase, from, to) {
  const found = await officialNames([phrase], from, to);
  return found.get(phrase) ?? null;
}

/** Replace `find` in `text`, keeping the capitalisation that was already there. */
function substitute(text, find, replacement) {
  const pattern = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return text.replace(pattern, (match) => (
    /^\p{Ll}/u.test(match) ? replacement.charAt(0).toLowerCase() + replacement.slice(1) : replacement
  ));
}

/** Drop names contained inside a longer one that also matched. */
function longestFirst(names) {
  const kept = [];
  for (const phrase of [...names.keys()].sort((a, b) => b.length - a.length)) {
    if (kept.some((existing) => normalise(existing).includes(normalise(phrase)))) continue;
    kept.push(phrase);
    if (kept.length >= MAX_NAMES) break;
  }
  return kept;
}

/**
 * Put the established names back into a finished translation.
 *
 * A translator renders a name literally wherever it appears, so "The Cuban
 * Missile Crisis was a serious event" becomes "La crisis de los misiles
 * cubanos fue…" — the wrong name, now buried in a sentence where the
 * whole-input lookup cannot see it. Each name is looked up, translated on its
 * own to learn how this engine renders it, and that rendering swapped for the
 * real name.
 */
async function restoreNames(source, translated, from, to, translateSpan) {
  const names = await officialNames(nameCandidates(source), from, to);
  if (!names.size) return translated;

  let result = translated;
  for (const phrase of longestFirst(names)) {
    const official = names.get(phrase);
    const literal = await translateSpan(phrase).catch(() => null);
    if (!literal || normalise(literal) === normalise(official)) continue;
    result = substitute(result, literal, official);
  }
  return result;
}

/**
 * The established name, rather than a literal rendering of one.
 * Falls through silently when the phrase is not an article title.
 */
async function namedEntity(text, from, to) {
  // Tested before anything is stripped: trimming a trailing full stop first
  // would let a sentence through the very gate meant to catch it.
  if (!looksLikeAName(text)) throw new Error('not a name');

  // The same guard the in-sentence search uses. Wikipedia has an article called
  // "I Am", and without this a whole input of ordinary words could be answered
  // with a title instead of a translation.
  if (allEverydayWords(text)) throw new Error('a common phrase, not a name');

  const phrase = text.trim().replace(/[¿¡]/g, '');

  const link = await officialName(phrase, from, to);
  if (!link) throw new Error('no article');
  return { text: link, engine: 'Wikipedia' };
}

/**
 * Wikipedia first, because an established name is not a guess.
 *
 * Then the two checked sentence routes, and only then the site's own grammar.
 * That order is the other way round from how it started, and it changed for a
 * measured reason: the rules translator answers *confidently* on sentences it
 * cannot really do, and an engine that answers is an engine that stops the
 * chain. "Sometimes life is a horrible time" came back as *interda dira vita
 * tempus est* — the rules engine had produced it, so the model was never asked.
 *
 * The grammar engine is not gone and is not idle: it still answers whenever
 * there is no model configured, and it is what the conjugator, the decliner and
 * the tutor are built on. It is simply no longer in front of something better.
 *
 * The glossaries stay at the bottom, where they are the honest last word: a
 * list of dictionary forms is less than a translation and worth more, because
 * it is true.
 */
/**
 * Latin into English has one engine and no fallback.
 *
 * The parser either reads the sentence or it does not, and when it does not the
 * translation fails and says so. There is deliberately nothing underneath it:
 * a model route and a word list sitting below meant that a parse failure was
 * invisible, answered by something worse, and never fixed. A reader who wants
 * the model asks for it, and that is a separate request. See the re-translate
 * button in public/js/views/home.js.
 *
 * English into Latin still has its chain, which is a different problem and is
 * not what the parser does.
 */
const OUT_OF_LATIN = [namedEntity, latinToEnglishParse];
const INTO_LATIN = [namedEntity, englishToLatinSentence, latinRules, englishToLatinGloss];

const enginesFor = (from) => (from === 'la' ? OUT_OF_LATIN : INTO_LATIN);

export async function translate(text, from, to) {
  const failures = [];

  for (const engine of enginesFor(from)) {
    try {
      const result = await engine(text, from, to);
      if (!result.text.trim()) continue;

      // Wikipedia already answers with the established name; the translators
      // need the names put back afterwards.
      if (engine === namedEntity) return { ...result, notes: [] };

      /**
       * An assembled sentence is finished when it arrives.
       *
       * Name restoration below would re-run the engine once per candidate span
       * to learn how it renders each — which for this engine means a pair of
       * model calls per name, to repair a sentence a model has already written
       * with the names in it.
       */
      // A parsed sentence is finished when it arrives, like an assembled one.
      if (result.parsed || result.assembled) {
        return {
          ...result,
          text: result.text.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim(),
          notes: [],
          unsure: [],
          uncertain: result.reading?.confidence !== 'agreed',
          uncertainWhy: result.reading?.confidence === 'differs' ? 'readingsDiffer'
            : (result.reading?.confidence === 'partial' ? 'readingsPartial' : null),
        };
      }

      /**
       * A gloss is a list of words, not a sentence, so names are not spliced
       * into it — they are listed at the front, whole.
       *
       * Splitting "the Cuban Missile Crisis" into its words and glossing them
       * one at a time is exactly the wrong thing to do with a name, and it is
       * what produced "cuban — ?". Wikipedia knows what Latin calls the First
       * World War; where it knows nothing, the name is still kept together and
       * said to have no Latin form, which is a fact about Latin rather than a
       * failure of the lookup.
       */
      if (result.wordByWord) {
        /**
         * Only phrases written as names get looked up as names.
         *
         * Wikipedia has an article called "How Much More", so "how much more
         * can this cost" was answered with "how much more — (no Latin name)".
         * An article existing does not make a phrase a name; being written like
         * one does, and in English that means capitals.
         */
        const looksNamed = (phrase) => /^\p{Lu}/u.test(phrase)
          && phrase.split(/\s+/).every((word) => /^[\p{Lu}\d]/u.test(word) || EDGE_WORDS.has(word.toLowerCase()));

        const named = from === 'en'
          ? await namesAndGaps(nameCandidates(text).filter(looksNamed), from, to).catch(() => new Map())
          : new Map();

        // Longest first, and nothing contained inside a longer one: "World War
        // hero" is not a second name just because "First World War" is one.
        const kept = [];
        for (const phrase of [...named.keys()].sort((a, b) => b.length - a.length)) {
          if (kept.some((longer) => normalise(longer).includes(normalise(phrase)))) continue;
          kept.push(phrase);
        }

        const heads = kept.map((phrase) => `${phrase}: ${named.get(phrase) ?? '(no Latin name)'}`);
        const body = [...heads, result.text].filter(Boolean).join(' · ');

        return { ...result, text: body.trim(), notes: [], uncertainWhy: 'wordByWord' };
      }

      const translateSpan = async (span) => (await engine(span, from, to)).text;

      const named = await restoreNames(text, result.text, from, to, translateSpan)
        .catch(() => result.text);

      // Engines and substitutions both leave stray spacing behind; a reader
      // should never see the seam.
      const tidied = named.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
      // Only the words still standing in the finished text are worth marking:
      // a name is put back after the engine ran, and may well have replaced the
      // very word the gloss gave up on.
      const stillThere = (result.unsure ?? []).filter((word) => new RegExp(
        `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'iu',
      ).test(tidied));

      /**
       * Latin from anywhere but our own grammar is a guess, and says so.
       *
       * The word-level check cannot catch a sentence that is wrong as a whole:
       * every word can be real Latin and still not mean what was asked, so
       * nothing looks wrong. Anything the rules engine did not build is
       * therefore marked uncertain whatever it looks like.
       */
      const guessedLatin = (to === 'la' || from === 'la')
        && result.engine !== LATIN_RULES_ENGINE;

      // A gloss is never a sentence, and must not be read as one.
      const why = result.wordByWord ? 'wordByWord' : (guessedLatin ? 'latin' : (result.uncertain ? 'memory' : null));

      return {
        ...result,
        text: tidied,
        notes: [],
        unsure: stillThere,
        uncertain: result.uncertain === true || guessedLatin || result.wordByWord === true,
        uncertainWhy: why,
      };
    } catch (error) {
      failures.push(error.message);
    }
  }


  const error = new Error(`No translation engine answered. ${failures.join(' · ')}`);
  error.status = 502;
  throw error;
}
