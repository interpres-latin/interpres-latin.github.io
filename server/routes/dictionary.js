import { Router } from 'express';
import { ask, hasProvider, parseJson } from '../llm.js';
import { ATTRIBUTION, tatoebaExamples, wiktionaryGloss } from '../corpus.js';
import { ACADEMIE, fetchWiktionnaire, WIKTIONNAIRE_CREDIT } from '../dictionary-fr.js';
import { analyse, describeInflection, WHITAKER_CREDIT } from '../latin.js';

export const router = Router();

/**
 * The two dictionaries this route can answer from.
 *
 * Spanish has the RAE, which is the authority and says so. French has no
 * equivalent that can be queried — the Académie française publishes no API —
 * so the Wiktionnaire answers and the Académie is linked rather than quoted.
 * See server/dictionary-fr.js.
 */
const MESSAGES = {
  es: {
    missing: 'Falta la palabra a buscar.',
    notFound: (word) => `"${word}" no aparece en el Diccionario de la lengua española.`,
    failed: (detail) => `No se pudo consultar el diccionario: ${detail}`,
  },
  fr: {
    missing: 'Il manque le mot à chercher.',
    notFound: (word) => `« ${word} » ne figure pas dans le dictionnaire.`,
    failed: (detail) => `Impossible de consulter le dictionnaire : ${detail}`,
  },
  la: {
    missing: 'No word to look up.',
    notFound: (word) => `Whitaker’s Words does not know “${word}”.`,
    failed: (detail) => `The dictionary could not be reached: ${detail}`,
  },
};

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

const LANGUAGE_NAMES = { es: 'Spanish', fr: 'French', la: 'Latin' };
const DICTIONARY_NAMES = {
  es: 'the Real Academia Española dictionary',
  fr: 'the Wiktionnaire',
  la: 'Whitaker’s Words',
};

const EXAMPLE_SYSTEM = (study) => `You work on ProfeGPT, a ${LANGUAGE_NAMES[study]} learning
site, alongside ${DICTIONARY_NAMES[study]}.

For each numbered sense you are given, write ONE short natural ${LANGUAGE_NAMES[study]}
sentence (8-16 words) using the headword in exactly that sense, plus its English
translation.

Rules:
- Use the headword itself. Verbs may be conjugated; nouns may take an article or plural.
- Everyday, concrete, neutral register. No proper names of real people.
- The sentence must make that specific sense obvious from context.
- When asked for "def", render the dictionary's definition in plain English.
  Translate the definition, do not replace it with your own — it is a dictionary entry.
- Reply with JSON only, keyed by the sense number you were given. No other text.`;

/**
 * One call per word covers every sense: an example sentence for each, and — in
 * English mode — an English rendering of the RAE's own definition, since the
 * dictionary itself is Spanish-only.
 */
