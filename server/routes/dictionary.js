import { Router } from 'express';
import { ask, hasProvider, parseJson } from '../llm.js';
import { ATTRIBUTION, tatoebaExamples, wiktionaryGloss } from '../corpus.js';

export const router = Router();

const RAE_API = 'https://rae-api.com/api/words';
const EXAMPLES_PER_WORD = 4;

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 6;

function normalizeQuery(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 60);
}

/** Strip the "Sin.:" / "Ant." tails RAE packs into the raw sense string. */
function cleanDescription(sense) {
  const description = (sense.description || '').trim();
  if (description) return description.replace(/\s*\.$/, '');
  return (sense.raw || '')
    .replace(/^\d+\.\s*/, '')
    .split(/Sin\.:|Ant\.:/)[0]
    .trim();
}

function normalizeSense(sense) {
  return {
    number: sense.meaning_number ?? null,
    category: sense.category || '',
    verbCategory: sense.verb_category || '',
    gender: sense.gender || '',
    usage: sense.usage || '',
    description: cleanDescription(sense),
    usageNotes: sense.usage_notes || [],
    synonyms: (sense.synonyms || []).map((word) => word.replace(/\d+$/, '')),
    antonyms: (sense.antonyms || []).map((word) => word.replace(/\d+$/, '')),
  };
}

