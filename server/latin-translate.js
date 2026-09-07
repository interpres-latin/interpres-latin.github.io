/**
 * A Latin translator built out of the parts this site already has.
 *
 * No engine on the open web translates Latin well, and no model may be asked
 * to. But the site is not short of Latin knowledge — it has Whitaker's Words
 * for morphology, a decliner, a conjugator, and the course's own vocabulary in
 * both directions. Translation between English and Latin is largely a matter of
 * putting those together, because Latin says the grammar out loud: a noun in
 * the accusative *is* the object, and does not need to be guessed at from where
 * it happens to be sitting.
 *
 * **Latin → English** is the easy direction, and it is nearly assembly. Every
 * word is parsed, each case is read as the role it marks — nominative subject,
 * accusative object, genitive "of", dative "to", ablative "with" — and the
 * pieces are laid out in English order.
 *
 * **English → Latin** is the harder one, because English hides what Latin
 * states. The word order and the little words carry it instead: what comes
 * before the verb is the subject, what follows it is the object, "of" means
 * genitive, "to" means dative. Each content word is looked up, put into the
 * case its role calls for, and the sentence is emitted in the order Latin
 * conventionally uses — subject, then everything else, then the verb at the end.
 *
 * **What it will not do.** Subordinate clauses, participles, indirect
 * statement, relative pronouns, comparatives — anything, in short, past the
 * sentence shapes a first- or second-year class writes. It declines rather than
 * guesses: an unrecognised word or a shape it cannot account for throws, and
 * the chain falls through to the engines below. A translator that quietly
 * invents Latin would be worse than one that admits the sentence is beyond it,
 * because the reader cannot tell the difference and is here to learn.
 */

import { analyse } from './latin.js';
import { courseGloss, latinFor, singularsOf } from './latin-lexicon.js';
import { formOf } from '../public/js/lib/decliner-la.js';
import { conjugate } from '../public/js/lib/conjugator-la.js';

const fold = (word) => String(word ?? '').trim().toLowerCase();

/** Prepositions, and the case each one governs. */
const LATIN_PREPOSITIONS = {
  in: ['ablative', 'accusative'], ad: ['accusative'], ex: ['ablative'], e: ['ablative'],
  ab: ['ablative'], a: ['ablative'], de: ['ablative'], cum: ['ablative'], sine: ['ablative'],
  pro: ['ablative'], sub: ['ablative', 'accusative'], per: ['accusative'], post: ['accusative'],
  ante: ['accusative'], inter: ['accusative'], trans: ['accusative'], contra: ['accusative'],
  apud: ['accusative'], prope: ['accusative'], super: ['accusative'],
};

/** How each preposition reads in English. */
const PREPOSITION_ENGLISH = {
  in: 'in', ad: 'to', ex: 'out of', e: 'out of', ab: 'from', a: 'from', de: 'about',
  cum: 'with', sine: 'without', pro: 'for', sub: 'under', per: 'through', post: 'after',
  ante: 'before', inter: 'among', trans: 'across', contra: 'against', apud: 'at the house of',
  prope: 'near', super: 'above',
};

/** English prepositions, and the Latin case (and word) they turn into. */
const ENGLISH_PREPOSITIONS = {
  of: { case: 'genitive', word: null },
  to: { case: 'dative', word: null },
  for: { case: 'dative', word: null },
  with: { case: 'ablative', word: 'cum' },
  in: { case: 'ablative', word: 'in' },
  on: { case: 'ablative', word: 'in' },
  into: { case: 'accusative', word: 'in' },
  from: { case: 'ablative', word: 'ex' },
  by: { case: 'ablative', word: null },
  through: { case: 'accusative', word: 'per' },
  near: { case: 'accusative', word: 'prope' },
  without: { case: 'ablative', word: 'sine' },
};

const ARTICLES = new Set(['a', 'an', 'the']);

