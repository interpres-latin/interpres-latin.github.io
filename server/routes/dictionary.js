import { Router } from 'express';
import { ask, hasProvider, parseJson } from '../llm.js';
import { ATTRIBUTION, tatoebaExamples, wiktionaryGloss } from '../corpus.js';
import { analyse, describeInflection, WHITAKER_CREDIT } from '../latin.js';
import { latinGlossOf, primeLatinGlosses } from '../latin-lexicon.js';

export const router = Router();

/**
 * The dictionary this route answers from.
 *
 * Whitaker's Words, which is a *parser* rather than a word list: given a form
 * it says what the form is, which is the thing a Latin reader actually needs.
 * See server/latin.js.
 */
const MESSAGES = {
  missing: 'No word to look up.',
  notFound: (word) => `Whitaker’s Words does not know “${word}”.`,
  failed: (detail) => `The dictionary could not be reached: ${detail}`,
  notAWord: 'Look up a word: letters only, no symbols.',
};

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

/**
 * A word, or something to hand to a dictionary at all.
 *
 * Letters, and the punctuation that lives inside real headwords: the hyphen of
 * *arc-en-ciel*, the apostrophe of *aujourd'hui*, the space of *res publica*.
 * Nothing else — `<script>alert(1)</script>` and `../../etc/passwd` are not
 * failed lookups, and sending them upstream produced a 502 that told a student
 * the dictionary was unreachable when the dictionary was perfectly fine. It
 * also spent a request on each, against a budget shared by a whole class.
 */
const LOOKS_LIKE_A_WORD = /^[\p{L}][\p{L}\p{M}'’\- ]*$/u;

const EXAMPLE_SYSTEM = `You work on Interpres, a Latin learning site, alongside
Whitaker’s Words.

For each numbered sense you are given, write ONE short natural Latin sentence
(8-16 words) using the headword in exactly that sense, plus its English
translation.

Rules:
- Use the headword itself, inflected as the sentence requires.
- Everyday, concrete, neutral register. No proper names of real people.
- The sentence must make that specific sense obvious from context.
- Classical usage. Do not invent forms; if you are unsure of one, choose another
  sentence rather than guessing.
- When asked for "def", render the dictionary's definition in plain English.
  Translate the definition, do not replace it with your own. It is a dictionary entry.
- Reply with JSON only, keyed by the sense number you were given. No other text.`;

/**
 * One call per word covers every sense: an example sentence for each, and — in
 * English mode — an English rendering of Whitaker's own definition, which is
 * terse to the point of shorthand.
 */
async function generateExamples(word, senses, english) {
  const wanted = senses.slice(0, EXAMPLES_PER_WORD);
  if (!wanted.length || !hasProvider()) return null;

  const shape = english
    ? '{"1": {"def": "...", "text": "...", "en": "..."}, "2": {...}}'
    : '{"1": {"text": "...", "en": "..."}, "2": {...}}';

  const list = wanted
    .map((sense) => `${sense.number}. (${[sense.category, sense.verbCategory].filter(Boolean).join(', ')}) ${sense.description}`)
    .join('\n');

  const text = await ask({
    system: EXAMPLE_SYSTEM,
    messages: [{
      role: 'user',
      content: `Headword: ${word}\n\nSenses:\n${list}\n\n`
        + `Reply with ${shape}`
        + '\n"text" is the Latin sentence.'
        + (english ? '\n"def" is the definition above, in plain English.' : ''),
    }],
    maxTokens: 1600,
  });

  const parsed = parseJson(text);
  if (!parsed || typeof parsed !== 'object') return null;

  const examples = {};
  for (const [key, value] of Object.entries(parsed)) {
    const sentence = value?.text ?? value?.la;
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
 * Example sentences and glosses.
 *
 * Corpora first: real sentences and a real gloss, free and unmetered. A model
 * is only worth waking when the corpus has nothing.
 *
 * There is no template frame beneath it, and deliberately none: a made-up Latin
 * sentence with the wrong case on it is worse than no sentence at all, and the
 * parses are the useful part of a Latin entry anyway.
 */
async function enrich(word, senses, english) {
  const [usage, gloss] = await Promise.all([
    tatoebaExamples(word, 2, 'la'),
    english ? wiktionaryGloss(word, 3, 'la') : Promise.resolve(null),
  ]);

  let examples = {};
  let exampleSource = 'tatoeba';

  if (!usage?.length) {
    exampleSource = null;
    try {
      examples = (await generateExamples(word, senses, english)) ?? {};
      if (Object.keys(examples).length) exampleSource = 'model';
    } catch (error) {
      console.warn('[dictionary] example generation failed:', error.message);
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

/**
 * The entry: Whitaker's Words.
 *
 * Unlike an ordinary dictionary this one is a *parser*, so an entry answers a
 * different question. It is keyed on the form the reader actually met — the
 * word as it stands in the text — and each sense carries the headword with its
 * principal parts and every way the form can be read. Looking up *canem* tells
 * you it is the accusative singular of *canis, canis*, which is the thing a
 * Latin reader needs and no ordinary dictionary provides.
 */
async function lookup(word, english) {
  const analyses = await analyse(word);

  /**
   * Whitaker's word list has holes, and a hole is not the same as a word not
   * existing. *saccharinus* is an ordinary first-and-second declension
   * adjective and it simply is not in there, so the page said the word was
   * unknown about a word that plainly is not. Wiktionary is asked before that
   * claim is made.
   *
   * What comes back has no morphology, because nothing parsed it: a meaning
   * and nothing else, and the entry says as much rather than inventing a parse.
   */
  if (!analyses.length) {
    await primeLatinGlosses([word]).catch(() => {});
    const gloss = latinGlossOf(word);
    if (gloss) {
      return {
        word,
        definitionSource: 'wiktionary',
        entries: [{
          origin: '',
          senses: [{
            number: 1, category: '', verbCategory: '', gender: '', usage: '',
            description: gloss, headword: word, principalParts: [],
            declension: '', conjugation: '', parses: [], usageNotes: [],
            synonyms: [], antonyms: [],
          }],
          locutions: [],
        }],
        ...await enrich(word, [], english),
        suggestions: [],
        source: { name: 'Wiktionary', url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#Latin` },
        credit: { name: 'Wiktionary', url: 'https://en.wiktionary.org' },
      };
    }

    const error = new Error(MESSAGES.notFound(word));
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
    description: analysis.definition || '-',
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
    ...await enrich(analyses[0].lemma, senses, english),
    suggestions: [],
    source: { name: WHITAKER_CREDIT.name, url: WHITAKER_CREDIT.url },
    credit: WHITAKER_CREDIT,
  };
}


router.get('/', async (req, res) => {
  const word = normalizeQuery(req.query.word);
  if (!word) return res.status(400).json({ error: MESSAGES.missing });
  if (!LOOKS_LIKE_A_WORD.test(word)) return res.status(400).json({ error: MESSAGES.notAWord });

  // The chrome language, which decides only whether an English gloss and an
  // English rendering of the definition are wanted. The English entry differs,
  // so it is a different cache entry.
  const english = req.query.lang === 'en';
  const key = `${word}|${english ? 'en' : 'la'}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) return res.json(cached.payload);

  try {
    const payload = await lookup(word, english);
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
      error: status === 429 ? error.message : MESSAGES.failed(error.message),
    });
  }
});
