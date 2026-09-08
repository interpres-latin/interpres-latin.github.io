/**
 * The Latin language pack for the tutor.
 *
 * Two things set it apart from the Spanish and French packs.
 *
 * It always answers in **English**. A Latin tutor replying in Latin would be a
 * joke at the reader's expense, so ANSWER_LANGUAGE pins it regardless of what
 * the interface is set to.
 *
 * It carries extra intents, because Latin asks questions the modern languages
 * do not: *decline puella* and *stage 5* have no Spanish equivalent, and they
 * are answered before the general routing gets a look, so "decline puella" is
 * not read as a request to define it.
 */

import { conjugate, PERSONS, PERSON_LABELS } from './conjugator-la.js';
import { declineNoun, declineAdjective, parseParts, CASE_ORDER } from './decliner-la.js';
import { resolveLatinWord } from './latin-lookup.js';
import { COMMON_VERBS, IRREGULARS, MODEL_VERBS } from '../data/verbs-la.js';
import { TOPICS, SMALL_TALK, EXCLAMATIONS } from '../data/grammar-la.js';
import { findStage, PROVENANCE, STAGE_NUMBERS } from '../data/stages-la.js';
import { fold, getJson } from './dom.js';

/** lemma → the principal parts it needs to be conjugable. */
const PARTS = new Map(COMMON_VERBS.map(([parts]) => [parts.split(',')[0].trim(), parts]));
for (const [lemma, data] of Object.entries(IRREGULARS)) {
  if (data.parts) PARTS.set(lemma, data.parts);
}

/**
 * Conjugate from a bare lemma where we hold the parts for it.
 *
 * A Latin verb cannot be conjugated from its first form alone — *rego* tells
 * you nothing about *rexi* — so the tutor looks the parts up rather than
 * guessing, and says so when it has none.
 */
function conjugateKnown(input) {
  const text = String(input ?? '').trim();
  if (text.includes(',')) return conjugate(text);
  return conjugate(PARTS.get(text.toLowerCase()) ?? text);
}

const GLOSSES = new Map(COMMON_VERBS.map(([parts, gloss]) => [parts.split(',')[0].trim(), gloss]));

const TENSE_LABELS = {
  'indicativus.praesens': { la: 'praesens', en: 'present' },
  'indicativus.imperfectum': { la: 'imperfectum', en: 'imperfect' },
  'indicativus.futurum': { la: 'futurum', en: 'future' },
  'indicativus.perfectum': { la: 'perfectum', en: 'perfect' },
  'indicativus.plusquamperfectum': { la: 'plusquamperfectum', en: 'pluperfect' },
  'indicativus.futurumExactum': { la: 'futurum exactum', en: 'future perfect' },
  'indicativus.praesensPassivum': { la: 'praesens passivum', en: 'present passive' },
  'indicativus.imperfectumPassivum': { la: 'imperfectum passivum', en: 'imperfect passive' },
  'indicativus.perfectumPassivum': { la: 'perfectum passivum', en: 'perfect passive' },
  'coniunctivus.praesens': { la: 'coniunctivus praesens', en: 'present subjunctive' },
  'coniunctivus.imperfectum': { la: 'coniunctivus imperfectum', en: 'imperfect subjunctive' },
  'coniunctivus.perfectum': { la: 'coniunctivus perfectum', en: 'perfect subjunctive' },
  'coniunctivus.plusquamperfectum': { la: 'coniunctivus plusquamperfectum', en: 'pluperfect subjunctive' },
};

// ---------------------------------------------------------------------------
// the intents only Latin has
// ---------------------------------------------------------------------------

/**
 * A declension table, as blocks the chat can render.
 *
 * The dictionary settles three things the shape of the input cannot: whether a
 * word is a noun or an adjective (*rex, regis* and *ingens, ingentis* look
 * alike), what its gender is, and — when only the nominative was given — what
 * its genitive is. It also refuses a wrong one: *puer, pueris* would otherwise
 * decline as a third declension noun and produce a table of forms that do not
 * exist. See lib/latin-lookup.js.
 */
