/**
 * Latin into English, by parsing the sentence.
 *
 * No model. The claim this is built on is that a Latin sentence tells you what
 * every word is doing, if you ask it in the right order:
 *
 *   1. Find the verb. It ends in a personal ending, and the conjugator can
 *      confirm it by building the form back from the principal parts.
 *   2. The verb gives the person and number of the subject before the subject
 *      has even been looked at.
 *   3. A word after a preposition takes the case that preposition governs.
 *      That is not a guess, it is the definition of a preposition.
 *   4. An adjective agrees with its noun in case, number and gender, so an
 *      adjective next to a noun narrows both of them at once.
 *   5. The subject is the nominative whose number matches the verb.
 *   6. A genitive follows the noun it belongs to.
 *   7. What is left is the accusative (the object) and the dative (the one it
 *      is done for), and their endings do not look alike.
 *
 * Every case is settled by evidence rather than by ranking, which is the whole
 * difference from what stood here before. Where the evidence runs out the parse
 * is *refused* rather than guessed, and the caller falls back to a word list.
 *
 * The morphology is not taken on trust either. A reading counts only if this
 * site's own decliner or conjugator can produce the exact form from the
 * dictionary's principal parts. If it cannot build it, it does not claim it.
 */

import { conjugate } from '../public/js/lib/conjugator-la.js';
import { declineNoun, declineAdjective } from '../public/js/lib/decliner-la.js';
import { analyse } from './latin.js';
import { courseGloss, latinGlossOf, primeLatinGlosses } from './latin-lexicon.js';
import {
  adjectiveCitation, englishVerb, firstSense, pluralise, verbStem,
} from './latin-translate.js';

/**
 * Plural, unless the English is plural already.
 *
 * *arma* is glossed "arms" and *pluralise* made it "armses". Some Latin nouns
 * are plural in form and their dictionary gloss is plural in English too, so
 * the gloss has to be looked at before another *-s* is added to it.
 */
const ALREADY_PLURAL = /(?:s|people|men|women|children|feet|teeth)$/i;
const plural = (word) => (ALREADY_PLURAL.test(word) ? word : pluralise(word));