async function generateExamples(word, senses, english, study) {
  const wanted = senses.slice(0, EXAMPLES_PER_WORD);
  if (!wanted.length || !hasProvider()) return null;

  const shape = english
    ? '{"1": {"def": "...", "text": "...", "en": "..."}, "2": {...}}'
    : '{"1": {"text": "...", "en": "..."}, "2": {...}}';

  const list = wanted
    .map((sense) => `${sense.number}. (${[sense.category, sense.verbCategory].filter(Boolean).join(', ')}) ${sense.description}`)
    .join('\n');

  const text = await ask({
    system: EXAMPLE_SYSTEM(study),
    messages: [{
      role: 'user',
      content: `Headword: ${word}\n\nSenses:\n${list}\n\n`
        + `Reply with ${shape}`
        + `\n"text" is the ${LANGUAGE_NAMES[study]} sentence.`
        + (english ? '\n"def" is the definition above, in plain English.' : ''),
    }],
    maxTokens: 1600,
  });

  const parsed = parseJson(text);
  if (!parsed || typeof parsed !== 'object') return null;

  const examples = {};
  for (const [key, value] of Object.entries(parsed)) {
    const sentence = value?.text ?? value?.es ?? value?.fr;
    if (sentence) {
      examples[key] = {
        text: String(sentence),
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
function templateExample(word, sense, study) {
  const feminine = sense.gender === 'feminine';
  // Latin gets no invented frame: a made-up Latin sentence with the wrong case
  // on it is worse than no sentence, and the parses are the useful part anyway.
  if (study === 'la') return null;
  if (study === 'fr') {
    switch (sense.category) {
      case 'verb':
        return { text: `Demain, nous allons ${word} de nouveau.`, en: '' };
      case 'adjective':
        return { text: `Ce détail me paraît plutôt ${word}.`, en: '' };
      case 'adverb':
        return { text: `Il l'a fait ${word}, comme toujours.`, en: '' };
      case 'noun':
        return { text: `Nous avons parlé ${feminine ? `de la ${word}` : `du ${word}`} pendant le dîner.`, en: '' };
      default:
        return { text: `Voici un exemple avec « ${word} ».`, en: '' };
    }
  }
  switch (sense.category) {
    case 'verb':
      return { text: `Mañana vamos a ${word} otra vez.`, en: '' };
    case 'adjective':
      return { text: `Ese detalle me parece bastante ${word}.`, en: '' };
    case 'adverb':
      return { text: `Lo hizo ${word}, como siempre.`, en: '' };
    case 'noun':
      // "de + el" contracts to "del", so the two frames differ by more than the article.
      return { text: `Hablamos ${feminine ? `de la ${word}` : `del ${word}`} durante la cena.`, en: '' };
    default:
      return { text: `Aquí tienes un ejemplo con «${word}».`, en: '' };
  }
}

/**
 * Example sentences and glosses, shared by both dictionaries.
 *
 * Corpora first: real sentences and a real gloss, free and unmetered. A model
 * is only worth waking when the corpus has nothing, and the template frame is
 * the last resort after that.
 */
async function enrich(word, senses, english, study) {
  const [usage, gloss] = await Promise.all([
    tatoebaExamples(word, 2, study),
    english ? wiktionaryGloss(word, 3, study) : Promise.resolve(null),
  ]);

  let examples = {};
  let exampleSource = 'tatoeba';

  if (!usage?.length) {
    exampleSource = null;
    try {
      examples = (await generateExamples(word, senses, english, study)) ?? {};
      if (Object.keys(examples).length) exampleSource = 'model';
    } catch (error) {
      console.warn('[dictionary] example generation failed:', error.message);
    }
    if (!exampleSource) {
      examples = {};
      for (const sense of senses.slice(0, EXAMPLES_PER_WORD)) {
        const frame = templateExample(word, sense, study);
        if (frame) examples[sense.number] = frame;
      }
      exampleSource = Object.keys(examples).length ? 'template' : null;
    }
  }

  return {
    examples,
    exampleSource,
    // Attached to the word rather than to a sense: a corpus sentence contains
    // the word, it does not promise to illustrate one particular meaning.
    usage: usage?.length ? { sentences: usage, credit: ATTRIBUTION.tatoeba } : null,
    gloss: gloss?.length ? { senses: gloss, credit: ATTRIBUTION.wiktionary } : null,
  };
}

/** The French entry: the Wiktionnaire, with the Académie linked beside it. */
async function lookupFrench(word, english) {
  const lookup = await fetchWiktionnaire(word);
  if (!lookup.found) {
    const error = new Error(MESSAGES.fr.notFound(word));
    error.status = 404;
    error.suggestions = lookup.suggestions || [];
    throw error;
  }

  const entries = [{
    // The Wiktionnaire keeps one etymology for the whole page rather than one
    // per part of speech, so it sits on the first entry.
    origin: lookup.origin || '',
    senses: lookup.entries.flatMap((entry) => entry.senses),
    locutions: [],
  }];

  return {
    word: lookup.word,
    definitionSource: 'wiktionnaire',
    entries,
    ...await enrich(lookup.word, entries[0].senses, english, 'fr'),
    suggestions: [],
    // Named plainly: this is not the Académie, and an entry that quietly
    // implied otherwise would be worse than one that says where it came from.
    source: { name: 'Wiktionnaire', url: `https://fr.wiktionary.org/wiki/${encodeURIComponent(lookup.word)}` },
    authority: { name: 'Dictionnaire de l’Académie française', url: ACADEMIE(lookup.word) },
    credit: WIKTIONNAIRE_CREDIT,
  };
}

/**
 * The Latin entry: Whitaker's Words.
 *
 * Unlike the other two dictionaries this one is a *parser*, so an entry answers
 * a different question. It is keyed on the form the reader actually met — the
 * word as it stands in the text — and each sense carries the headword with its
 * principal parts and every way the form can be read. Looking up *canem* tells
 * you it is the accusative singular of *canis, canis*, which is the thing a
 * Latin reader needs and no ordinary dictionary provides.
 */
async function lookupLatin(word, english) {
  const analyses = await analyse(word);
  if (!analyses.length) {
    const error = new Error(MESSAGES.la.notFound(word));
    error.status = 404;
    error.suggestions = [];
    throw error;
  }

  const senses = analyses.map((analysis, index) => ({
    number: index + 1,
    category: analysis.pos,
    verbCategory: '',
    gender: analysis.gender,
    usage: '',
    description: analysis.definition || '—',
    // What a Latin dictionary prints, and what a student is expected to learn.
    headword: analysis.headword,
    principalParts: analysis.principalParts,
    declension: analysis.declension,
    conjugation: analysis.conjugation,
    // Every reading of the form that was asked about.
    parses: analysis.inflections.map((infl) => describeInflection(infl)).filter(Boolean),
    usageNotes: [],
    synonyms: [],
    antonyms: [],
  }));

  const entries = [{ origin: '', senses, locutions: [] }];

  return {
    word,
    definitionSource: 'whitaker',
    entries,
    ...await enrich(analyses[0].lemma, senses, english, 'la'),
    suggestions: [],
    source: { name: WHITAKER_CREDIT.name, url: WHITAKER_CREDIT.url },
    credit: WHITAKER_CREDIT,
  };
}

/** The Spanish entry: the RAE, with Wiktionary standing in only if it is down. */
async function lookupSpanish(word, english) {
  let lookup;
  try {
    lookup = await fetchRae(word);
  } catch (error) {
    // The RAE is the definition. When it cannot be reached, Wiktionary is
    // better than nothing — but the entry says plainly that it is not the RAE,
    // because a dictionary that quietly changes authority is worse than one
    // that admits it is unavailable.
    const glosses = await wiktionaryGloss(word, 6, 'es');
    if (glosses?.length) {
      const sentences = await tatoebaExamples(word, 2, 'es');
      return {
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
        usage: sentences?.length ? { sentences, credit: ATTRIBUTION.tatoeba } : null,
        gloss: null,
        suggestions: [],
        raeError: error.message,
        source: ATTRIBUTION.wiktionary,
      };
    }
    throw error;
  }

  if (!lookup.found) {
    const error = new Error(MESSAGES.es.notFound(word));
    error.status = 404;
    error.suggestions = lookup.suggestions || [];
    throw error;
  }

  const entries = (lookup.data.meanings || []).map(normalizeEntry);
  const allSenses = entries.flatMap((entry) => entry.senses);

  return {
    word: lookup.data.word,
    definitionSource: 'rae',
    entries,
    ...await enrich(lookup.data.word, allSenses, english, 'es'),
    suggestions: lookup.data.suggestions || [],
    source: { name: 'Real Academia Española · DLE', url: `https://dle.rae.es/${encodeURIComponent(word)}` },
  };
}

router.get('/', async (req, res) => {
  // Which language the site is about, which is not the language of the chrome.
  const study = ['fr', 'la'].includes(req.query.study) ? req.query.study : 'es';
  const messages = MESSAGES[study];

  const word = normalizeQuery(req.query.word);
  if (!word) return res.status(400).json({ error: messages.missing });

  // The chrome language, which decides only whether an English gloss and an
  // English rendering of the definition are wanted. The English entry differs,
  // so it is a different cache entry.
  const english = req.query.lang === 'en';
  const key = `${study}|${word}|${english ? 'en' : 'study'}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) return res.json(cached.payload);

  try {
    const payload = study === 'fr' ? await lookupFrench(word, english)
      : study === 'la' ? await lookupLatin(word, english)
        : await lookupSpanish(word, english);
    cache.set(key, { at: Date.now(), payload });
    return res.json(payload);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: error.message, suggestions: error.suggestions || [] });
    }
    // Pass a rate limit through as one, so the client can tell "come back
    // later" apart from "the dictionary is broken".
    const status = error.status === 429 ? 429 : 502;
    return res.status(status).json({
      error: status === 429 ? error.message : messages.failed(error.message),
    });
  }
});
