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
import { formOf, declineAdjective } from '../public/js/lib/decliner-la.js';
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

/**
 * Little words that are not nouns and not verbs, and each one's job.
 *
 * They have to be listed for two reasons: so they are not fed to the noun
 * builder, and so they are not *silently dropped*, which is what happened to
 * every subjunctive before this — "puer laudet" came back as "The boy", verb
 * and all its meaning quietly gone.
 */
const PARTICLES = {
  utinam: { kind: 'wish' },
  ne: { kind: 'negative', english: 'not' },
  non: { kind: 'negative', english: 'not' },
  nonne: { kind: 'negative', english: 'not' },
  si: { kind: 'conjunction', english: 'if' },
  nisi: { kind: 'conjunction', english: 'unless' },
  et: { kind: 'conjunction', english: 'and' },
  sed: { kind: 'conjunction', english: 'but' },
  quod: { kind: 'conjunction', english: 'because' },
  quia: { kind: 'conjunction', english: 'because' },
  ubi: { kind: 'conjunction', english: 'when' },
  cum: { kind: 'conjunction', english: 'when' },
  tamen: { kind: 'adverb', english: 'however' },
  itaque: { kind: 'adverb', english: 'and so' },
  igitur: { kind: 'adverb', english: 'therefore' },
};

/**
 * English subject pronouns, and the ending they call for.
 *
 * They translate to nothing at all, which is the point: Latin puts the person
 * in the verb and writes *ego* only for emphasis. So "I work" is *laboro*, one
 * word — and before this it failed outright for want of a Latin word for "I".
 */
const SUBJECT_PRONOUNS = {
  i: { person: '1st', number: 'singular' },
  we: { person: '1st', number: 'plural' },
  you: { person: '2nd', number: 'singular' },
  he: { person: '3rd', number: 'singular' },
  she: { person: '3rd', number: 'singular' },
  it: { person: '3rd', number: 'singular' },
  they: { person: '3rd', number: 'plural' },
};

/** Object pronouns, which Latin does write out. */
const OBJECT_PRONOUNS = {
  me: 'me', us: 'nos', him: 'eum', her: 'eam', them: 'eos', it: 'id',
};

/** The person and number a Latin verb takes, as `conjugate` names its cells. */
const PERSON_CELL = {
  '1st': { singular: 's1', plural: 'p1' },
  '2nd': { singular: 's2', plural: 'p2' },
  '3rd': { singular: 's3', plural: 'p3' },
};

/** The pronoun a Latin verb implies when its subject is not written out. */
const IMPLIED_SUBJECT = {
  '1st': { singular: 'I', plural: 'we' },
  '2nd': { singular: 'you', plural: 'you' },
  '3rd': { singular: 'he', plural: 'they' },
};

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

/**
 * English for a Latin subjunctive.
 *
 * English gave up most of its subjunctive, so this is what is left of it: the
 * modals. A present subjunctive is "may", an imperfect "might" — and after
 * *utinam* the whole thing becomes a wish, which is the one place English still
 * inflects for it: "I wish I **were** dead".
 */
