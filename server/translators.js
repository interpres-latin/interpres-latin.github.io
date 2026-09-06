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
 *                  content, so it is a floor rather than a choice.
 */

const LINGVA_HOSTS = (process.env.LINGVA_INSTANCES || 'lingva.lunar.icu,lingva.ml,lingva.garudalinux.org')
  .split(',').map((host) => host.trim()).filter(Boolean);

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

/** Small words that sit inside a name without breaking it. */
const CONNECTORS = new Set(['of', 'the', 'and', 'de', 'del', 'la', 'las', 'los', 'y', 'en']);
const LEADING_ARTICLE = /^(?:the|a|an|el|la|los|las|un|una)\s+/i;

/**
 * Runs of capitalised words, which is what a name looks like in running text.
 * A lone capitalised word is ignored: at the start of a sentence every word is
 * capitalised, and one word is rarely a name worth looking up.
 */
function findNameSpans(text) {
  const words = [...text.matchAll(/[\p{L}\p{N}''-]+/gu)];
  const spans = [];
  let run = [];

  const flush = () => {
    if (run.length >= 2) {
      const start = run[0].index;
      const last = run[run.length - 1];
      spans.push(text.slice(start, last.index + last[0].length));
    }
    run = [];
  };

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const capitalised = /^\p{Lu}/u.test(word[0]);
    const connector = CONNECTORS.has(word[0].toLowerCase());

    if (capitalised) {
      run.push(word);
    } else if (connector && run.length && words[i + 1] && /^\p{Lu}/u.test(words[i + 1][0])) {
      run.push(word); // "United States of America"
    } else {
      flush();
    }
  }
  flush();

  return [...new Set(spans)].slice(0, 3);
}

/** Ask Wikipedia what a phrase is called in the other language. */
async function officialName(phrase, from, to) {
  const url = new URL(WIKIPEDIA(from));
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', phrase);
  url.searchParams.set('prop', 'langlinks');
  url.searchParams.set('lllang', to);
  url.searchParams.set('redirects', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'ProfeGPT (educational)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return null;

  const body = await response.json();
  const page = Object.values(body?.query?.pages || {})[0];
  const link = page?.langlinks?.[0]?.['*'];
  if (!link) return null;

  // The article has to be the phrase itself, not something it resembles.
  if (normalise(page.title || '') !== normalise(phrase)) return null;
  return link;
}

/** Replace `find` in `text`, keeping the capitalisation that was already there. */
function substitute(text, find, replacement) {
  const pattern = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return text.replace(pattern, (match) => (/^\p{Ll}/u.test(match)
    ? replacement.charAt(0).toLowerCase() + replacement.slice(1)
    : replacement));
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
  let result = translated;

  for (const span of findNameSpans(source)) {
    const bare = span.replace(LEADING_ARTICLE, '');
    const official = (await officialName(span, from, to))
      ?? (bare !== span ? await officialName(bare, from, to) : null);
    if (!official) continue;

    const literal = await translateSpan(bare).catch(() => null);
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
  let lastError = null;

  for (const host of LINGVA_HOSTS) {
    try {
      return {
        text: await translateChunks(text, LINGVA_CHUNK, async (part) => {
          const url = `https://${host}/api/v1/${from}/${to}/${encodeURIComponent(part)}`;
          const response = await fetch(url, {
            headers: { accept: 'application/json' },
            signal: AbortSignal.timeout(12000),
          });
          if (!response.ok) throw new Error(`${host} responded ${response.status}`);

          const body = await response.json();
          if (!body.translation) throw new Error(`${host} returned no translation`);
          return String(body.translation);
        }),
        engine: 'Lingva',
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No Lingva instance answered.');
}

/**
 * Believed only when its candidates agree: the memory holds several different
 * translations of the same sentence, and the wrong one can score highest.
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

    const candidates = (body.matches || []).map((match) => String(match.translation)).filter(Boolean);
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

  if (!confident) throw new Error('MyMemory candidates disagreed');
  return { text: translated, engine: 'MyMemory' };
}

async function apertium(text, from, to) {
  const pair = `${from === 'es' ? 'spa' : 'eng'}|${to === 'es' ? 'spa' : 'eng'}`;

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
 * Translate, trying each engine until one answers.
 * @returns {Promise<{text: string, engine: string}>}
 */
export async function translate(text, from, to) {
  const failures = [];

  for (const engine of ENGINES) {
    try {
      const result = await engine(text, from, to);
      if (!result.text.trim()) continue;

      // Wikipedia already answers with the established name; the translators
      // need the names put back afterwards.
      if (engine === namedEntity) return result;

      const corrected = await restoreNames(
        text, result.text, from, to,
        async (span) => (await engine(span, from, to)).text,
      ).catch(() => result.text);

      return { ...result, text: corrected };
    } catch (error) {
      failures.push(error.message);
    }
  }

  const error = new Error(`No translation engine answered. ${failures.join(' · ')}`);
  error.status = 502;
  throw error;
}
