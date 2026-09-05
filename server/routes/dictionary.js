import { Router } from 'express';
import { ask, hasProvider, parseJson } from '../llm.js';

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

export async function fetchRae(word) {
  const response = await fetch(`${RAE_API}/${encodeURIComponent(word)}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404) {
    const body = await response.json().catch(() => ({}));
    return { found: false, suggestions: body.suggestions || [] };
  }
  if (!response.ok) throw new Error(`RAE lookup failed (${response.status})`);
  const body = await response.json();
  if (!body.ok || !body.data) return { found: false, suggestions: [] };
  return { found: true, data: body.data };
}

const EXAMPLE_SYSTEM = `You write example sentences for ProfeGPT, a Spanish learning site.

For each numbered dictionary sense you are given, write ONE short natural Spanish
sentence (8-16 words) that uses the headword in exactly that sense, plus its
English translation.

Rules:
- Use the headword itself. Verbs may be conjugated; nouns may take an article or plural.
- Everyday, concrete, neutral register. No proper names of real people.
- The sentence must make that specific sense obvious from context.
- Reply with JSON only: {"1": {"es": "...", "en": "..."}, "2": {...}}
  keyed by the sense number you were given. No other text.`;

async function generateExamples(word, senses) {
  const wanted = senses.slice(0, EXAMPLES_PER_WORD);
  if (!wanted.length || !hasProvider()) return null;

  const list = wanted
    .map((sense) => `${sense.number}. (${[sense.category, sense.verbCategory].filter(Boolean).join(', ')}) ${sense.description}`)
    .join('\n');

  const text = await ask({
    system: EXAMPLE_SYSTEM,
    messages: [{ role: 'user', content: `Headword: ${word}\n\nSenses:\n${list}` }],
    maxTokens: 1200,
  });

  const parsed = parseJson(text);
  if (!parsed || typeof parsed !== 'object') return null;

  const examples = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value && typeof value === 'object' && value.es) {
      examples[key] = { es: String(value.es), en: String(value.en || '') };
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

  const cached = cache.get(word);
  if (cached && Date.now() - cached.at < CACHE_TTL) return res.json(cached.payload);

  let lookup;
  try {
    lookup = await fetchRae(word);
  } catch (error) {
    return res.status(502).json({ error: `No se pudo consultar el diccionario: ${error.message}` });
  }

  if (!lookup.found) {
    return res.status(404).json({
      error: `"${word}" no aparece en el Diccionario de la lengua española.`,
      suggestions: lookup.suggestions,
    });
  }

  const entries = (lookup.data.meanings || []).map(normalizeEntry);
  const allSenses = entries.flatMap((entry) => entry.senses);

  let examples = null;
  let exampleSource = null;
  try {
    examples = await generateExamples(lookup.data.word, allSenses);
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

  const payload = {
    word: lookup.data.word,
    entries,
    examples,
    exampleSource,
    suggestions: lookup.data.suggestions || [],
    source: { name: 'Real Academia Española · DLE', url: `https://dle.rae.es/${encodeURIComponent(word)}` },
  };

  cache.set(word, { at: Date.now(), payload });
  res.json(payload);
});