function subjunctiveVerb(stem, { tense, number, person }, wish, conditional = false) {
  const singular = number !== 'plural';

  // "si puer laudaret" is "if the boy were to praise", not "if the boy might".
  if (conditional) {
    if (stem === 'be') return 'were';
    return tense === 'imperfect' ? `were to ${stem}` : `should ${stem}`;
  }

  if (wish) {
    if (stem === 'be') return singular ? 'were' : 'were';
    if (tense === 'present') return `would ${stem}`;
    if (tense === 'pluperfect' || tense === 'perfect') return `had ${pastOf(stem)}`;
    return `were ${stem.replace(/e$/, '')}ing`;
  }

  switch (tense) {
    case 'imperfect':
      return `might ${stem}`;
    case 'perfect':
      return `may have ${pastOf(stem)}`;
    case 'pluperfect':
      return `would have ${pastOf(stem)}`;
    default:
      return `may ${stem}`;
  }
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
    && ['indicative', 'imperative', 'subjunctive'].includes(reading.inflection.mood)) ?? null;

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
  const particles = [];
  let wish = false;
  let governing = null;

  for (let i = 0; i < parsed.length; i += 1) {
    if (taken.has(i)) continue;
    const surface = fold(tokens[i]);

    // A preposition fixes the case of whatever follows it, which removes the
    // ambiguity that makes this hard everywhere else. `cum` is both preposition
    // and conjunction; standing last, with no noun to govern, it is the latter.
    if (LATIN_PREPOSITIONS[surface] && !(surface === 'cum' && i === parsed.length - 1)) {
      governing = { word: surface, cases: LATIN_PREPOSITIONS[surface] };
      taken.add(i);
      continue;
    }

    if (PARTICLES[surface]) {
      const particle = PARTICLES[surface];
      if (particle.kind === 'wish') wish = true;
      else particles.push(particle);
      taken.add(i);
      continue;
    }

    // The locative is dropped rather than ranked. It is a real case and
    // *puellae* genuinely has one, but no beginner's sentence means it — and
    // left in, it won every contest below, because a case absent from the order
    // list scored -1 and sorted first. That is how the subject of "agricolae
    // puellam laudant" silently disappeared.
    const candidates = parsed[i].filter((reading) => reading.inflection.case
      && reading.inflection.case !== 'locative');

    /**
     * A word that is recognised but fills no role is refused, never skipped.
     *
     * Skipping is how "puer laudet" became "The boy": the subjunctive was not
     * accepted as a verb, was not a noun either, and simply fell out of the
     * sentence — leaving a confident translation with its meaning removed. A
     * word this cannot place means the sentence is beyond it, and the chain
     * below should be given the chance instead.
     */
    if (!candidates.length) fail(`cannot place "${tokens[i]}"`);
    taken.add(i);

    const wanted = governing?.cases ?? null;
    const usable = wanted
      ? candidates.filter((reading) => wanted.includes(reading.inflection.case))
      : candidates;
    const chosen = pickCase(usable.length ? usable : candidates, phrases, shape);

    const gloss = glossFor(surface, chosen.analysis);
    if (!gloss) fail(`no English for ${surface}`);

    const modifier = chosen.pos === 'adjective' || String(chosen.pos).startsWith('verb participle');

    phrases.push({
      index: i,
      case: chosen.inflection.case,
      number: chosen.inflection.number || 'singular',
      role: governing ? 'prepositional' : CASE_ROLE[chosen.inflection.case],
      preposition: governing?.word ?? null,
      pos: chosen.pos,
      // Only nouns take an English plural. *laeta* is nominative feminine
      // singular and neuter plural at once, and pluralising the adjective gave
      // "the girl is happies".
      english: chosen.inflection.number === 'plural' && !modifier ? pluralise(gloss) : gloss,
      bare: gloss,
    });
    governing = null;
  }

  if (!verb && !phrases.length) fail('nothing recognisable');

  // Nothing may go missing between the parse and the sentence.
  for (let i = 0; i < parsed.length; i += 1) {
    if (!taken.has(i)) fail(`cannot place "${tokens[i]}"`);
  }

  return assembleEnglish(verb, phrases, { wish, particles });
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
  /**
   * An adjective agrees with its noun, and that is the answer before any
   * preference is consulted.
   *
   * *laeti* is nominative plural and genitive singular; in "pueri laeti sunt"
   * it plainly goes with *pueri*. Without this the nominative role was already
   * taken, the free-role preference chose the genitive, and the sentence came
   * out as "The boys of happy are".
   */
  const agreeing = candidates.filter((reading) => {
    const modifier = reading.pos === 'adjective'
      || String(reading.pos).startsWith('verb participle');
    if (!modifier) return false;
    return phrases.some((phrase) => phrase.case === reading.inflection.case
      && phrase.number === (reading.inflection.number || 'singular'));
  });
  if (agreeing.length) return agreeing[0];

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

/** Adjectives and participles describe; they do not take an article. */
function isModifier(phrase) {
  return phrase.pos === 'adjective' || String(phrase.pos).startsWith('verb participle');
}