async function declensionBlocks(word, { asked = '' } = {}) {
  const resolved = await resolveLatinWord(word);

  if (!resolved.ok) {
    if (resolved.error === 'wrong-genitive') {
      return [{
        type: 'md',
        text: `The genitive of **${resolved.lemma}** is **${resolved.expected}**, not what you typed, so I can't decline that. Try *${resolved.lemma}, ${resolved.expected}*.`,
      }];
    }
    if (resolved.error === 'unknown') {
      // Answer the question that was asked. Falling through here sent
      // "decline boy" to the dictionary, which looked up *decline*.
      return [{
        type: 'md',
        text: `I don't know the Latin word **${parseParts(word)[0] ?? word}**. If it is a noun, give the genitive too, *puella, puellae*, and I can decline it from that.`,
      }];
    }
    return null;
  }

  const { parts } = resolved;
  const gender = resolved.gender || '';
  let kind = resolved.kind;
  if (/adjective/i.test(asked)) kind = 'adjective';
  if (/noun/i.test(asked)) kind = 'noun';

  const asNoun = () => {
    const noun = declineNoun(parts[0], parts[1], gender);
    return noun.ok ? { result: noun, kind: 'noun' } : null;
  };
  const asAdjective = () => {
    const adjective = declineAdjective(parts);
    return adjective.ok ? { result: adjective, kind: 'adjective' } : null;
  };

  const order = kind === 'adjective' ? [asAdjective, asNoun] : [asNoun, asAdjective];
  const found = order.reduce((carry, attempt) => carry ?? attempt(), null);
  if (!found) return null;
  const { result } = found;
  kind = found.kind;

  // Say so when the genitive came from the dictionary rather than the reader.
  const completed = resolved.completed
    ? ` *(genitive filled in: ${parts.join(', ')})*`
    : '';

  if (kind === 'adjective') {
    const blocks = [{
      type: 'md',
      text: `**${parts.join(', ')}**: ${result.family} declension adjective${result.terminations ? `, ${result.terminations}-termination` : ''}.${completed}`,
    }];
    for (const genderName of ['masculine', 'feminine', 'neuter']) {
      const table = result.table[genderName];
      blocks.push({
        type: 'table',
        caption: genderName,
        head: ['case', 'singular / plural'],
        rows: CASE_ORDER.map((c) => [c, `${table.singular[c] || ','} · ${table.plural[c] || ','}`]),
      });
    }
    blocks.push({
      type: 'links',
      label: 'Full table',
      items: [{ label: parts[0], href: `/declinationes?n=${encodeURIComponent(parts.join(', '))}` }],
    });
    return blocks;
  }

  return [
    {
      type: 'md',
      text: `**${result.lemma}, ${result.genitive}**: ${ordinal(result.declension)} declension${result.gender ? `, ${result.gender}` : ''}${result.iStem ? ', i-stem' : ''}. Stem **${result.stem}-**.${completed}`,
    },
    {
      type: 'table',
      caption: 'singular / plural',
      head: ['case', 'form'],
      rows: CASE_ORDER.map((c) => [c, `${result.table.singular[c] || ','} · ${result.table.plural[c] || ','}`]),
    },
    {
      type: 'links',
      label: 'Full table',
      items: [{ label: result.lemma, href: `/declinationes?n=${encodeURIComponent(parts.join(', '))}` }],
    },
  ];
}

