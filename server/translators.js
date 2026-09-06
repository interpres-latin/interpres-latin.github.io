/**
 * Translation engines, none of which is a language model.
 *
 * Tried in order until one gives an answer:
 *
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

const ENGINES = [lingva, myMemory, apertium];

/**
 * Translate, trying each engine until one answers.
 * @returns {Promise<{text: string, engine: string}>}
 */
export async function translate(text, from, to) {
  const failures = [];

  for (const engine of ENGINES) {
    try {
      const result = await engine(text, from, to);
      if (result.text.trim()) return result;
    } catch (error) {
      failures.push(error.message);
    }
  }

  const error = new Error(`No translation engine answered. ${failures.join(' · ')}`);
  error.status = 502;
  throw error;
}