const fold = (word) => String(word ?? '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/j/g, 'i').replace(/v/g, 'u');
/**
 * The tables, keyed the way words are looked up in them.
 *
 * `fold` settles the letters Latin editions disagree about, and it turns *v*
 * into *u*. The tables are written with *v*, the way a dictionary prints them,
 * so every entry containing one silently failed to match: *valde*, *vos*,
 * *vobis*, and the prepositions with a *v* in them. "Valde volo flere" lost its
 * adverb because *valde* was never recognised as one.
 */
const folded = (table) => Object.fromEntries(
  Object.entries(table).map(([key, value]) => [fold(key), value]),
);

/* ------------------------------------------------------------- vocabulary */

/**
 * What each preposition governs.
 *
 * The single most useful fact in the whole parse: after one of these, the case
 * is decided. *in* and *sub* take both, and the difference is motion against
 * rest, which the verb usually settles; where it does not, ablative is the
 * commoner and is assumed.
 */
const PREPOSITIONS_RAW = {
  a: 'ablative', ab: 'ablative', cum: 'ablative', de: 'ablative', e: 'ablative',
  ex: 'ablative', pro: 'ablative', sine: 'ablative', prae: 'ablative', coram: 'ablative',
  ad: 'accusative', ante: 'accusative', apud: 'accusative', circum: 'accusative',
  contra: 'accusative', inter: 'accusative', ob: 'accusative', per: 'accusative',
  post: 'accusative', prope: 'accusative', propter: 'accusative', trans: 'accusative',
  supra: 'accusative', ultra: 'accusative', extra: 'accusative',
  in: 'both', sub: 'both', super: 'both',
};

const PREPOSITION_ENGLISH_RAW = {
  a: 'from', ab: 'from', cum: 'with', de: 'about', e: 'out of', ex: 'out of',
  pro: 'for', sine: 'without', prae: 'before', coram: 'before',
  ad: 'to', ante: 'before', apud: 'at', circum: 'around', contra: 'against',
  inter: 'among', ob: 'because of', per: 'through', post: 'after', prope: 'near',
  propter: 'because of', trans: 'across', supra: 'above', ultra: 'beyond',
  extra: 'outside', in: 'in', sub: 'under', super: 'over',
};

/** Indeclinables that are neither noun nor verb and would otherwise confuse the parse. */
const PARTICLES_RAW = {
  non: 'not', ne: 'not', et: 'and', atque: 'and', ac: 'and', sed: 'but', aut: 'or',
  vel: 'or', nam: 'for', enim: 'for', autem: 'however', tamen: 'however',
  igitur: 'therefore', ergo: 'therefore', itaque: 'and so', quoque: 'also',
  etiam: 'also', iam: 'now', nunc: 'now', tum: 'then', tunc: 'then', deinde: 'then',
  semper: 'always', numquam: 'never', saepe: 'often', statim: 'at once',
  hodie: 'today', heri: 'yesterday', cras: 'tomorrow', ita: 'so', sic: 'thus',
  valde: 'very much', quam: 'than', si: 'if', nisi: 'unless', quod: 'because',
  quia: 'because', ubi: 'when', dum: 'while', olim: 'once', hic: 'here',
  ibi: 'there', unde: 'from where', bene: 'well', male: 'badly', diu: 'for a long time',
};

/** The pronouns, which the morphology service does not hold. */
const PRONOUNS_RAW = {
  ego: { english: 'I', case: 'nominative', number: 'singular', person: '1st' },
  mei: { english: 'me', case: 'genitive', number: 'singular', person: '1st' },
  mihi: { english: 'me', case: 'dative', number: 'singular', person: '1st' },
  me: { english: 'me', case: 'accusative', number: 'singular', person: '1st' },
  tu: { english: 'you', case: 'nominative', number: 'singular', person: '2nd' },
  tui: { english: 'you', case: 'genitive', number: 'singular', person: '2nd' },
  tibi: { english: 'you', case: 'dative', number: 'singular', person: '2nd' },
  te: { english: 'you', case: 'accusative', number: 'singular', person: '2nd' },
  nos: { english: 'we', case: 'nominative', number: 'plural', person: '1st' },
  nobis: { english: 'us', case: 'dative', number: 'plural', person: '1st' },
  vos: { english: 'you', case: 'nominative', number: 'plural', person: '2nd' },
  vobis: { english: 'you', case: 'dative', number: 'plural', person: '2nd' },
  is: { english: 'he', case: 'nominative', number: 'singular', person: '3rd' },
  ea: { english: 'she', case: 'nominative', number: 'singular', person: '3rd' },
  id: { english: 'it', case: 'nominative', number: 'singular', person: '3rd' },
  eum: { english: 'him', case: 'accusative', number: 'singular', person: '3rd' },
  eam: { english: 'her', case: 'accusative', number: 'singular', person: '3rd' },
  ei: { english: 'him', case: 'dative', number: 'singular', person: '3rd' },
  se: { english: 'himself', case: 'accusative', number: 'singular', person: '3rd' },
};

/** Particles that modify the verb, so they stand next to it rather than in front. */
const ADVERBS = new Set([
  'very much', 'always', 'never', 'often', 'now', 'then', 'at once', 'also',
  'still', 'already', 'well', 'badly', 'for a long time', 'so', 'thus',
]);

const PREPOSITIONS = folded(PREPOSITIONS_RAW);
const PREPOSITION_ENGLISH = folded(PREPOSITION_ENGLISH_RAW);
const PARTICLES = folded(PARTICLES_RAW);
const PRONOUNS = folded(PRONOUNS_RAW);

/** Personal endings. A word ending in one of these is worth testing as a verb. */
const PERSONAL_ENDINGS = [
  'mus', 'tis', 'nt', 'ur', 'mur', 'mini', 'ntur', 'm', 'o', 's', 't', 'i', 'it',
  'isti', 'imus', 'istis', 'erunt', 'ere',
];

const looksVerbal = (word) => PERSONAL_ENDINGS.some((end) => fold(word).endsWith(end));


/**
 * Verbs that take a dative, which is what decides between a dative and a
 * genitive when a noun could be either.
 *
 * *puellae* is both. The question is not which ending is commoner but whether
 * this sentence has anyone to give something to, and that is a fact about the
 * verb: you give, send, show, tell, promise or entrust *to* someone. "Agricola
 * puellae rosam dat" has *dat*, so the rose goes to the girl. "Poeta libros
 * poetae legit" has *legit*, which takes no dative at all, so they are the
 * poet's books.
 *
 * Latin also has verbs that govern the dative outright rather than as a second
 * object: *credo*, *pareo*, *noceo*, *faveo*, *studeo* and the rest of the list
 * every course teaches together.
 */
const DATIVE_VERBS = new Set([
  'do', 'dono', 'trado', 'reddo', 'mitto', 'dico', 'narro', 'monstro', 'ostendo',
  'promitto', 'offero', 'praebeo', 'commendo', 'mando', 'scribo', 'nuntio',
  'respondeo', 'credo', 'faveo', 'noceo', 'pareo', 'persuadeo', 'placeo',
  'displiceo', 'servio', 'studeo', 'ignosco', 'impero', 'appropinquo', 'nubo',
  'confido', 'diffido', 'invideo', 'parco', 'resisto', 'subvenio', 'succurro',
]);

const takesDative = (lemma) => DATIVE_VERBS.has(fold(lemma));

/* ------------------------------------------------------ verified readings */

/**
 * The most useful sense of a definition, which is rarely the first one.
 *
 * Whitaker's orders senses by something that is not usefulness, and taking the
 * first gave the worst reading of half the vocabulary:
 *
 *   fleo       "cry for; cry, weep"                          -> cry for
 *   citrus     "African citrus tree; ...; citron"             -> African citrus tree
 *   translatio "transporting; ...; translation"               -> transporting
 *
 * The rule is the first sense that is a single word, in the order they were
 * written. Order still carries the dictionary's judgement about which meaning
 * is primary, so it is kept; a single word is what separates a meaning from a
 * gloss on a meaning. Taking the shortest instead of the first single word read
 * *scelus* as "sin" when "crime" was sitting in front of it.
 *
 * A slash is Whitaker listing alternatives inside one sense, so the first
 * alternative is taken rather than the sense being thrown away: *epistula* is
 * "letter/dispatch/written communication; imperial rescript; epistle" and
 * discarding the slashed sense left "epistle" as the first single word.
 * Brackets are notes about the entry and are dropped.
 */
export function bestSense(definition) {
  const text = String(definition ?? '')
    .replace(/\([^)]*\)/g, ' ')      // "(Citrus medica)", "(L+S)"
    .replace(/\[[^\]]*\]/g, ' ');
  const senses = text
    .split(/[;,]/)
    .map((piece) => piece.trim().replace(/\.$/, ''))
    .map((piece) => piece.split('/')[0].trim())
    .filter(Boolean)
    .filter((piece) => !/^(?:etc|esp|cf|w |or |also)\b/i.test(piece));

  if (!senses.length) return firstSense(definition);
  return senses.find((sense) => !/\s/.test(sense)) ?? senses[0];
}