function noun(phrase, attached = null) {
  const describing = attached?.get(phrase)?.join(' ');
  if (isModifier(phrase)) return phrase.english;
  return `the ${[describing, phrase.english].filter(Boolean).join(' ')}`;
}

function assembleEnglish(verb, phrases, { wish = false, particles = [] } = {}) {
  /**
   * *sum* takes a complement, not an object.
   *
   * "utinam mortuus essem" is "I wish I were dead" — *mortuus* is nominative,
   * but it describes the subject rather than being it, and read as a subject it
   * gave "I wish the dead were". So with a copula, a nominative that describes
   * (an adjective, or a participle like *mortuus*) becomes the complement; and
   * where two nouns are both nominative, the second one is.
   */
  const copula = verb?.analysis?.lemma === 'sum';
  const nominatives = phrases.filter((phrase) => phrase.role === 'subject');

  let complement = null;
  if (copula && nominatives.length) {
    complement = nominatives.find(isModifier)
      ?? (nominatives.length > 1 ? nominatives[nominatives.length - 1] : null);
  }

  /**
   * An adjective goes in front of its noun in English, and must not be left to
   * stand as a phrase of its own: "puer bonus agricolam laudat" rendered the
   * boy and the farmer and quietly lost *bonus*.
   */
  const attached = new Map();
  const modifiers = new Set();
  for (const phrase of phrases) {
    if (!isModifier(phrase) || phrase === complement) continue;
    const host = phrases.find((other) => other !== phrase && !isModifier(other)
      && other.case === phrase.case && other.number === phrase.number);
    if (!host) continue;
    if (!attached.has(host)) attached.set(host, []);
    attached.get(host).push(phrase.bare);
    modifiers.add(phrase);
  }

  const subject = phrases.find((phrase) => phrase.role === 'subject'
    && phrase !== complement && !modifiers.has(phrase));
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
    if (host) owned.set(host, `of ${noun(possessive, attached)}`);
  }

  const used = new Set(modifiers);
  const render = (phrase) => {
    if (!phrase) return null;
    used.add(phrase);
    const genitive = owned.get(phrase);
    if (genitive) used.add(possessives.find((one) => `of ${noun(one, attached)}` === genitive));
    return [noun(phrase, attached), genitive].filter(Boolean).join(' ');
  };

  const words = [];
  for (const particle of particles.filter((one) => one.kind === 'conjunction')) {
    words.push(particle.english);
  }
  if (wish) words.push('I wish');

  /**
   * Latin leaves the subject out whenever the ending says it, and English
   * cannot. Without this "laboro" translated as "work" rather than "I work",
   * and every first- and second-person sentence lost its subject.
   */
  if (subject) words.push(render(subject));
  else if (verb?.inflection.person) {
    words.push(IMPLIED_SUBJECT[verb.inflection.person]?.[verb.inflection.number || 'singular'] ?? 'he');
  }

  if (verb) {
    const gloss = glossFor(verb.surface, verb.analysis);
    if (!gloss) fail(`no English for ${verb.surface}`);
    const stem = verbStem(gloss);
    const negative = particles.some((one) => one.kind === 'negative');

    const conditional = particles.some((one) => ['if', 'unless'].includes(one.english));

    const built = verb.inflection.mood === 'subjunctive'
      ? subjunctiveVerb(stem, verb.inflection, wish, conditional)
      : englishVerb(stem, verb.inflection);

    words.push(negative ? notted(built) : built);
  }

  if (complement) words.push(render(complement));
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

  for (const particle of particles.filter((one) => one.kind === 'adverb')) {
    words.unshift(particle.english);
  }

  // Every parsed word reached the sentence, or the sentence is not a
  // translation of it. This is the same rule as the one upstream, applied to
  // the assembly rather than the parse.
  for (const phrase of phrases) {
    if (!used.has(phrase) && phrase !== complement) fail(`left out "${phrase.bare}"`);
  }

  const sentence = words.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!sentence) fail('nothing to say');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** Put an English verb phrase into the negative, wherever its auxiliary is. */
