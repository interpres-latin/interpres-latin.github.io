/**
 * Translation engines, none of which is a language model.
 *
 * Tried in order until one gives an answer:
 *
 *   0. Wikipedia   for names and titles. Machine translation renders them
 *                  literally — "Cuban Missile Crisis" becomes "crisis de los
 *                  misiles cubanos", which says the missiles were Cuban when
 *                  they were Soviet. Wikipedia's cross-language links hold the
 *                  established name in each language instead.
 *   1. Lingva      a Google Translate front end. Best quality, free, no key —
 *                  but these are volunteer-run instances, so several are listed
 *                  and a dead one is simply skipped.
 *   2. MyMemory    a crowd translation memory. Real human translations, but its
 *                  segments can be wrong in ways no score exposes: "Buenos días,
 *                  ¿cómo estás?" comes back as "Good morning Najlaa how are
 *                  you?" at top confidence. Only believed when its candidates
 *                  agree with each other.
 *   3. Apertium    open-source rule-based translation. Clumsy — "It would like
 *                  me learn Spanish with you" — but always up and never invents
 *                  content, so it is a floor rather than a choice. It has no
 *                  English–French pair, so French translation has one engine
 *                  fewer beneath it and stops at MyMemory.
 *
 * Every engine takes the language pair as codes, so the whole chain works for
 * whichever language the site is currently about.
 */

/**
 * Lingva instances, tried in order.
 *
 * Volunteer-run, so this list ages, and most of it has now gone: of nineteen
 * instances once listed publicly, thirteen no longer resolve at all and two
 * (lingva.ml, lingva.garudalinux.org) sit behind a Cloudflare challenge that a
 * server cannot pass. Those are dropped — they cost a request and can never
 * answer.
 *
 * The two left are up and serving; it is Google refusing *them*, which is a
 * thing that passes. Keeping them here is what lets the site pick the service
 * back up on its own when it does.
 *
 * An entry may carry a scheme, which is how a self-hosted instance is pointed
 * at — `LINGVA_INSTANCES=http://localhost:3100`.
 */
const LINGVA_HOSTS = (process.env.LINGVA_INSTANCES || 'lingva.lunar.icu,translate.plausibility.cloud')
  .split(',').map((host) => host.trim()).filter(Boolean)
  .map((host) => (/^https?:\/\//.test(host) ? host : `https://${host}`));

/**
 * How long a host that just failed is passed over.
 *
 * Without this a dead instance is re-tried on every translation, and the
 * translator box fires on a debounce as you type — so one host being down cost
 * a timeout per keystroke-pause, several seconds each, before anything else was
 * even asked. Short enough that an instance having a bad minute is back in the
 * rotation quickly; long enough that a real outage costs one request, not one
 * per translation.
 */
const LINGVA_COOLDOWN_MS = 60_000;
const restingUntil = new Map();

/**
 * How long to wait for an instance.
 *
 * The default suits a public instance, which is either up or not. A
 * self-hosted one on a free tier spins down when idle and takes the better part
 * of a minute to wake, so a deployment that owns its own instance should raise
 * this — see LINGVA_TIMEOUT_MS in the README.
 */
const LINGVA_TIMEOUT_MS = Number(process.env.LINGVA_TIMEOUT_MS) || 12_000;


/**
 * Hosts worth asking now.
 *
 * Can be empty, and that is the point: when every instance is down — which is
 * the common case, not the rare one — Lingva steps aside immediately and the
 * chain falls through to the engines beneath it. Nothing is disabled
 * permanently; the cooldown expiring is what puts a host back.
 */
function hostsToTry() {
  const now = Date.now();
  return LINGVA_HOSTS.filter((host) => (restingUntil.get(host) ?? 0) <= now);
}

import { alreadyIdiomatic, findIdioms } from './idioms.js';
import { USER_AGENT } from './throttle.js';

const WIKIPEDIA = (lang) => `https://${lang}.wikipedia.org/w/api.php`;
const MYMEMORY = 'https://api.mymemory.translated.net/get';
const APERTIUM = 'https://apertium.org/apy/translate';

const LINGVA_CHUNK = 700;
const MYMEMORY_CHUNK = 450;

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

/** Words a name does not begin or end with. Trims the candidate list sharply. */
const EDGE_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'from', 'by', 'with',
  'was', 'were', 'is', 'are', 'be', 'been', 'has', 'have', 'had', 'that', 'this', 'it', 'as',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'y', 'o', 'en', 'con',
  'por', 'para', 'que', 'fue', 'era', 'es', 'son', 'ser', 'muy', 'su', 'sus', 'se', 'al', 'lo',
]);

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
      spans.push(text.slice(first.index, last.index + last[0].length));
    }
  }

  return [...new Set(spans)].slice(0, MAX_CANDIDATES);
}