/**
 * English for a lemma: the course list first, because a class taught one word
 * for it should be given that word, then the dictionary's own definition.
 */
function glossOf(analysis) {
  const course = courseGloss(analysis.lemma);
  if (course) return bestSense(course);
  return bestSense(analysis.definition ?? latinGlossOf(analysis.lemma)) ?? null;
}

/**
 * Every way this word can be read as a verb, confirmed by building it.
 *
 * The dictionary is asked which verbs the form might belong to; the conjugator
 * then builds the whole paradigm from the principal parts and the form is
 * looked for in it. A reading survives only if the engine actually produces
 * that spelling, which is what makes the person, number, tense and mood facts
 * rather than assumptions.
 */
function verbReadings(word, analyses) {
  const found = [];
  for (const analysis of analyses) {
    if (analysis.pos !== 'verb') continue;
    const parts = (analysis.principalParts ?? []).join(', ');
    if (!parts) continue;

    const built = conjugate(parts);
    if (!built.ok) continue;

    /**
     * The table has two shapes, and only one of them was being read.
     *
     * A finite mood nests mood, then tense, then person. The non-finite forms
     * sit flat under `formae`: the infinitives, the participles, the gerund and
     * the supine, keyed straight by name. The loop required a second object to
     * descend into, so it skipped all of them, and every infinitive in the
     * language was invisible to the parser. "Valde volo flere" lost its *flere*
     * that way and came back as "I very much want".
     */
    const push = (mood, tense, slot, form) => {
      if (typeof form !== 'string' || fold(form) !== fold(word)) return;
      found.push({
        kind: 'verb',
        lemma: analysis.lemma,
        gloss: glossOf(analysis),
        mood,
        tense,
        slot,
        person: { s1: '1st', s2: '2nd', s3: '3rd', p1: '1st', p2: '2nd', p3: '3rd' }[slot] ?? '3rd',
        number: /^p/.test(slot) ? 'plural' : 'singular',
        passive: /Passivum$/.test(tense ?? ''),
      });
    };

    for (const [mood, branch] of Object.entries(built.table)) {
      for (const [key, value] of Object.entries(branch ?? {})) {
        if (typeof value === 'string') { push(mood, '', key, value); continue; }
        if (!value || typeof value !== 'object') continue;
        for (const [slot, form] of Object.entries(value)) push(mood, key, slot, form);
      }
    }
  }
  return found;
}

/**
 * Every way this word can be read as a noun, confirmed by declining it.
 *
 * Same principle: the decliner builds the table from the nominative and the
 * genitive the dictionary gives, and the form has to appear in it. *puellae*
 * comes back as genitive, dative and nominative plural because the table says
 * all three, and the parse below is what chooses between them.
 */
function nounReadings(word, analyses) {
  const found = [];
  for (const analysis of analyses) {
    if (analysis.pos !== 'noun') continue;
    const [nominative, genitive] = analysis.principalParts ?? [];
    if (!nominative || !genitive) continue;

    const built = declineNoun(nominative, genitive, analysis.gender || '');
    if (!built.ok) continue;

    for (const number of ['singular', 'plural']) {
      for (const [grammaticalCase, form] of Object.entries(built.table[number] ?? {})) {
        if (fold(form) !== fold(word)) continue;
        found.push({
          kind: 'noun',
          lemma: analysis.lemma,
          gloss: glossOf(analysis),
          case: grammaticalCase,
          number,
          gender: built.gender || analysis.gender || '',
        });
      }
    }
  }
  return found;
}

/** The same for adjectives, which carry a gender as well. */
function adjectiveReadings(word, analyses) {
  const found = [];
  for (const analysis of analyses) {
    if (analysis.pos !== 'adjective') continue;
    const citation = adjectiveCitation(analysis.principalParts ?? []);
    if (!citation) continue;

    const built = declineAdjective(citation);
    if (!built.ok) continue;

    for (const gender of ['masculine', 'feminine', 'neuter']) {
      for (const number of ['singular', 'plural']) {
        for (const [grammaticalCase, form] of Object.entries(built.table[gender]?.[number] ?? {})) {
          if (fold(form) !== fold(word)) continue;
          found.push({
            kind: 'adjective',
            lemma: analysis.lemma,
            gloss: glossOf(analysis),
            case: grammaticalCase,
            number,
            gender,
          });
        }
      }
    }
  }
  return found;
}

/* --------------------------------------------------------------- the parse */

/**
 * The sentence, cut into clauses.
 *
 * Each clause gets one verb and one set of roles, so they have to be separated
 * before anything else is decided. Punctuation does most of it; a coordinating
 * conjunction does the rest, but only where both halves have a verb, since
 * *et* joins two nouns far more often than two clauses.
 */
export function splitClauses(text) {
  const rough = String(text)
    .split(/[;:.!?]+|,(?=\s)/)
    .map((piece) => piece.trim())
    .filter(Boolean);

  const out = [];
  for (const piece of rough) {
    const words = piece.split(/\s+/);
    const verbs = words.filter(looksVerbal).length;

    /**
     * A piece with no verb in it is not a clause.
     *
     * "Veni, puella" is one sentence: an imperative and the person it is
     * addressed to. Split on the comma and the second half has no verb, the
     * parse refuses, and a two word sentence falls through to the word list.
     * It belongs to the clause before it.
     */
    if (!verbs && out.length) { out[out.length - 1] += `, ${piece}`; continue; }
    if (verbs < 2) { out.push(piece); continue; }

    // Two verbs in one piece: try the conjunctions.
    const at = words.findIndex((word, i) => i > 0 && ['et', 'sed', 'aut', 'atque', 'ac', 'vel', 'nam'].includes(fold(word)));
    if (at === -1) { out.push(piece); continue; }
    out.push(words.slice(0, at).join(' '), words.slice(at + 1).join(' '));
  }
  return out.filter(Boolean);
}