export function notted(phrase) {
  const [first, ...rest] = phrase.split(' ');
  if (rest.length) return [first, 'not', ...rest].join(' ');
  if (['is', 'are', 'was', 'were'].includes(first)) return `${first} not`;
  return `does not ${first.replace(/e?s$/, '')}`;
}

/* --------------------------------------------------------- English → Latin */

/**
 * An adjective in one case, number and gender.
 *
 * Adjectives do not decline like nouns and cannot be built with `formOf`, which
 * wants a nominative and a genitive: *laetus, laeta, laetum* is three genders,
 * not two principal parts, and asking formOf for it simply failed.
 */
function adjectiveForm(parts, gender, wantedCase, number) {
  const built = declineAdjective(adjectiveCitation(parts));
  return built?.table?.[gender || 'masculine']?.[number]?.[wantedCase] ?? null;
}

/**
 * Whitaker's adjective parts, expanded into a citation the decliner can read.
 *
 * They arrive compressed, the way a paper dictionary prints them:
 * `["laetus", "laeta -um", "laetior -or -us", …]` — comparative and superlative
 * included, and the neuter written as a bare ending. Handed over as they stand
 * they produced *laetaes*, which is not a word in any language.
 */
export function adjectiveCitation(principalParts) {
  const pieces = principalParts.slice(0, 2).join(' ').split(/[,\s]+/).filter(Boolean);
  if (!pieces.length) return '';

  const head = pieces[0];
  const stem = head.replace(/(?:us|er|is|e|s)$/, '');

  const expanded = pieces.map((piece) => (piece.startsWith('-') ? stem + piece.slice(1) : piece));
  return [...new Set(expanded)].slice(0, 3).join(', ');
}

/**
 * *sum* is written out rather than looked up.
 *
 * Its principal parts are irregular and its lemma collides: asking the lexicon
 * for "be" and analysing what came back landed on *sumo*, "I take", so "the boy
 * is good" was rendered *puer bonus sumit* — the boy takes goodly.
 */
const SUM = 'sum, esse, fui, futurus';