const ordinal = (n) => ({ 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth' }[n] ?? `${n}th`);

/** A stage's vocabulary, straight from the course data. */
function stageBlocks(input) {
  const stage = findStage(input);
  if (!stage) {
    return [{
      type: 'md',
      text: `I only have stages ${STAGE_NUMBERS[0]}–${STAGE_NUMBERS.at(-1)}, that is Book I of the Cambridge Latin Course. ${PROVENANCE}`,
    }];
  }
  return [
    { type: 'md', text: `### Stage ${stage.number}, *${stage.title}*\n\n${stage.setting ? `${stage.setting[0].toUpperCase()}${stage.setting.slice(1)}. ` : ''}${stage.words.length} words.` },
    {
      type: 'table',
      caption: `stage ${stage.number}`,
      head: ['Latin', 'English'],
      rows: stage.words.map(([latin, english]) => [latin, english]),
    },
    { type: 'links', label: 'On the stages page', items: [{ label: `Stage ${stage.number}`, href: `/stadia?s=${stage.number}` }] },
  ];
}

/** Whitaker's parse of a form the reader met in a text. */
async function parseBlocks(word) {
  const data = await getJson(`/api/dictionary?word=${encodeURIComponent(word)}&study=la`);
  const entries = data.entries?.[0]?.senses ?? [];
  if (!entries.length) return null;

  const lines = entries.slice(0, 4).map((sense) => {
    const parse = sense.parses?.length ? sense.parses.slice(0, 3).join('; ') : '';
    return `- **${sense.headword ?? data.word}**: ${sense.description}${parse ? `\n    · ${parse}` : ''}`;
  });

  return [
    { type: 'md', text: `**${data.word}** is:\n\n${lines.join('\n')}` },
    { type: 'links', label: 'Full entry', items: [{ label: data.word, href: `/diccionario?q=${encodeURIComponent(data.word)}` }] },
  ];
}

export const PACK = {
  code: 'la',
  /** Latin questions get English answers, whatever the interface is set to. */
  ANSWER_LANGUAGE: 'en',

  conjugate: conjugateKnown,
  PERSONS,
  PERSON_LABELS,
  TOPICS,
  SMALL_TALK,
  EXCLAMATIONS,
  GLOSSES,

  shape: {
    moods: ['indicativus', 'coniunctivus'],
    imperative: 'imperativus',
    affirmative: 'praesens',
    nonFinite: 'formae',
    gerund: 'participiumPraesens',
    participle: 'participiumPerfectum',
  },

  KNOWN_VERBS: new Set([...PARTS.keys()].map(fold)),

  /**
   * What /conjugacion has to be given to open on a verb.
   *
   * The page conjugates from principal parts and refuses anything less, so a
   * link carrying the lemma alone lands on "a Latin verb cannot be conjugated
   * without its principal parts" — about the verb the answer had just finished
   * conjugating. The lemma stays the label; this is what goes in the href.
   */
  conjugationTarget: (verb) => PARTS.get(String(verb).toLowerCase()) ?? verb,

  // Latin infinitives end in -re, but the tutor is given lemmas, not
  // infinitives — so the test is the first principal part's ending.
  INFINITIVE: /(?:o|or|m|t)$/,

  TENSE_LABELS,
  INDEX_TENSES: [
    'indicativus.praesens', 'indicativus.imperfectum', 'indicativus.futurum',
    'indicativus.perfectum', 'indicativus.plusquamperfectum',
    'coniunctivus.praesens', 'coniunctivus.imperfectum',
  ],

  FORM_LABELS: {
    imperative: { la: 'imperativus', en: 'imperative' },
    gerund: { la: 'participium praesens', en: 'present participle' },
    participle: { la: 'participium perfectum', en: 'perfect participle' },
  },

  CONJUGATION_CUE: /\b(conjug\w*|declin\w*|tense|tenses|forms?|present|imperfect|perfect|pluperfect|future|subjunctive|passive|participle|infinitive|imperative|principal parts?)\b/,

  TENSE_HINTS: [
    [/\b(pluperfect|plusquamperfect\w*)\b/, 'indicativus.plusquamperfectum'],
    [/\b(future perfect|futurum exactum)\b/, 'indicativus.futurumExactum'],
    [/\b(present subjunctive|subjunctive present)\b/, 'coniunctivus.praesens'],
    [/\b(imperfect subjunctive|subjunctive imperfect)\b/, 'coniunctivus.imperfectum'],
    [/\b(present passive|passive present)\b/, 'indicativus.praesensPassivum'],
    [/\b(subjunctive|coniunctiv\w*)\b/, 'coniunctivus.praesens'],
    [/\b(imperfect|imperfectum)\b/, 'indicativus.imperfectum'],
    [/\b(perfect|perfectum)\b/, 'indicativus.perfectum'],
    [/\b(future|futurum)\b/, 'indicativus.futurum'],
    [/\b(present|praesens)\b/, 'indicativus.praesens'],
  ],

  PERSON_HINTS: [
    [/\b(ego|first person singular|1st person singular)\b/, 's1'],
    [/\b(tu|second person singular|2nd person singular)\b/, 's2'],
    [/\b(is|ea|id|third person singular|3rd person singular|he|she|it)\b/, 's3'],
    [/\b(nos|first person plural|1st person plural|we)\b/, 'p1'],
    [/\b(vos|second person plural|2nd person plural)\b/, 'p2'],
    [/\b(ei|eae|third person plural|3rd person plural|they)\b/, 'p3'],
  ],

  MARKERS: {
    // Both sides of the switch ask in English, so detection only has to keep
    // the answer language pinned — which ANSWER_LANGUAGE already does.
    study: /\b(quid|quis|cur|ubi|quomodo|declina|coniuga)\b/g,
    english: /\b(what|how|when|why|which|does|do|is|are|the|of|mean|means|say|difference|between|conjugate|decline|tell|explain|help|verb|word|noun|case)\b/g,
    diacritics: /[āēīōūăĕĭŏŭ]/,
  },

  INTENTS: {
    conjugate: /(?:conjugate|conjugation\s+(?:of|for)|coniuga)\s+(?:the\s+)?(?:verb\s+)?([a-z]+)/i,
    verbMarker: /\b(?:verb|verbum)\s+([a-z]{2,})\b/i,
    conjugateTrailing: /^([a-z]+)\s+(?:conjugation|conjugated|principal parts)\b/i,
    define: /(?:what does|what is the meaning of|meaning of|define|definition of|quid significat)\s+["'“]?\s*([a-z]+)\s*["'”]?/i,
    translateInto: /(?:how do you say|how do i say|how to say|how would you say|how do u say|how say|translate)\s+["'“]?(.+?)["'”]?\s*(?:in latin|into latin|in english|into english)?\s*[.?!]*$/i,
    translateAny: /(?:translate|verte)\s+["'“]?(.+?)["'”]?\s*$/i,
    whatForm: /(?:what form is|what is|parse)\s+["'“]?\s*([a-z]+)\s*["'”]?/i,
    intoStudy: /^\s*[\"'“]?(.+?)[\"'”]?\s+(?:in|into)\s+latin\s*[.?!]*$/i,
    intoEnglish: /^\s*[\"'“]?(.+?)[\"'”]?\s+(?:in|into)\s+english\s*[.?!]*$/i,
    bareEnglishVerb: /^\s*to\s+([a-z]+(?:\s+[a-z]+){0,2})\s*[.?!]*$/i,
    intoStudyLanguage: /(?:in latin|into latin)/i,
    /** Only an explicit "in English" sends a "how do you say" the other way. */
    intoEnglishLanguage: /(?:in english|into english)/i,
  },

  /**
   * Intents no other language needs. Order matters: declining is checked before
   * defining, or "decline puella" is answered with a dictionary entry.
   */
  EXTRA_INTENTS: [
    {
      pattern: /(?:decline|declension\s+of|declina)\s+(?:the\s+)?((?:noun|adjective)\s+)?([a-z]+(?:\s*,\s*[a-z]+){0,2})/i,
      build: (match) => declensionBlocks(match[2], { asked: match[1] ?? '' }),
    },
    {
      pattern: /^\s*(?:clc\s+)?stage\s*([0-9]+|[ivx]+)\s*$/i,
      build: (match) => stageBlocks(match[1]),
    },
    {
      pattern: /(?:vocabulary|vocab|words)\s+(?:for\s+|in\s+)?stage\s*([0-9]+|[ivx]+)/i,
      build: (match) => stageBlocks(match[1]),
    },
    {
      pattern: /^\s*parse\s+([a-z]+)\s*$/i,
      build: (match) => parseBlocks(match[1]),
    },
  ],

  LEADING_ARTICLE: /^(?:the|a|an)\s+/,

  HELP: /\b(help|what can you do|what do you know)\b/,

  describeFlags: () => '',

  verbHeadline(result, gloss) {
    const bits = [`${ordinalConjugation(result.class)} conjugation`];
    if (result.deponent) bits.push('deponent');
    if (result.flags.derivedFrom) bits.push(`compound of *${result.flags.derivedFrom}*`);
    return `**${result.principalParts}**${gloss ? `, *${gloss}*` : ''}. ${bits.join(', ')}.`;
  },

  isHairy: (result) => result.deponent || result.flags.irregular,

  capabilities() {
    return `Here's what I can do, and all of it comes from the site's own data:

- **Conjugate** any verb, *conjugate rego*, *conjugate capio in the perfect*
- **Decline** any noun or adjective, *decline puella, puellae* · *decline bonus, bona, bonum*
- **Parse a form**: *parse canem* tells you it is the accusative singular of *canis*
- **Look words up** in Whitaker's Words, with principal parts, *what does flumen mean*
- **Translate** phrases, with every Latin word's case shown, *how do you say "the dog of the girl" in Latin*
- **Stage vocabulary**: *stage 5* gives you that stage's words
- **Explain grammar**: the cases, each case in turn, the five declensions, agreement, adjectives, principal parts, the tenses, the passive, deponents, participles, the ablative absolute, indirect statement, the subjunctive, purpose and result, relative pronouns, pronouns, commands, gerund and gerundive, numbers and time, and word order.

I answer in English, a Latin tutor replying in Latin would not be much help.`;
  },

  outOfScope(language, exclaim) {
    return `${exclaim}That one's outside what I cover. I answer from the site's own data, the conjugator, the decliner, Whitaker's Words and a set of grammar notes, so I'd rather say nothing than invent an answer.

Try *decline rex, regis*, *conjugate capio*, *parse canem*, *stage 5*, or *the ablative absolute*. Type **help** for the full list.`;
  },

  labels: {
    fullTable: { la: 'Tabula plena', en: 'Full table' },
    fullEntry: { la: 'Articulus', en: 'Full entry' },
    conjugation: { la: 'Coniugatio', en: 'Conjugation' },
    synonyms: { la: '**Synonyma:** ', en: '**Synonyms:** ' },
    person: { la: 'persona', en: 'person' },
    form: { la: 'forma', en: 'form' },
    conjugatedForm: { la: 'Forma coniugata:', en: "That's a conjugated form:" },
    otherTenses: { la: '_Ceteri modi in tabula plena._', en: '_The remaining tenses are in the full table._' },
    of: { la: 'de', en: 'of' },
    translatedWith: { la: 'versum per', en: 'translated with' },
  },

  DEFAULT_TENSES: ['indicativus.praesens', 'indicativus.perfectum', 'coniunctivus.praesens'],
};

function ordinalConjugation(name) {
  return { '1st': 'First', '2nd': 'Second', '3rd': 'Third', '3rd-io': 'Third -io', '4th': 'Fourth', irregular: 'Irregular' }[name] ?? name;
}

export { MODEL_VERBS };