const strip = (word) => word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');

/**
 * Latin writes "and" on the back of the word it joins.
 *
 * *virumque* is *virum* plus *-que*, and a parser that does not take them apart
 * is looking up a word nobody wrote. The genuine words ending in those letters
 * are few enough to list.
 */
const NOT_ENCLITIC = new Set([
  'que', 'neque', 'atque', 'itaque', 'denique', 'undique', 'usque', 'absque',
  'quisque', 'quaeque', 'quodque', 'quemque', 'cuiusque', 'quoque', 'uterque',
  'utraque', 'utrumque', 'plerumque', 'quicumque', 'namque', 'cumque',
]);

function splitEnclitic(word) {
  const key = fold(word);
  if (!key.endsWith('que') || key.length <= 5 || NOT_ENCLITIC.has(key)) return null;
  return word.slice(0, -3);
}

/** Look every word up once, for the whole sentence. */
async function readAll(rawWords) {
  /**
   * The enclitic is noted on the word that carried it, not made a word of its
   * own. Emitted as a separate *et* it drifted to the front of the sentence,
   * and "servus dominumque videt" came out as "And the slave sees the master";
   * the "and" belongs to the master.
   */
  const words = [];
  const joined = new Set();
  for (const word of rawWords) {
    const stem = splitEnclitic(word);
    if (stem) joined.add(words.length);
    words.push(stem ?? word);
  }

  await primeLatinGlosses(words).catch(() => {});
  const analyses = await Promise.all(words.map((word) => analyse(word).catch(() => [])));

  return words.map((word, i) => {
    const key = fold(word);
    if (PREPOSITIONS[key]) return { word, role: 'preposition', governs: PREPOSITIONS[key], english: PREPOSITION_ENGLISH[key] };
    /**
     * A pronoun is a noun as far as the rest of the parse is concerned.
     *
     * It used to be its own kind of token with the case hanging off the token
     * rather than sitting in a `nouns` list, and every step that assigns a role
     * reads that list. So only the subject step ever saw a pronoun, and every
     * pronoun object in the language was dropped: "te amo" came out as "I
     * love". The `role` is kept because the renderer needs it (a pronoun takes
     * no article and is never pluralised), but the reading now lives where
     * everything else looks for it.
     */
    if (PRONOUNS[key]) {
      const pronoun = PRONOUNS[key];
      return {
        word,
        role: 'pronoun',
        verbs: [],
        adjectives: [],
        nouns: [{
          kind: 'noun', lemma: key, gloss: pronoun.english,
          case: pronoun.case, number: pronoun.number, gender: '',
        }],
      };
    }
    if (PARTICLES[key]) return { word, role: 'particle', english: PARTICLES[key] };

    const found = analyses[i];
    return {
      word,
      role: 'word',
      joined: joined.has(i),
      verbs: verbReadings(word, found),
      nouns: nounReadings(word, found),
      adjectives: adjectiveReadings(word, found),
    };
  });
}

/**
 * Which word is the verb.
 *
 * Every word that the conjugator could build is a candidate; the last one wins,
 * because Latin puts its verb at the end and a form that is both a verb and
 * something else is usually the something else earlier in the clause. A finite
 * form beats a participle or an infinitive, which are not the clause's verb.
 */
/**
 * Is anyone being spoken to?
 *
 * An imperative addresses someone, so a vocative is the evidence for one. The
 * test is not that a word *could* be vocative, since the vocative and the
 * nominative are the same in most declensions, but that it could be vocative
 * and is not needed as the subject: a bare noun that no finite verb agrees
 * with, or one set off by a comma.
 */
function findVocative(tokens, at) {
  for (const [index, token] of tokens.entries()) {
    if (index === at || token.role !== 'word') continue;
    const vocative = (token.nouns ?? []).find((r) => r.case === 'vocative');
    if (vocative) return { index, reading: vocative };
  }
  return null;
}

function findVerb(tokens) {
  const finite = (reading) => reading.mood === 'indicativus' || reading.mood === 'coniunctivus';
  let best = null;

  /**
   * An imperative is not the default reading of an ambiguous form.
   *
   * *veni* is both "come!" and "I came". The order is: notice that it could be
   * an imperative, then look for somebody being addressed. Found one, and it is
   * a command; found none, and it is almost certainly the indicative, because
   * an order with nobody to obey it is the rarer sentence by far.
   */
  for (const [index, token] of tokens.entries()) {
    if (token.role !== 'word') continue;
    if (!token.verbs.some((v) => v.mood === 'imperativus')) continue;
    if (findVocative(tokens, index)) return null;
  }
  for (const [index, token] of tokens.entries()) {
    if (token.role !== 'word' || !token.verbs.length) continue;
    const reading = token.verbs.find(finite) ?? null;
    if (!reading) continue;
    // A word that also declines as a noun is only the verb if nothing else is.
    const alsoNoun = token.nouns.length > 0;
    if (!best || !alsoNoun || best.alsoNoun) best = { index, token, reading, alsoNoun };
  }
  return best;
}

/**
 * An infinitive that is not the clause's verb, and the verb it completes.
 *
 * *volo flere* is "I want to weep": the finite verb carries the person and the
 * infinitive carries the action. Latin writes them side by side and English
 * writes "to" between them, and without this the infinitive was simply dropped
 * and "valde volo flere" came out as "I want".
 */