/**
 * Ask Wikipedia which of these phrases are articles, and what each is called in
 * the other language — in one request rather than one per phrase.
 * @returns {Promise<Map<string, string>>} phrase as written → established name
 */
async function officialNames(phrases, from, to) {
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
    const link = page?.langlinks?.[0]?.['*'];
    if (link && isProperName(page.title)) pages.set(page.title, link);
  }

  for (const phrase of phrases) {
    const resolved = redirected.get(normalised.get(phrase) ?? phrase)
      ?? normalised.get(phrase) ?? phrase;
    const link = pages.get(resolved);
    if (link) found.set(phrase, link);
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
  return text.replace(pattern, (match) => (/^\p{Ll}/u.test(match)
    ? replacement.charAt(0).toLowerCase() + replacement.slice(1)
    : replacement));
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
  const phrase = text.trim().replace(/[¿¡]/g, '');

  const link = await officialName(phrase, from, to);
  if (!link) throw new Error('no article');
  return { text: link, engine: 'Wikipedia' };
}

async function lingva(text, from, to) {
  const hosts = hostsToTry();
  if (!hosts.length) throw new Error('Every Lingva instance is resting after a recent failure');

  let lastError = null;

  for (const host of hosts) {
    try {
      const translated = await translateChunks(text, LINGVA_CHUNK, async (part) => {
        const url = `${host}/api/v1/${from}/${to}/${encodeURIComponent(part)}`;
        const response = await fetch(url, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(LINGVA_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`${host} responded ${response.status}`);

        const body = await response.json();
        if (!body.translation) throw new Error(`${host} returned no translation`);
        return String(body.translation);
      });

      restingUntil.delete(host);
      return { text: translated, engine: 'Lingva' };
    } catch (error) {
      restingUntil.set(host, Date.now() + LINGVA_COOLDOWN_MS);
      lastError = error;
    }
  }

  throw lastError || new Error('No Lingva instance answered.');
}

/** Exposed for the tests, which need each case to start from a clean slate. */
export function resetLingvaCooldowns() {
  restingUntil.clear();
}

/**
 * MyMemory's own machine translation, which it returns under this name when no
 * stored human translation comes close to the sentence.
 */
const MYMEMORY_MT = 'MT!';

/**
 * Believed when the answer is MyMemory's own machine translation, or when two
 * stored translations agree.
 *
 * Agreement alone was the whole rule, and it was too strict to be useful. The
 * memory rarely holds the same sentence twice, so "le chien de la fille" — the
 * top candidate, and correct — was thrown out for sharing the page with "La
 * rumeur" and "Of the girl". Spanish only seemed to survive that because
 * Apertium answers after it; French and Latin have no Apertium pair and no
 * Lingva, so the veto left them with no translator at all.
 *
 * What separates the two cases is not the score — the score says how close the
 * *source* is to something stored, so the wrong translation of a well-known
 * sentence still scores 0.99. It is where the candidate came from. MyMemory
 * falls back to translating the sentence itself only when its memory has
 * nothing close, and marks that one MT!: a single engine's answer, with no
 * crowd to disagree with. Where a stored translation does match, there is no
 * MT! at all and the vote still decides — which is the "Good morning Najlaa how
 * are you?" case, three stored translations of one sentence with the wrong one
 * on top, and it is still refused.
 */
async function myMemory(text, from, to) {
  let confident = true;

  const translated = await translateChunks(text, MYMEMORY_CHUNK, async (part) => {
    const url = `${MYMEMORY}?q=${encodeURIComponent(part)}&langpair=${from}|${to}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`MyMemory responded ${response.status}`);

    const body = await response.json();
    if (body.responseStatus !== 200 || !body.responseData?.translatedText) {
      throw new Error(body.responseDetails || 'MyMemory returned no translation');
    }

    const matches = (body.matches || []).filter((match) => String(match.translation || ''));

    // Its own machine translation, offered because the memory had nothing
    // closer. Nothing to take a vote among.
    const machine = matches.find((match) => String(match['created-by']) === MYMEMORY_MT);
    if (machine) return String(machine.translation);

    const candidates = matches.map((match) => String(match.translation));
    const tally = new Map();
    for (const candidate of candidates) {
      const key = normalise(candidate);
      tally.set(key, (tally.get(key) || 0) + 1);
    }

    const [agreedKey, votes] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
    if (!(votes >= 2 || candidates.length <= 1)) confident = false;

    return candidates.find((candidate) => normalise(candidate) === agreedKey)
      || body.responseData.translatedText;
  });

  if (!confident) {
    // The best guess travels with the refusal. Nothing behind MyMemory can
    // translate French or Latin, so a doubtful answer is worth keeping as a
    // last resort — see translate().
    const doubt = new Error('MyMemory candidates disagreed');
    doubt.guess = translated;
    throw doubt;
  }
  return { text: translated, engine: 'MyMemory' };
}

/** Apertium's own codes, and the pairs it actually has installed. */
const APERTIUM_CODES = { es: 'spa', en: 'eng', fr: 'fra', la: 'lat' };
const APERTIUM_PAIRS = new Set(['spa|eng', 'eng|spa', 'spa|fra', 'fra|spa']);

async function apertium(text, from, to) {
  const pair = `${APERTIUM_CODES[from]}|${APERTIUM_CODES[to]}`;
  // Neither English–French nor English–Latin is one of them. Pivoting through
  // Spanish would double the damage of an engine that is already the floor, so
  // it simply declines — by name, so the log says which pair was missing
  // rather than "eng|undefined".
  if (!APERTIUM_PAIRS.has(pair)) throw new Error(`Apertium has no ${pair} pair`);

  const translated = await translateChunks(text, LINGVA_CHUNK, async (part) => {
    const url = `${APERTIUM}?langpair=${encodeURIComponent(pair)}&q=${encodeURIComponent(part)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Apertium responded ${response.status}`);

    const body = await response.json();
    const out = body.responseData?.translatedText;
    if (!out) throw new Error('Apertium returned no translation');
    // Apertium marks words it could not translate with a leading #.
    return String(out).replace(/#(\S)/g, '$1');
  });

  return { text: translated, engine: 'Apertium' };
}

const ENGINES = [namedEntity, lingva, myMemory, apertium];

/**
 * Swap a word-for-word rendering of an idiom for the equivalent idiom.
 *
 * Most idioms already survive translation — "raining cats and dogs" comes back
 * as "llueve a cántaros" — so only the ones that do not are listed, and only
 * those are touched.
 *
 * "Does not" has to mean *this* rendering, though, not this idiom in general.
 * The stored form is a citation, and an engine that produced the idiom in some
 * other inflection has got it right: replacing *está lloviendo a cántaros* with
 * the citation form yields "está llueve a cántaros", which is worse than the
 * literal translation the feature exists to repair. So the idiom is only put in
 * where it is genuinely absent — checked twice, on the sentence and on the span
 * — and the note is shown either way, since the pairing is the thing being
 * taught.
 */
async function restoreIdioms(source, translated, from, to, translateSpan) {
  const idioms = findIdioms(source, from, to);
  if (!idioms.length) return { text: translated, notes: [] };

  let result = translated;
  const notes = [];

  for (const idiom of idioms) {
    notes.push({ source: idiom.source, target: idiom.say, meaning: idiom.meaning });

    // The engine already said it idiomatically — leave its grammar alone.
    if (alreadyIdiomatic(result, idiom.say)) continue;

    const literal = await translateSpan(idiom.phrase).catch(() => null);
    if (!literal) continue;
    if (alreadyIdiomatic(literal, idiom.say)) continue;
    if (normalise(literal) === normalise(idiom.say)) continue;

    result = substitute(result, literal, idiom.say);
  }

  return { text: result, notes };
}

/**
 * Translate, trying each engine until one answers.
 * @returns {Promise<{text: string, engine: string, notes: Array}>}
 */
export async function translate(text, from, to) {
  const failures = [];
  let guess = null;

  for (const engine of ENGINES) {
    try {
      const result = await engine(text, from, to);
      if (!result.text.trim()) continue;

      // Wikipedia already answers with the established name; the translators
      // need the names put back afterwards.
      if (engine === namedEntity) return { ...result, notes: [] };

      const translateSpan = async (span) => (await engine(span, from, to)).text;

      const named = await restoreNames(text, result.text, from, to, translateSpan)
        .catch(() => result.text);
      const withIdioms = await restoreIdioms(text, named, from, to, translateSpan)
        .catch(() => ({ text: named, notes: [] }));

      return { ...result, text: withIdioms.text, notes: withIdioms.notes };
    } catch (error) {
      failures.push(error.message);
      if (error.guess?.trim() && !guess) guess = error.guess;
    }
  }

  /**
   * Nothing was confident. Rather than nothing at all, take the memory's own
   * best guess and say plainly that it is one.
   *
   * This is a last resort and reads like one. Spanish never reaches it, because
   * Apertium answers first; French and Latin reach it whenever the memory holds
   * a sentence more than once and its copies disagree, and for them the choice
   * is between a doubtful sentence that is labelled and an error message that
   * helps nobody. A student can weigh a translation marked uncertain. They
   * cannot weigh a blank page.
   */
  if (guess) {
    return {
      text: guess,
      engine: 'MyMemory',
      uncertain: true,
      notes: [],
    };
  }

  const error = new Error(`No translation engine answered. ${failures.join(' · ')}`);
  error.status = 502;
  throw error;
}