/** Find the Latin word for an English one, of the part of speech wanted. */
async function latinWord(english, wantedPos) {
  if (!english) return null;
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
  let negated = false;
  let copula = false;
  let subjectPerson = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (ARTICLES.has(token)) { article = true; continue; }

    // A pronoun subject is not a word in Latin, it is an ending. Read off and
    // dropped — "I work" is one word, laboro.
    if (SUBJECT_PRONOUNS[token] && !OBJECT_PRONOUNS[token]) {
      subjectPerson = SUBJECT_PRONOUNS[token];
      article = false;
      continue;
    }

    // "does not work" is non laborat: the auxiliary carries nothing Latin needs
    // and the negative is a word of its own, placed before the verb.
    if (['not', 'never', 'nt'].includes(token)) { negated = true; continue; }
    if (['do', 'does', 'did'].includes(token)) {
      if (token === 'did') tense = 'perfectum';
      continue;
    }

    if (article) { determined.add(content.length); article = false; }
    if (token === 'will') { tense = 'futurum'; continue; }
    if (['was', 'were'].includes(token)) {
      // "was working" is imperfect; "was happy" is the copula in the past.
      if (/ing$/.test(tokens[i + 1] ?? '')) tense = 'imperfectum';
      else { copula = true; tense = 'imperfectum'; }
      continue;
    }
    if (['has', 'have', 'had'].includes(token)) { tense = 'perfectum'; continue; }
    if (['is', 'are', 'am', 'be'].includes(token)) {
      // "is working" is a tense; "is happy" is *sum* with a complement.
      if (!/ing$/.test(tokens[i + 1] ?? '')) copula = true;
      continue;
    }
    content.push(token);
  }
  if (!content.length && !copula) fail('nothing to translate');

  // The verb, and everything else hangs off where it is.
  let verbAt = -1;
  let verb = null;

  if (copula) {
    verb = { surface: 'sum', analysis: { principalParts: SUM.split(', ') } };
    verbAt = content.length;   // the complement is everything before it
  }

  for (let i = 0; i < content.length && !verb; i += 1) {
    if (ENGLISH_PREPOSITIONS[content[i]]) continue;
    if (determined.has(i)) continue;

    for (const guess of verbCandidates(content[i])) {
      const found = await latinWord(guess, 'verb');
      if (found) { verb = found; verbAt = i; break; }
    }
    if (verb && isPastForm(content[i])) tense = 'perfectum';
  }

  // With a verb, everything before it is the subject and everything after it
  // hangs off the prepositions. With no verb — "the dog of the girl" — the
  // first preposition does the same job, and without this the phrase reached
  // the noun builder with "of" still inside it and failed for want of a Latin
  // word for it.
  const boundary = verbAt === -1
    ? content.findIndex((token) => ENGLISH_PREPOSITIONS[token])
    : verbAt;

  const before = copula
    ? content.slice(0, subjectPerson ? 0 : Math.max(0, content.length - 1))
    : content.slice(0, boundary === -1 ? content.length : boundary);

  const after = copula
    ? content.slice(subjectPerson ? 0 : Math.max(0, content.length - 1))
    : (boundary === -1 ? [] : content.slice(verbAt === -1 ? boundary : boundary + 1));

  /**
   * With *sum* the words after "is" describe the subject, so they go into the
   * nominative and not the accusative: "the boy is good" is *puer bonus est*,
   * never *puer bonum est*. The subject's gender is what they agree with, which
   * is why the complement is built after it rather than beside it.
   */
  const subject = before.length ? await nounPhrase(before, 'nominative') : null;
  const rest = copula
    ? []
    : await taggedPhrases(after);

  /**
   * What the complement has to agree with. An explicit subject gives its gender
   * and number; a pronoun subject gives only number, since "I am happy" says
   * nothing about who is speaking — masculine is the conventional default.
   */
  const agreement = subject
    ? { gender: subject.gender, number: subject.number }
    : { gender: 'masculine', number: subjectPerson?.number ?? 'singular' };

  const complement = copula && after.length
    ? await nounPhrase(after, 'nominative', null, agreement)
    : null;

  if (!verb && !subject && !rest.length) fail('nothing recognisable');

  const pieces = [];
  if (subject) pieces.push(...subject.words);
  if (complement) pieces.push(...complement.words);
  for (const phrase of rest) pieces.push(...phrase.words);

  if (verb) {
    const table = conjugate(verb.analysis.principalParts.join(', '))?.table;

    // The ending carries the person, whether it came from a pronoun that is not
    // written or from the number of a subject that is.
    const person = subjectPerson?.person ?? '3rd';
    const number = subjectPerson?.number ?? (subject?.number ?? 'singular');
    const cell = PERSON_CELL[person]?.[number] ?? 's3';

    const form = table?.indicativus?.[tense]?.[cell];
    if (!form) fail(`cannot conjugate ${verb.surface}`);
    if (negated) pieces.push('non');
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

/**
 * The forms an English verb might be hiding behind.
 *
 * More than one, because "praised" is *praise* with a d and *prais* with an ed,
 * and only the lexicon knows which. Returning a single guess meant "the boy
 * praised the farmer" failed for want of a Latin word for "prais".
 */
export function verbCandidates(token) {
  const guesses = [token];
  for (const [stem, past] of Object.entries(ENGLISH_PAST)) if (past === token) guesses.push(stem);
  if (/ied$/.test(token)) guesses.push(`${token.slice(0, -3)}y`);
  if (/ed$/.test(token) && token.length > 3) guesses.push(token.slice(0, -1), token.slice(0, -2));
  if (/ing$/.test(token) && token.length > 4) guesses.push(token.slice(0, -3), `${token.slice(0, -3)}e`);
  if (/e?s$/.test(token)) guesses.push(token.replace(/e?s$/, ''), token.replace(/s$/, ''));
  return [...new Set(guesses)].filter(Boolean);
}

export function baseVerb(token) {
  return verbCandidates(token)[1] ?? token;
}

/**
 * A run of English words as one Latin noun phrase, in the case its role wants.
 * Adjectives are put into the same case, number and gender as their noun, which
 * is the agreement the whole exercise is about.
 */
async function nounPhrase(tokens, wantedCase, preposition = null, agreeWith = null) {
  const words = tokens.filter((token) => !ARTICLES.has(token));
  if (!words.length) return null;

  /**
   * A complement agrees with its subject, not with itself.
   *
   * "the boys are happy" has nothing plural in the word *happy*, and reading
   * the number off the complement's own tokens gave *pueri laetus sunt* — a
   * plural subject with a singular adjective, which is the one mistake this
   * whole exercise exists to prevent.
   */
  const number = agreeWith?.number ?? (words.some(looksPlural) ? 'plural' : 'singular');

  // An object pronoun is a word Latin does write, and it is already in the
  // case it needs.
  if (words.length === 1 && OBJECT_PRONOUNS[words[0]] && wantedCase === 'accusative') {
    return { number: 'singular', gender: null, words: [preposition, OBJECT_PRONOUNS[words[0]]].filter(Boolean) };
  }

  const resolved = [];
  for (const token of words) {
    const singular = looksPlural(token)
      ? (singularsOf(token).find((one) => latinFor(one).length) ?? token)
      : token;
    const asNoun = await latinWord(singular, 'noun');
    const asAdjective = await latinWord(singular, 'adjective');
    if (!asNoun && !asAdjective) fail(`no Latin for "${token}"`);
    resolved.push({ token, asNoun, asAdjective });
  }

  /**
   * The head is the *last* word that can be a noun, because that is where
   * English puts it: in "the good boy", *good* can be a noun too (bonus is one)
   * and taking the first match made it the head and dropped *boy* on the floor
   * — "bonus agricolam laudat", a sentence about nobody.
   */
  let headAt = -1;
  for (let i = resolved.length - 1; i >= 0 && headAt === -1; i -= 1) {
    if (resolved[i].asNoun) headAt = i;
  }

  // With a copula the complement may be an adjective alone — "the boys are
  // happy" — and then there is no noun to find and none needed.
  if (headAt === -1) {
    if (!agreeWith) fail(`no noun in "${words.join(' ')}"`);
    const only = resolved.find((one) => one.asAdjective);
    if (!only) fail(`no noun in "${words.join(' ')}"`);
    const parts = only.asAdjective.analysis.principalParts;
    const form = adjectiveForm(parts, agreeWith.gender, wantedCase, number);
    if (!form) fail(`cannot decline ${only.asAdjective.surface}`);
    return { number, gender: agreeWith.gender, words: [preposition, form].filter(Boolean) };
  }

  const head = resolved[headAt].asNoun;
  const gender = head.analysis.gender;

  const parts = head.analysis.principalParts;
  const form = formOf(parts[0], parts[1] ?? parts[0], gender, wantedCase, number);
  if (!form) fail(`cannot decline ${head.surface}`);

  // Everything that is not the head has to be an adjective agreeing with it.
  // Nothing may be quietly left out.
  const rendered = [];
  for (let i = 0; i < resolved.length; i += 1) {
    if (i === headAt) continue;
    const { token, asAdjective } = resolved[i];
    if (!asAdjective) fail(`cannot place "${token}"`);
    const adjectiveParts = asAdjective.analysis.principalParts;
    const built = adjectiveForm(adjectiveParts, gender, wantedCase, number);
    if (!built) fail(`cannot decline ${asAdjective.surface}`);
    rendered.push(built);
  }

  return {
    number,
    gender,
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
/** What this engine calls itself, so the chain can tell its work from a guess. */
export const LATIN_RULES_ENGINE = 'Whitaker’s Words';

export async function latinRules(text, from, to) {
  if (from === 'la' && to === 'en') {
    return { text: await latinToEnglish(text), engine: LATIN_RULES_ENGINE };
  }
  if (from === 'en' && to === 'la') {
    return { text: await englishToLatin(text), engine: LATIN_RULES_ENGINE };
  }
  throw new Error(`the rules translator is Latin only, not ${from}|${to}`);
}