function findInfinitive(tokens, verbIndex) {
  for (const [index, token] of tokens.entries()) {
    if (index === verbIndex || token.role !== 'word') continue;
    const reading = (token.verbs ?? []).find((v) => v.mood === 'formae' && /^infinitivus/i.test(v.slot));
    if (reading) return { index, reading };
  }
  return null;
}

/**
 * The imperative, which is a different shape of sentence.
 *
 * "Come, Mia" has no nominative subject and may have a vocative instead, so it
 * is worth telling apart before the subject is looked for at all.
 */
function findImperative(tokens) {
  for (const [index, token] of tokens.entries()) {
    if (token.role !== 'word') continue;
    const reading = token.verbs.find((v) => v.mood === 'imperativus');
    if (reading) return { index, token, reading };
  }
  return null;
}

/**
 * Settle the case of every word in one clause.
 *
 * The order is the order of certainty. A preposition decides the word after it
 * outright; agreement decides an adjective and its noun together; the verb
 * decides the subject's number; a noun after a noun is a genitive. Only what
 * survives all of that is left to the endings alone, and by then the endings
 * are enough.
 */
function resolveClause(tokens) {
  const verb = findVerb(tokens);
  const imperative = verb ? null : findImperative(tokens);
  const head = verb ?? imperative;
  const infinitiveAt = head ? findInfinitive(tokens, head.index)?.index : undefined;

  const settled = new Map();
  const set = (index, reading, why) => settled.set(index, { ...reading, why });

  // 1. A word after a preposition takes the case that preposition governs.
  const prepositional = [];
  for (const [index, token] of tokens.entries()) {
    if (token.role !== 'preposition') continue;
    const next = tokens[index + 1];
    if (!next || next.role === 'preposition') continue;

    const wanted = token.governs === 'both' ? ['ablative', 'accusative'] : [token.governs];
    const candidates = (next.nouns ?? []).concat(next.adjectives ?? []);
    const reading = wanted.map((c) => candidates.find((r) => r.case === c)).find(Boolean)
      ?? (next.role === 'pronoun' ? next : null);
    if (!reading) continue;

    set(index + 1, reading, 'after a preposition');
    prepositional.push({ preposition: token, at: index + 1 });
  }

  /**
   * 2. An adjective agrees with the noun beside it, which narrows both.
   *
   * The agreement is recorded, not resolved. *magna puella* share the
   * nominative, the vocative and the ablative, so demanding a single shared
   * reading here threw the adjective away entirely and "magna puella librum
   * portat" came out as "the girl carries the book". Which of the shared
   * readings it is gets decided later, by the verb; the adjective then simply
   * follows its noun.
   */
  const agreed = new Map();
  for (const [index, token] of tokens.entries()) {
    if (token.role !== 'word' || !token.adjectives.length || settled.has(index)) continue;

    for (const neighbour of [index - 1, index + 1]) {
      const other = tokens[neighbour];
      if (!other || other.role !== 'word' || !other.nouns?.length) continue;

      const shared = [];
      for (const adjective of token.adjectives) {
        for (const noun of other.nouns) {
          if (adjective.case !== noun.case || adjective.number !== noun.number) continue;
          if (adjective.gender && noun.gender && adjective.gender !== noun.gender) continue;
          shared.push([adjective, noun]);
        }
      }
      if (!shared.length) continue;

      agreed.set(index, { describes: neighbour, shared });
      // The noun is now limited to what it can share with its adjective.
      tokens[neighbour] = { ...other, nouns: [...new Set(shared.map(([, n]) => n))] };
      break;
    }
  }

  /**
   * 3. The verb has already said who the subject is.
   *
   * A first or second person verb carries its own subject, and Latin writes it
   * out only for emphasis: *sum* is "I am" and the subject is I. A noun
   * standing in the nominative beside it is therefore not the subject but what
   * the subject is said to be. Letting a noun take the slot read "mortuus sum"
   * as "The dead am", with the adjective as subject and nobody doing the being.
   *
   * So for the first and second persons only an explicit pronoun can be the
   * subject, and for the third the nominative noun is looked for as before.
   */
  if (verb && !verb.reading.passive) {
    const wanted = verb.reading.number;
    const third = verb.reading.person === '3rd';
    for (const [index, token] of tokens.entries()) {
      if (settled.has(index) || index === verb.index) continue;
      if (token.role !== 'word' && token.role !== 'pronoun') continue;
      if (!third && token.role !== 'pronoun') continue;
      const reading = (token.nouns ?? []).find((r) => r.case === 'nominative' && r.number === wanted);
      if (reading) { set(index, reading, 'the subject'); break; }
    }
  }

  /**
   * 3b. What the subject is said to be.
   *
   * *sum* takes a complement, not an object, and the complement agrees with the
   * subject: "vita est similis" is life being similar. It has to be settled
   * before the genitive rule, because *similis* is also the genitive singular
   * of a noun *simile*, "a comparison" — and reading it that way turned "life
   * is like a little bag" into "the life of the comparison". Adjacency is no
   * help either, since the verb stands between the two words it joins.
   */
  const linking = verb && /^(?:sum|esse)$/.test(fold(verb.reading.lemma));
  if (linking) {
    const subject = [...settled.entries()].find(([, r]) => r.why === 'the subject');
    const number = subject?.[1]?.number ?? verb.reading.number;

    /**
     * With *sum*, an adjective agreeing with the subject is what the subject is
     * said to be, not a description attached to it.
     *
     * Adjacency cannot tell the two apart, and the agreement step above runs on
     * adjacency: *bonae* sits next to *feminae* in "feminae bonae sunt", so it
     * was taken as attributive and the sentence came out "The good women are",
     * which is not a sentence. *sum* needs a complement and there is nothing
     * else in the clause to be one.
     */
    const attributive = [...agreed.entries()]
      .find(([, link]) => subject && link.describes === subject[0]);
    if (attributive) {
      const [index, link] = attributive;
      const reading = link.shared.find(([a]) => a.case === 'nominative' && a.number === number)?.[0];
      if (reading) { agreed.delete(index); settled.delete(index); set(index, { ...reading, complement: true }, 'what the subject is said to be'); }
    }

    for (const [index, token] of tokens.entries()) {
      if (settled.has(index) || token.role !== 'word') continue;
      const reading = (token.adjectives ?? [])
        .find((r) => r.case === 'nominative' && r.number === number)
        // "puella sum" is "I am a girl": with *sum* and no noun subject, a
        // nominative noun is what the subject is, not who is doing it.
        ?? (token.nouns ?? []).find((r) => r.case === 'nominative' && r.number === number);
      if (reading) { set(index, { ...reading, complement: true }, 'what the subject is said to be'); break; }
    }
  }

  /**
   * 3c. An adjective with no noun to agree with.
   *
   * "Me sanus periclitor iuvo" has *sanus*, nominative, and nothing beside it
   * to agree with: the subject is carried by the verb. English says it as an
   * apposition, "healthy, I help". Without this the word was simply dropped.
   */
  for (const [index, token] of tokens.entries()) {
    if (settled.has(index) || token.role !== 'word' || agreed.has(index)) continue;
    const reading = (token.adjectives ?? []).find((r) => r.case === 'nominative');
    // An apposition, not a complement: *sum* is what takes a complement, and
    // this clause's verb is something else. English puts it at the front,
    // "healthy, I help you", rather than after the verb it does not belong to.
    if (reading) set(index, { ...reading, apposition: true }, 'said of the subject');
  }

  /**
   * 4. The object, and the one it is done for.
   *
   * Before the genitive, not after it, because *puellae* is genitive, dative
   * and nominative plural at once and only the clause can say which. "Agricola
   * puellae rosam dat" has an accusative already, so a spare noun that can be
   * dative is the one the rose is being given *to*. Without an object there is
   * nothing to give and the same word is a genitive: "villa agricolae" is the
   * farmer's villa.
   */
  const nouny = (token) => token.role === 'word' || token.role === 'pronoun';

  const hasObject = tokens.some((token, index) => (
    !settled.has(index) && nouny(token)
    && (token.nouns ?? []).some((r) => r.case === 'accusative')
  ));
  const dativeVerb = Boolean(verb && takesDative(verb.reading.lemma));

  let objectTaken = false;
  for (const [index, token] of tokens.entries()) {
    if (settled.has(index) || !nouny(token)) continue;
    const readings = token.nouns ?? [];

    const accusative = readings.find((r) => r.case === 'accusative');
    if (accusative && !objectTaken) { set(index, accusative, 'the object'); objectTaken = true; continue; }

    /**
     * A dative only where the verb has someone to give something to.
     *
     * Position is the tie-breaker after that: a noun sitting directly behind
     * the object belongs to it, so "poeta libros poetae legit" is the poet's
     * books whatever the verb does.
     */
    const previous = settled.get(index - 1);
    const behindTheObject = previous?.why === 'the object';
    const genitive = readings.find((r) => r.case === 'genitive');
    const dative = readings.find((r) => r.case === 'dative');

    if (genitive && (behindTheObject || !dativeVerb)) {
      set(index, { ...genitive, of: index - 1 }, 'follows the noun it belongs to');
      continue;
    }
    if (dative && dativeVerb) { set(index, dative, 'the one it is done for'); continue; }
    if (dative && hasObject && !genitive) { set(index, dative, 'the one it is done for'); continue; }
  }

  // 5. A genitive follows the noun it belongs to.
  for (const [index, token] of tokens.entries()) {
    if (settled.has(index) || !nouny(token)) continue;
    const previous = tokens[index - 1];
    const previousIsNoun = previous
      && (settled.get(index - 1)?.kind === 'noun' || previous.role === 'pronoun'
        || (previous.role === 'word' && previous.nouns?.length));
    if (!previousIsNoun) continue;
    const reading = (token.nouns ?? []).find((r) => r.case === 'genitive');
    if (reading) set(index, { ...reading, of: index - 1 }, 'follows the noun it belongs to');
  }

  // 6. Whatever is left is settled by its ending alone, and by now the endings
  //    that are still in play do not look alike.
  for (const [index, token] of tokens.entries()) {
    if (settled.has(index) || token.role !== 'word') continue;
    const readings = token.nouns ?? [];
    const vocative = imperative && readings.find((r) => r.case === 'vocative');
    const chosen = vocative
      ?? readings.find((r) => r.case === 'dative')
      ?? readings.find((r) => r.case === 'ablative')
      ?? readings.find((r) => r.case === 'genitive')
      ?? readings[0];
    if (chosen) set(index, chosen, 'by its ending');
  }

  /**
   * 7. Every adjective follows the noun it agreed with, now that the noun's
   *    case is known. One that agreed with nothing, in a clause whose verb is
   *    *sum*, is the complement: "villa est magna" says the house is big.
   */
  for (const [index, link] of agreed.entries()) {
    const noun = settled.get(link.describes);
    const match = noun && link.shared.find(([, n]) => n.case === noun.case && n.number === noun.number);
    if (match) { set(index, { ...match[0], describes: link.describes }, 'agrees with its noun'); continue; }
    const nominative = link.shared.find(([a]) => a.case === 'nominative');
    if (nominative) set(index, { ...nominative[0], complement: true }, 'what the subject is said to be');
  }

  /**
   * Words the parse could not place.
   *
   * They are shown, not dropped and not refused over. Dropping them hid the
   * failure: "me sanus periclitor iuvo" came back as "I help", three words
   * lighter, with nothing to say anything was missing. Refusing hid it just as
   * well, and a parser that declines whenever it is not certain declines almost
   * everything. So the sentence is rendered as far as it goes and the leftovers
   * are put at the end in brackets, where they are a visible bug rather than an
   * invisible one.
   */
  const leftOver = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token, index }) => (
      !settled.has(index) && index !== head?.index && index !== infinitiveAt
      && token.role !== 'preposition' && token.role !== 'particle'
      && ((token.nouns?.length ?? 0) || (token.adjectives?.length ?? 0) || (token.verbs?.length ?? 0))
    ))
    .map(({ token }) => token.word);

  return { verb, imperative, head, settled, prepositional, leftOver };
}