/** English verbs whose third person singular is not the stem plus -s. */
const IRREGULAR_THIRD = { have: 'has', be: 'is', do: 'does', go: 'goes' };
const STEM_OF_THIRD = { has: 'have', is: 'be', does: 'do', goes: 'go' };

/** Irregular English past tenses the site is likely to meet. */
const ENGLISH_PAST = {
  be: 'was', is: 'was', have: 'had', go: 'went', see: 'saw', give: 'gave', take: 'took',
  make: 'made', come: 'came', run: 'ran', say: 'said', tell: 'told', write: 'wrote',
  read: 'read', eat: 'ate', drink: 'drank', sit: 'sat', stand: 'stood', sleep: 'slept',
  lead: 'led', send: 'sent', hear: 'heard', hold: 'held', build: 'built', buy: 'bought',
  bring: 'brought', catch: 'caught', teach: 'taught', think: 'thought', find: 'found',
};

const tokenise = (text) => String(text ?? '').match(/[\p{L}\p{M}']+|[.,;:!?]/gu) ?? [];
const isWord = (token) => /^[\p{L}\p{M}']+$/u.test(token);

function fail(message) {
  const error = new Error(message);
  error.latinFallback = true;
  throw error;
}

/* ------------------------------------------------------------------ English */

export function pluralise(noun) {
  if (/(?:[sxz]|ch|sh)$/.test(noun)) return `${noun}es`;
  if (/[^aeiou]y$/.test(noun)) return `${noun.slice(0, -1)}ies`;
  return `${noun}s`;
}

export function thirdPerson(verb) {
  if (IRREGULAR_THIRD[verb]) return IRREGULAR_THIRD[verb];
  if (/(?:[sxz]|ch|sh|o)$/.test(verb)) return `${verb}es`;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ies`;
  return `${verb}s`;
}

export function pastOf(verb) {
  if (ENGLISH_PAST[verb]) return ENGLISH_PAST[verb];
  if (/e$/.test(verb)) return `${verb}d`;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ied`;
  return `${verb}ed`;
}

/** The first usable sense of a gloss: "girl, (female) child/daughter" → "girl". */
export function firstSense(definition) {
  const clean = String(definition ?? '').replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const first = clean.split(/[;,/]/)[0]?.trim();
  return first || null;
}

/**
 * The English for a Latin word: the course's own gloss where there is one,
 * because a class taught "works" should be told "works" and not "labour, toil".
 */
function glossFor(surface, analysis) {
  const gloss = courseGloss(surface) ?? courseGloss(analysis?.lemma) ?? analysis?.definition;
  // Trimmed even when it came from the course list: those carry alternatives
  // too — *villa* is glossed "house, villa" — and a translation wants one word.
  return firstSense(gloss);
}

/** A verb gloss reduced to its bare stem: "works" → "work", "to praise" → "praise". */
export function verbStem(gloss) {
  let stem = String(gloss ?? '').replace(/^to\s+/, '').trim();
  if (STEM_OF_THIRD[stem]) return STEM_OF_THIRD[stem];
  if (/ies$/.test(stem)) stem = `${stem.slice(0, -3)}y`;
  else if (/(?:[sxz]|ch|sh|o)es$/.test(stem)) stem = stem.slice(0, -2);
  else if (/s$/.test(stem) && !/(?:ss|us|is)$/.test(stem)) stem = stem.slice(0, -1);
  return stem;
}

/** Put an English verb into the tense and number the Latin was in. */
export function englishVerb(stem, { tense, number, person }) {
  const singular = number !== 'plural';
  const third = person === '3rd';

  switch (tense) {
    case 'imperfect':
      return `${singular ? 'was' : 'were'} ${stem === 'be' ? 'being' : `${stem.replace(/e$/, '')}ing`}`;
    case 'perfect':
    case 'aorist':
      return pastOf(stem);
    case 'pluperfect':
      return `had ${pastOf(stem)}`;
    case 'future':
      return `will ${stem}`;
    default:
      if (stem === 'be') return singular ? (third ? 'is' : 'am') : 'are';
      return third && singular ? thirdPerson(stem) : stem;
  }
}

/* --------------------------------------------------------- Latin → English */

/** Every reading of a word, flattened to one entry per possible inflection. */
async function readingsOf(word) {
  const analyses = await analyse(word).catch(() => null);
  if (!analyses?.length) return [];

  return analyses.flatMap((analysis) => (analysis.inflections ?? []).map((inflection) => ({
    analysis, inflection, surface: word, pos: inflection.pos || analysis.pos,
  })));
}

/** Preference order for the role a noun fills, once the obvious ones are taken. */
const CASE_ROLE = {
  nominative: 'subject',
  accusative: 'object',
  dative: 'indirect',
  genitive: 'possessive',
  ablative: 'adverbial',
  vocative: 'address',
};

export async function latinToEnglish(text) {
  const tokens = tokenise(text).filter(isWord);
  if (!tokens.length) fail('nothing to translate');
  if (tokens.length > 12) fail('too long for the rules translator');

  const parsed = await Promise.all(tokens.map(readingsOf));
  if (parsed.some((readings) => !readings.length)) {
    fail(`unknown Latin: ${tokens.filter((_, i) => !parsed[i].length).join(', ')}`);
  }

  // The finite verb, taken from the end: Latin puts it there, and a word that
  // could be either reads better as the verb when nothing else can be.
  const finiteAt = (i) => parsed[i].find((reading) => reading.pos === 'verb'
    && reading.inflection.person
    && ['indicative', 'imperative'].includes(reading.inflection.mood)) ?? null;

  const alsoNoun = (i) => parsed[i].some((reading) => reading.pos === 'noun');

  /**
   * The finite verb, looked for from the end, because that is where Latin puts
   * it.
   *
   * A word that is also a noun is only taken as the verb if it stands last or
   * if nothing else in the sentence can be one. *canis* is both "dog" and "you
   * sing", and "canis puellae" is a dog belonging to a girl, not a person
   * singing one.
   */
  let verb = null;
  for (let i = parsed.length - 1; i >= 0 && !verb; i -= 1) {
    const found = finiteAt(i);
    if (!found) continue;
    if (alsoNoun(i) && i !== parsed.length - 1) continue;
    verb = found;
    verb.index = i;
  }

  if (!verb) {
    for (let i = parsed.length - 1; i >= 0 && !verb; i -= 1) {
      const found = finiteAt(i);
      if (found && !alsoNoun(i)) { verb = found; verb.index = i; }
    }
  }

  /**
   * What the sentence looks like, which is what settles *puellae*.
   *
   * Genitive, dative and nominative plural are the same word, and no amount of
   * staring at it decides. The sentence around it does: a sentence with a verb
   * and an object wants "gives the money **to the girl**", while a phrase with
   * neither wants "the dog **of the girl**".
   */
  const shape = {
    hasVerb: Boolean(verb),
    hasAccusative: parsed.some((readings, i) => i !== verb?.index
      && readings.some((reading) => reading.inflection.case === 'accusative')),
  };

  const phrases = [];
  const taken = new Set(verb ? [verb.index] : []);
  let governing = null;

  for (let i = 0; i < parsed.length; i += 1) {
    if (taken.has(i)) continue;
    const surface = fold(tokens[i]);

    // A preposition fixes the case of whatever follows it, which removes the
    // ambiguity that makes this hard everywhere else.
    if (LATIN_PREPOSITIONS[surface]) {
      governing = { word: surface, cases: LATIN_PREPOSITIONS[surface] };
      continue;
    }

      // The locative is dropped rather than ranked. It is a real case and *puellae*
    // genuinely has one, but no beginner's sentence means it — and left in, it
    // won every contest below, because a case absent from the order list scored
    // -1 and sorted first. That is how the subject of "agricolae puellam
    // laudant" silently disappeared.
  const candidates = parsed[i].filter((reading) => reading.inflection.case
    && reading.inflection.case !== 'locative');
    if (!candidates.length) continue;

    const wanted = governing?.cases ?? null;
    const usable = wanted
      ? candidates.filter((reading) => wanted.includes(reading.inflection.case))
      : candidates;
    const chosen = pickCase(usable.length ? usable : candidates, phrases, shape);

    const gloss = glossFor(surface, chosen.analysis);
    if (!gloss) fail(`no English for ${surface}`);

    phrases.push({
      case: chosen.inflection.case,
      number: chosen.inflection.number || 'singular',
      role: governing ? 'prepositional' : CASE_ROLE[chosen.inflection.case],
      preposition: governing?.word ?? null,
      pos: chosen.pos,
      english: chosen.inflection.number === 'plural' ? pluralise(gloss) : gloss,
      bare: gloss,
    });
    governing = null;
  }

  if (!verb && !phrases.length) fail('nothing recognisable');
  return assembleEnglish(verb, phrases);
}

/**
 * Which reading of an ambiguous form to believe.
 *
 * *puellae* is genitive, dative and nominative plural at once, and the sentence
 * decides. Preference goes to the role nothing has filled yet, in the order the
 * cases are actually used, so the first noun of a verbless phrase becomes the
 * subject and a second one becomes its genitive.
 */
function pickCase(candidates, phrases, shape = {}) {
  const filled = new Set(phrases.map((phrase) => phrase.role));

  // A verb with an object in it makes an indirect object the likelier reading
  // of an ambiguous ending than a possessive; with no verb, the reverse.
  const order = shape.hasVerb && shape.hasAccusative
    ? ['nominative', 'accusative', 'dative', 'genitive', 'ablative', 'vocative']
    : ['nominative', 'accusative', 'genitive', 'dative', 'ablative', 'vocative'];

  const rank = (reading) => {
    const at = order.indexOf(reading.inflection.case);
    return at === -1 ? order.length : at;
  };

  const ranked = [...candidates].sort((a, b) => {
    const freeA = filled.has(CASE_ROLE[a.inflection.case]) ? 1 : 0;
    const freeB = filled.has(CASE_ROLE[b.inflection.case]) ? 1 : 0;
    if (freeA !== freeB) return freeA - freeB;
    return rank(a) - rank(b);
  });
  return ranked[0];
}

function noun(phrase) {
  return phrase.pos === 'adjective' ? phrase.english : `the ${phrase.english}`;
}

function assembleEnglish(verb, phrases) {
  const subject = phrases.find((phrase) => phrase.role === 'subject');
  const object = phrases.find((phrase) => phrase.role === 'object');
  const indirect = phrases.find((phrase) => phrase.role === 'indirect');
  const possessives = phrases.filter((phrase) => phrase.role === 'possessive');
  const adverbials = phrases.filter((phrase) => phrase.role === 'adverbial');
  const prepositional = phrases.filter((phrase) => phrase.role === 'prepositional');

  // A genitive belongs to whatever it follows, which in Latin is the word
  // before it: "canis puellae" is the dog *of the girl*.
  const owned = new Map();
  for (const possessive of possessives) {
    const host = phrases[phrases.indexOf(possessive) - 1];
    if (host) owned.set(host, `of ${noun(possessive)}`);
  }

  const render = (phrase) => (phrase
    ? [noun(phrase), owned.get(phrase)].filter(Boolean).join(' ')
    : null);

  const words = [];
  if (subject) words.push(render(subject));

  if (verb) {
    const gloss = glossFor(verb.surface, verb.analysis);
    if (!gloss) fail(`no English for ${verb.surface}`);
    words.push(englishVerb(verbStem(gloss), verb.inflection));
  }

  if (object) words.push(render(object));
  if (indirect) words.push(`to ${render(indirect)}`);
  for (const phrase of adverbials) words.push(`with ${render(phrase)}`);
  for (const phrase of prepositional) {
    words.push(`${PREPOSITION_ENGLISH[phrase.preposition] ?? phrase.preposition} ${render(phrase)}`);
  }

  // A genitive with nothing before it to own — a bare "puellae" — still has to
  // be said, or the word silently disappears from the translation.
  for (const possessive of possessives) {
    if (![...owned.values()].includes(`of ${noun(possessive)}`)) words.push(`of ${noun(possessive)}`);
  }

  const sentence = words.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!sentence) fail('nothing to say');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/* --------------------------------------------------------- English → Latin */

/** Find the Latin word for an English one, of the part of speech wanted. */
async function latinWord(english, wantedPos) {
  for (const candidate of latinFor(english)) {
    const analyses = await analyse(candidate).catch(() => null);
    if (!analyses?.length) continue;

    const match = analyses.find((analysis) => analysis.pos === wantedPos) ?? null;
    if (match) return { analysis: match, surface: candidate };
  }
  return null;
}

/** Whether an English token is a plural whose singular the lexicon knows. */
function looksPlural(english) {
  if (!/s$/.test(english) || /ss$/.test(english)) return false;
  return singularsOf(english).some((singular) => latinFor(singular).length > 0);
}

export async function englishToLatin(text) {
  const tokens = tokenise(text).filter(isWord).map(fold);
  if (!tokens.length) fail('nothing to translate');
  if (tokens.length > 12) fail('too long for the rules translator');

  // Tense markers are little words in English and endings in Latin, so they are
  // read off and removed before anything else is looked at.
  let tense = 'praesens';
  const content = [];

  /**
   * Which content words stood straight after "the" or "a".
   *
   * English hides its parts of speech, but not entirely: a word following an
   * article is a noun, and that one fact settles the case that breaks this
   * otherwise. *dog* is `canis`, which Whitaker's reads as both "dog" and "you
   * sing", so "the dog of the girl" was being built around a verb and came out
   * as *puellae canit*.
   */
  const determined = new Set();
  let article = false;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (ARTICLES.has(token)) { article = true; continue; }
    if (article) { determined.add(content.length); article = false; }
    if (token === 'will') { tense = 'futurum'; continue; }
    if (['was', 'were'].includes(token)) { tense = 'imperfectum'; continue; }
    if (['has', 'have', 'had'].includes(token)) { tense = 'perfectum'; continue; }
    if (['is', 'are', 'am'].includes(token) && /ing$/.test(tokens[i + 1] ?? '')) continue;
    content.push(token);
  }
  if (!content.length) fail('nothing to translate');

  // The verb, and everything else hangs off where it is.
  let verbAt = -1;
  let verb = null;
  for (let i = 0; i < content.length && !verb; i += 1) {
    if (ENGLISH_PREPOSITIONS[content[i]]) continue;
    if (determined.has(i)) continue;
    const found = await latinWord(baseVerb(content[i]), 'verb');
    if (found) { verb = found; verbAt = i; if (isPastForm(content[i])) tense = 'perfectum'; }
  }

  // With a verb, everything before it is the subject and everything after it
  // hangs off the prepositions. With no verb — "the dog of the girl" — the
  // first preposition does the same job, and without this the phrase reached
  // the noun builder with "of" still inside it and failed for want of a Latin
  // word for it.
  const boundary = verbAt === -1
    ? content.findIndex((token) => ENGLISH_PREPOSITIONS[token])
    : verbAt;

  const before = content.slice(0, boundary === -1 ? content.length : boundary);
  const after = boundary === -1 ? [] : content.slice(verbAt === -1 ? boundary : boundary + 1);

  const subject = await nounPhrase(before, 'nominative');
  const rest = await taggedPhrases(after);

  if (!verb && !subject && !rest.length) fail('nothing recognisable');

  const pieces = [];
  if (subject) pieces.push(...subject.words);
  for (const phrase of rest) pieces.push(...phrase.words);

  if (verb) {
    const table = conjugate(verb.analysis.principalParts.join(', '))?.table;
    const person = subject?.number === 'plural' ? 'p3' : 's3';
    const form = table?.indicativus?.[tense]?.[person];
    if (!form) fail(`cannot conjugate ${verb.surface}`);
    pieces.push(form);
  }

  const sentence = pieces.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!sentence) fail('nothing to say');
  return sentence;
}

/** English past tenses, so "praised" and "walked" reach their infinitives. */
function isPastForm(token) {
  if (Object.values(ENGLISH_PAST).includes(token)) return true;
  return /ed$/.test(token) && token.length > 3;
}

export function baseVerb(token) {
  for (const [stem, past] of Object.entries(ENGLISH_PAST)) if (past === token) return stem;
  if (/ied$/.test(token)) return `${token.slice(0, -3)}y`;
  if (/ed$/.test(token) && token.length > 4) return token.slice(0, -2);
  if (/ing$/.test(token) && token.length > 5) return token.slice(0, -3);
  return token;
}

/**
 * A run of English words as one Latin noun phrase, in the case its role wants.
 * Adjectives are put into the same case, number and gender as their noun, which
 * is the agreement the whole exercise is about.
 */
async function nounPhrase(tokens, wantedCase, preposition = null) {
  const words = tokens.filter((token) => !ARTICLES.has(token));
  if (!words.length) return null;

  const number = words.some(looksPlural) ? 'plural' : 'singular';
  let head = null;
  const adjectives = [];

  for (const token of words) {
    const singular = looksPlural(token) ? (singularsOf(token).find((s) => latinFor(s).length) ?? token) : token;
    const asNoun = await latinWord(singular, 'noun');
    if (asNoun && !head) { head = asNoun; continue; }

    const asAdjective = await latinWord(singular, 'adjective');
    if (asAdjective) { adjectives.push(asAdjective); continue; }
    if (!asNoun) fail(`no Latin for "${token}"`);
  }

  if (!head) fail(`no noun in "${words.join(' ')}"`);

  const parts = head.analysis.principalParts;
  const form = formOf(parts[0], parts[1] ?? parts[0], head.analysis.gender, wantedCase, number);
  if (!form) fail(`cannot decline ${head.surface}`);

  const rendered = adjectives.map((adjective) => {
    const adjectiveParts = adjective.analysis.principalParts;
    return formOf(adjectiveParts[0], adjectiveParts[1] ?? adjectiveParts[0],
      head.analysis.gender, wantedCase, number) ?? adjectiveParts[0];
  });

  return {
    number,
    words: [preposition, ...rendered, form].filter(Boolean),
  };
}

/** Everything after the verb, split on the English prepositions that mark case. */
async function taggedPhrases(tokens) {
  const phrases = [];
  let current = [];
  let marker = null;

  const flush = async () => {
    if (!current.length) return;
    const rule = marker ? ENGLISH_PREPOSITIONS[marker] : { case: 'accusative', word: null };
    const phrase = await nounPhrase(current, rule.case, rule.word);
    if (phrase) phrases.push(phrase);
    current = [];
  };

  for (const token of tokens) {
    if (ENGLISH_PREPOSITIONS[token]) {
      await flush();
      marker = token;
      continue;
    }
    current.push(token);
  }
  await flush();
  return phrases;
}

/* ---------------------------------------------------------------- as an engine */

/**
 * The chain's entry point. Latin only, and it declines everything else by name
 * so the log says which pair it was asked for.
 */
export async function latinRules(text, from, to) {
  if (from === 'la' && to === 'en') {
    return { text: await latinToEnglish(text), engine: 'Whitaker’s Words' };
  }
  if (from === 'en' && to === 'la') {
    return { text: await englishToLatin(text), engine: 'Whitaker’s Words' };
  }
  throw new Error(`the rules translator is Latin only, not ${from}|${to}`);
}