function normalizeEntry(meaning) {
  return {
    origin: meaning.origin?.raw || '',
    senses: (meaning.senses || []).map(normalizeSense),
    locutions: (meaning.locutions || []).slice(0, 12).map((locution) => ({
      expression: locution.expression,
      senses: (locution.senses || []).map(normalizeSense),
    })),
    hasConjugations: Boolean(meaning.conjugations),
  };
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Anonymous access to rae-api.com is 10 requests a minute and 100 a day, which
 * a real site burns through quickly. A free self-service key raises that to
 * 60/minute and 5,000/day — set RAE_API_KEY and it is used automatically.
 * https://rae-api.com/login
 */
function raeHeaders() {
  const headers = { accept: 'application/json' };
  if (process.env.RAE_API_KEY) headers['X-API-Key'] = process.env.RAE_API_KEY;
  return headers;
}

export async function fetchRae(word, attempt = 0) {
  const response = await fetch(`${RAE_API}/${encodeURIComponent(word)}`, {
    headers: raeHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  // A per-minute limit clears on its own; a daily one does not, so only retry
  // when the wait is short enough to be worth holding the request open for.
  if (response.status === 429 || response.status >= 500) {
    const retryAfter = Number(response.headers.get('retry-after')) || 0;
    if (attempt < 2 && retryAfter <= 5) {
      await wait(Math.max(600, retryAfter * 1000) * (attempt + 1));
      return fetchRae(word, attempt + 1);
    }
    if (response.status === 429) {
      const minutes = Math.ceil(retryAfter / 60);
      const error = new Error(minutes > 1
        ? `El diccionario está limitando las consultas. Vuelve en unos ${minutes} minutos.`
        : 'El diccionario está limitando las consultas. Inténtalo de nuevo en un momento.');
      error.status = 429;
      throw error;
    }
  }

  if (response.status === 404) {
    const body = await response.json().catch(() => ({}));
    return { found: false, suggestions: body.suggestions || [] };
  }
  if (!response.ok) throw new Error(`RAE lookup failed (${response.status})`);
  const body = await response.json();
  if (!body.ok || !body.data) return { found: false, suggestions: [] };
  return { found: true, data: body.data };
}

const EXAMPLE_SYSTEM = `You work on ProfeGPT, a Spanish learning site, alongside
the Real Academia Española dictionary.

For each numbered sense you are given, write ONE short natural Spanish sentence
(8-16 words) using the headword in exactly that sense, plus its English
translation.

Rules:
- Use the headword itself. Verbs may be conjugated; nouns may take an article or plural.
- Everyday, concrete, neutral register. No proper names of real people.
- The sentence must make that specific sense obvious from context.
- When asked for "def", render the RAE's definition in plain English. Translate
  the definition, do not replace it with your own — it is a dictionary entry.
- Reply with JSON only, keyed by the sense number you were given. No other text.`;

/**
 * One call per word covers every sense: an example sentence for each, and — in
 * English mode — an English rendering of the RAE's own definition, since the
 * dictionary itself is Spanish-only.
 */
async function generateExamples(word, senses, language) {
  const wanted = senses.slice(0, EXAMPLES_PER_WORD);
  if (!wanted.length || !hasProvider()) return null;

  const english = language === 'en';
  const shape = english
    ? '{"1": {"def": "...", "es": "...", "en": "..."}, "2": {...}}'
    : '{"1": {"es": "...", "en": "..."}, "2": {...}}';

  const list = wanted
    .map((sense) => `${sense.number}. (${[sense.category, sense.verbCategory].filter(Boolean).join(', ')}) ${sense.description}`)
    .join('\n');

  const text = await ask({
    system: EXAMPLE_SYSTEM,
    messages: [{
      role: 'user',
      content: `Headword: ${word}\n\nSenses:\n${list}\n\n`
        + `Reply with ${shape}`
        + (english ? '\n"def" is the definition above, in plain English.' : ''),
    }],
    maxTokens: 1600,
  });

  const parsed = parseJson(text);
  if (!parsed || typeof parsed !== 'object') return null;

  const examples = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value && typeof value === 'object' && value.es) {
      examples[key] = {
        es: String(value.es),
        en: String(value.en || ''),
        def: value.def ? String(value.def) : '',
      };
    }
  }
  return Object.keys(examples).length ? examples : null;
}

/**
 * No API key: build one plainly-correct frame per part of speech. Clearly
 * labelled as a template in the UI so nobody mistakes it for a real citation.
 */
function templateExample(word, sense) {
  const feminine = sense.gender === 'feminine';
  switch (sense.category) {
    case 'verb':
      return { es: `Mañana vamos a ${word} otra vez.`, en: '' };
    case 'adjective':
      return { es: `Ese detalle me parece bastante ${word}.`, en: '' };
    case 'adverb':
      return { es: `Lo hizo ${word}, como siempre.`, en: '' };
    case 'noun':
      // "de + el" contracts to "del", so the two frames differ by more than the article.
      return { es: `Hablamos ${feminine ? `de la ${word}` : `del ${word}`} durante la cena.`, en: '' };
    default:
      return { es: `Aquí tienes un ejemplo con «${word}».`, en: '' };
  }
}

router.get('/', async (req, res) => {
  const word = normalizeQuery(req.query.word);
  if (!word) return res.status(400).json({ error: 'Falta la palabra a buscar.' });

  // The English rendering differs, so it is a different cache entry.
  const language = req.query.lang === 'en' ? 'en' : 'es';
  const key = `${word}|${language}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) return res.json(cached.payload);

  let lookup;
  try {
    lookup = await fetchRae(word);
  } catch (error) {
    // The RAE is the definition. When it cannot be reached, Wiktionary is
    // better than nothing — but the entry says plainly that it is not the RAE,
    // because a dictionary that quietly changes authority is worse than one
    // that admits it is unavailable.
    const glosses = await wiktionaryGloss(word, 6);
    if (glosses?.length) {
      return res.json({
        word,
        definitionSource: 'wiktionary',
        entries: [{
          origin: '',
          senses: glosses.map((definition, index) => ({
            number: index + 1,
            category: '',
            verbCategory: '',
            gender: '',
            usage: '',
            description: definition,
            usageNotes: [],
            synonyms: [],
            antonyms: [],
          })),
          locutions: [],
        }],
        examples: {},
        exampleSource: null,
        usage: (await tatoebaExamples(word))?.length
          ? { sentences: await tatoebaExamples(word), credit: ATTRIBUTION.tatoeba }
          : null,
        gloss: null,
        suggestions: [],
        raeError: error.message,
        source: ATTRIBUTION.wiktionary,
      });
    }

    // Pass a rate limit through as one, so the client can tell "come back
    // later" apart from "the dictionary is broken".
    const status = error.status === 429 ? 429 : 502;
    return res.status(status).json({
      error: status === 429 ? error.message : `No se pudo consultar el diccionario: ${error.message}`,
    });
  }

  if (!lookup.found) {
    return res.status(404).json({
      error: `"${word}" no aparece en el Diccionario de la lengua española.`,
      suggestions: lookup.suggestions,
    });
  }

  const entries = (lookup.data.meanings || []).map(normalizeEntry);
  const allSenses = entries.flatMap((entry) => entry.senses);

  // Corpora first: real sentences and a real gloss, free and unmetered.
  const [usage, gloss] = await Promise.all([
    tatoebaExamples(lookup.data.word),
    language === 'en' ? wiktionaryGloss(lookup.data.word) : Promise.resolve(null),
  ]);

  let examples = null;
  let exampleSource = null;

  // Only when the corpus has nothing is a model worth waking for one sentence.
  if (!usage?.length) {
    try {
      examples = await generateExamples(lookup.data.word, allSenses, language);
      if (examples) exampleSource = 'model';
    } catch (error) {
      console.warn('[dictionary] example generation failed:', error.message);
    }
    if (!examples) {
      examples = {};
      for (const sense of allSenses.slice(0, EXAMPLES_PER_WORD)) {
        examples[sense.number] = templateExample(lookup.data.word, sense);
      }
      exampleSource = 'template';
    }
  } else {
    examples = {};
    exampleSource = 'tatoeba';
  }

  const payload = {
    word: lookup.data.word,
    definitionSource: 'rae',
    entries,
    examples,
    exampleSource,
    // Attached to the word rather than to a sense: a corpus sentence contains
    // the word, it does not promise to illustrate one particular meaning.
    usage: usage?.length ? { sentences: usage, credit: ATTRIBUTION.tatoeba } : null,
    gloss: gloss?.length ? { senses: gloss, credit: ATTRIBUTION.wiktionary } : null,
    suggestions: lookup.data.suggestions || [],
    source: { name: 'Real Academia Española · DLE', url: `https://dle.rae.es/${encodeURIComponent(word)}` },
  };

  cache.set(key, { at: Date.now(), payload });
  res.json(payload);
});