/* ------------------------------------------------------------- the English */

const TENSE_ENGLISH = {
  praesens: 'present', imperfectum: 'imperfect', futurum: 'future',
  perfectum: 'perfect', plusquamperfectum: 'pluperfect', futurumExactum: 'future',
  praesensPassivum: 'present', imperfectumPassivum: 'imperfect',
  perfectumPassivum: 'perfect', plusquamperfectumPassivum: 'pluperfect',
};

/** "the girl", "the big girls": the noun with whatever describes it. */
function nounPhrase(index, tokens, settled, { article = 'the' } = {}) {
  const reading = settled.get(index);
  if (!reading) return '';

  const noun = reading.gloss || tokens[index].word;
  // A pronoun already carries its own number: "you" is not "yous".
  const bare = tokens[index].role === 'pronoun';
  const head = !bare && reading.number === 'plural' ? plural(noun) : noun;

  const adjectives = [...settled.entries()]
    .filter(([, r]) => r.describes === index)
    .map(([, r]) => r.gloss)
    .filter(Boolean);

  const words = [tokens[index].joined ? 'and' : '', bare ? '' : article, ...adjectives, head].filter(Boolean);
  let phrase = words.join(' ');

  // A genitive hanging off this noun comes after it, as English puts it.
  for (const [at, r] of settled.entries()) {
    if (r.of !== index) continue;
    const owner = r.gloss || tokens[at].word;
    phrase += ` of the ${r.number === 'plural' ? plural(owner) : owner}`;
  }
  return phrase;
}

/**
 * One clause, in English.
 *
 * Subject, verb, object, the one it was done for, then the prepositional
 * phrases: the order English uses, which is the order Latin does not.
 */
function renderClause(tokens, parsed) {
  const { verb, imperative, settled, prepositional, leftOver } = parsed;
  const head = verb ?? imperative;

  /**
   * No verb at all.
   *
   * A phrase rather than a sentence, or a sentence the parser could not find
   * the verb of. Either way it says what it does know: the words in order, with
   * what each one is. Returning nothing meant the reader saw an error where
   * half an answer was available.
   */
  if (!head) {
    const known = tokens
      .map((token, index) => {
        if (token.role === 'preposition' || token.role === 'particle') return token.english;
        const reading = settled.get(index);
        if (!reading) return null;
        // An adjective is already inside the phrase of the noun it describes,
        // and a genitive inside the phrase of what it belongs to. Printing them
        // again gave "In the big house the big".
        if (reading.describes !== undefined || reading.of !== undefined) return null;
        return nounPhrase(index, tokens, settled);
      })
      .filter(Boolean);
    const words = known.length ? known.join(' ') : tokens.map((t) => t.word).join(' ');
    return leftOver.length ? `${words} [${leftOver.join(' ')}]` : words;
  }

  const roleOf = (name) => [...settled.entries()]
    .find(([, r]) => r.why === name && r.kind !== 'adjective');

  const inPhrase = new Set(prepositional.map((p) => p.at));
  const pieces = [];

  // An apposition stands in front of the whole clause, set off by a comma.
  const appositions = [...settled.entries()]
    .filter(([, r]) => r.apposition)
    .map(([index, r]) => r.gloss || tokens[index].word);

  // Adverbs go between the subject and the verb, where English puts them:
  // "I very much want", not "Very much I want".
  const adverbs = tokens
    .filter((t) => t.role === 'particle' && ADVERBS.has(t.english))
    .map((t) => t.english);

  // Subject.
  const subject = roleOf('the subject');
  if (subject) pieces.push(nounPhrase(subject[0], tokens, settled));
  else if (verb) {
    // Latin drops a subject its verb already carries; English cannot.
    pieces.push({ '1st': verb.reading.number === 'plural' ? 'we' : 'I',
      '2nd': 'you',
      '3rd': verb.reading.number === 'plural' ? 'they' : 'it' }[verb.reading.person]);
  }

  pieces.push(...adverbs);

  // Verb.
  const stem = verbStem(head.reading.gloss || head.token.word);
  if (imperative) pieces.length = 0;

  let verbEnglish = imperative ? stem : englishVerb(stem, {
    tense: TENSE_ENGLISH[head.reading.tense] ?? 'present',
    number: head.reading.number,
    person: head.reading.person,
  });

  /**
   * Negation goes on the verb, which is why it is done here.
   *
   * It used to be a regular expression over the finished sentence, rewriting
   * the first two words on the assumption that they were the subject and the
   * verb. A subject of more than one word broke it: "servi dominum non
   * viderunt" came out as "The do not slav saw the master".
   */
  if (tokens.some((t) => t.role === 'particle' && t.english === 'not')) {
    if (/^(?:was|were|had|will|is|are|am)\b/.test(verbEnglish)) {
      verbEnglish = verbEnglish.replace(/^(\S+)/, '$1 not');
    } else if (imperative) {
      verbEnglish = `do not ${verbEnglish}`;
    } else {
      const auxiliary = head.reading.person === '3rd' && head.reading.number !== 'plural' ? 'does' : 'do';
      const past = /^(?:perfect|pluperfect)$/.test(TENSE_ENGLISH[head.reading.tense] ?? '');
      verbEnglish = `${past ? 'did' : auxiliary} not ${stem}`;
    }
  }
  pieces.push(verbEnglish);

  // "wants to weep": the infinitive the verb governs comes straight after it.
  const infinitive = findInfinitive(tokens, head.index);
  if (infinitive) pieces.push(`to ${verbStem(infinitive.reading.gloss || tokens[infinitive.index].word)}`);

  // What the subject is said to be, which belongs immediately after "is".
  // A noun there takes an article and an adjective does not: "I am a girl",
  // "I am dead".
  for (const [index, reading] of settled.entries()) {
    if (!reading.complement) continue;
    pieces.push(reading.kind === 'noun'
      ? nounPhrase(index, tokens, settled, { article: 'a' })
      : (reading.gloss || tokens[index].word));
  }


  // Object, then the one it is done for.
  const spare = (index, reading) => !inPhrase.has(index)
    && reading.kind !== 'adjective' && reading.of === undefined
    && reading.why !== 'the subject';

  for (const [index, reading] of settled.entries()) {
    if (spare(index, reading) && reading.case === 'accusative') {
      pieces.push(nounPhrase(index, tokens, settled));
    }
  }
  for (const [index, reading] of settled.entries()) {
    if (spare(index, reading) && reading.case === 'dative') {
      pieces.push(`to ${nounPhrase(index, tokens, settled)}`);
    }
  }
  for (const [index, reading] of settled.entries()) {
    if (spare(index, reading) && reading.case === 'ablative') {
      pieces.push(`by ${nounPhrase(index, tokens, settled)}`);
    }
  }

  // A vocative, which is who is being spoken to.
  for (const [index, reading] of settled.entries()) {
    if (reading.case === 'vocative' && reading.kind === 'noun') {
      pieces.push(`, ${nounPhrase(index, tokens, settled, { article: '' })}`);
    }
  }

  // Prepositional phrases, in the order they were written.
  for (const { preposition, at } of prepositional) {
    pieces.push(`${preposition.english} ${nounPhrase(at, tokens, settled)}`);
  }

  // Particles that carry meaning: negation first, the rest at the front.
  const extras = tokens
    .filter((t) => t.role === 'particle' && t.english !== 'not' && !ADVERBS.has(t.english))
    .map((t) => t.english);

  let sentence = pieces.filter(Boolean).join(' ').replace(/\s+,/g, ',');
  if (appositions.length) sentence = `${appositions.join(' and ')}, ${sentence}`;
  // Whatever could not be placed, in brackets, so it is visible rather than
  // quietly gone.
  if (leftOver.length) sentence += ` [${leftOver.join(' ')}]`;
  if (extras.length) sentence = `${extras.join(' ')} ${sentence}`;
  return sentence.replace(/\s{2,}/g, ' ').trim();
}

/**
 * The whole sentence.
 *
 * @returns {Promise<{text: string, clauses: Array}|null>} null when the parse
 *          could not find a verb, which is the one thing it will not guess.
 */
export async function parseLatin(text) {
  const clauses = splitClauses(text);
  if (!clauses.length) return null;

  const rendered = [];
  const detail = [];

  for (const clause of clauses) {
    const words = clause.split(/\s+/).map(strip).filter(Boolean);
    if (!words.length) continue;

    // eslint-disable-next-line no-await-in-loop
    const tokens = await readAll(words);
    const parsed = resolveClause(tokens);
    const english = renderClause(tokens, parsed);
    rendered.push(english);

    detail.push({
      clause,
      verb: parsed.head?.token.word ?? '',
      leftOver: parsed.leftOver,
      roles: [...parsed.settled.entries()].map(([index, reading]) => ({
        word: tokens[index].word,
        case: reading.case ?? '',
        number: reading.number ?? '',
        gloss: reading.gloss ?? '',
        why: reading.why ?? '',
      })),
    });
  }

  if (!rendered.length) return null;
  const text_ = rendered.join(', ').replace(/\s+,/g, ',');
  return {
    text: `${text_.charAt(0).toUpperCase()}${text_.slice(1)}${/[.!?]$/.test(text_) ? '' : '.'}`,
    clauses: detail,
  };
}

/**
 * The engine, for the chain in server/translators.js.
 *
 * Refuses rather than guesses: no verb, no parse, and the caller falls through
 * to whatever is beneath it. That refusal is the point. A parser that always
 * answers is a parser that has stopped telling you when it does not know.
 */
export const PARSER_ENGINE = 'the parser';

export async function latinToEnglishParse(text, from, to) {
  if (from !== 'la' || to !== 'en') throw new Error(`the parser is la|en only, not ${from}|${to}`);

  const parsed = await parseLatin(text);
  if (!parsed) throw new Error('no verb found, so nothing to parse');

  return { text: parsed.text, engine: PARSER_ENGINE, parse: parsed.clauses, parsed: true };
}
