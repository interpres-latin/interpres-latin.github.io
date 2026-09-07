/**
 * The French language pack for the tutor.
 *
 * The same contract as tutor-es.js. Two things differ beyond vocabulary: the
 * paradigm has French mood names, and the set of endings worth trying as an
 * infinitive is wider, because French puts four of them (-er, -ir, -re, -oir)
 * where Spanish has three.
 */

import { conjugate, PERSONS, PERSON_LABELS } from './conjugator-fr.js';
import { COMMON_VERBS, IRREGULARS, SHORT_IR } from '../data/verbs-fr.js';
import { TOPICS, SMALL_TALK, EXCLAMATIONS } from '../data/grammar-fr.js';
import { fold } from './dom.js';

const TENSE_LABELS = {
  'indicatif.present': { fr: 'présent de l’indicatif', en: 'present indicative' },
  'indicatif.imparfait': { fr: 'imparfait', en: 'imperfect' },
  'indicatif.passeSimple': { fr: 'passé simple', en: 'passé simple' },
  'indicatif.futur': { fr: 'futur simple', en: 'future' },
  'indicatif.conditionnel': { fr: 'conditionnel présent', en: 'conditional' },
  'indicatif.passeCompose': { fr: 'passé composé', en: 'passé composé' },
  'subjonctif.present': { fr: 'présent du subjonctif', en: 'present subjunctive' },
  'subjonctif.imparfait': { fr: 'imparfait du subjonctif', en: 'imperfect subjunctive' },
};

const GROUP_NAMES = {
  1: { fr: 'du premier groupe', en: 'first-group' },
  2: { fr: 'du deuxième groupe', en: 'second-group' },
  3: { fr: 'du troisième groupe', en: 'third-group' },
};

function describeFlags(result, language) {
  const parts = [];
  if (result.flags.stemChange) {
    parts.push(language === 'fr'
      ? `avec le changement ${result.flags.stemChange}`
      : `with a ${result.flags.stemChange} stem change`);
  }
  if (result.flags.ortho) {
    parts.push(language === 'fr'
      ? `orthographe ${result.flags.ortho}`
      : `spelling ${result.flags.ortho}`);
  }
  if (result.flags.irregular) parts.push(language === 'fr' ? 'irrégulier' : 'irregular');
  if (result.flags.derivedFrom) {
    parts.push(language === 'fr'
      ? `se conjugue comme *${result.flags.derivedFrom}*`
      : `conjugated like *${result.flags.derivedFrom}*`);
  }
  if (result.auxiliary === 'être') {
    parts.push(language === 'fr' ? 'auxiliaire *être*' : 'takes *être*');
  }
  return parts.length ? `, ${parts.join(', ')}` : '';
}

export const PACK = {
  code: 'fr',
  conjugate,
  PERSONS,
  PERSON_LABELS,
  TOPICS,
  SMALL_TALK,
  EXCLAMATIONS,
  GLOSSES: new Map(COMMON_VERBS),

  shape: {
    moods: ['indicatif', 'subjonctif'],
    imperative: 'imperatif',
    affirmative: 'affirmatif',
    nonFinite: 'formes',
    gerund: 'participePresent',
    participle: 'participePasse',
  },

  /**
   * A closed list, for the same reason as the Spanish one: English is full of
   * words ending in -er and -re, and reading "under" or "centre" as a verb is
   * worse than missing an unusual one.
   */
  KNOWN_VERBS: new Set([
    ...COMMON_VERBS.map(([verb]) => fold(verb)),
    ...Object.keys(IRREGULARS).map(fold),
    ...[...SHORT_IR].map(fold),
  ]),

  INFINITIVE: /(?:er|ir|ïr|re|oir)$/,

  TENSE_LABELS,
  INDEX_TENSES: Object.keys(TENSE_LABELS).filter((key) => key !== 'indicatif.passeCompose'),

  FORM_LABELS: {
    imperative: { fr: 'impératif', en: 'imperative' },
    gerund: { fr: 'participe présent', en: 'present participle' },
    participle: { fr: 'participe passé', en: 'past participle' },
  },

  CONJUGATION_CUE: /\b(conjug\w*|tense|tenses|temps|forms?|formes?|present|présent|passe|passé|past|imparfait|imperfect|futur|future|subjonctif|subjunctive|conditionnel|conditional|imperatif|impératif|imperative|participe|participle|infinitif|infinitive)\b/,

  TENSE_HINTS: [
    [/\b(passe compose|passé composé|perfect)\b/, 'indicatif.passeCompose'],
    [/\b(imparfait du subjonctif|imperfect subjunctive|subjonctif imparfait)\b/, 'subjonctif.imparfait'],
    [/\b(present|présent)\b/, 'indicatif.present'],
    [/\b(imparfait|imperfect)\b/, 'indicatif.imparfait'],
    [/\b(passe simple|passé simple|preterite)\b/, 'indicatif.passeSimple'],
    [/\b(futur|future)\b/, 'indicatif.futur'],
    [/\b(conditionnel|conditional)\b/, 'indicatif.conditionnel'],
    [/\b(subjonctif|subjunctive)\b/, 'subjonctif.present'],
  ],

  /**
   * Matched against the accented text: French person words are short and
   * collide with ordinary words once folded, so "il" is checked with its
   * accents intact alongside "elle" and "on".
   */
  PERSON_HINTS: [
    [/\b(je|j'|first person singular|première personne du singulier)\b/, 'je'],
    [/\b(tu|second person singular|deuxième personne du singulier)\b/, 'tu'],
    [/\b(il|elle|on|third person singular|troisième personne du singulier)\b/, 'il'],
    [/\b(nous|first person plural|première personne du pluriel)\b/, 'nous'],
    [/\b(vous|second person plural|deuxième personne du pluriel)\b/, 'vous'],
    [/\b(ils|elles|third person plural|troisième personne du pluriel)\b/, 'ils'],
  ],

  MARKERS: {
    study: /\b(que|qu|qui|quoi|comment|quand|pourquoi|est-ce|le|la|les|un|une|des|du|de|veut|dire|signifie|difference|différence|entre|conjugue|conjuguer|explique|aide|verbe|mot|en francais|français)\b/g,
    english: /\b(what|how|when|why|which|does|do|is|are|the|of|mean|means|say|difference|between|conjugate|tell|explain|help|verb|word|in french)\b/g,
    diacritics: /[àâçéèêëîïôûùü]/,
  },

  INTENTS: {
    conjugate: /(?:conjugue(?:r|z)?|conjugaison\s+(?:de|du|d')|conjugate|conjugation\s+(?:of|for)|comment se conjugue)\s+(?:le\s+|la\s+|du\s+|de\s+|d'|the\s+)?(?:verbe?\s+)?([a-zàâçéèêëîïôûùü']+)/i,
    verbMarker: /\b(?:verbe|verb)\s+([a-zàâçéèêëîïôûùü']{2,})\b/i,
    conjugateTrailing: /^([a-zàâçéèêëîïôûùü']+)\s+(?:conjugation|conjugated|conjugaison|conjugué)\b/i,
    define: /(?:que veut dire|qu'est-ce que|que signifie|signification de|définition de|definition de|défini[st]|what does|what is the meaning of|meaning of)\s+["«'“]?\s*([a-zàâçéèêëîïôûùü'-]+)\s*["»'”]?/i,
    translateInto: /(?:comment dit-on|comment dit on|comment on dit|how do you say|how do i say|how to say|how would you say|how do u say|how say|translate)\s+["«'“]?(.+?)["»'”]?\s*(?:en francais|en français|in french|in english|en anglais)?\s*[.?!]*$/i,
    translateAny: /(?:traduis|traduire|traduction de|translate)\s+["«'“]?(.+?)["»'”]?\s*$/i,
    whatForm: /(?:quelle forme est|quelle est la forme|c'est quoi|qu'est-ce que|what form is|what is)\s+["«'“]?\s*([a-zàâçéèêëîïôûùü'-]+)\s*["»'”]?/i,
    intoStudy: /^\s*[\"«'“]?(.+?)[\"»'”]?\s+(?:in|into|en)\s+(?:french|fran[cç]ais)\s*[.?!]*$/i,
    intoEnglish: /^\s*[\"«'“]?(.+?)[\"»'”]?\s+(?:in|into|en)\s+(?:english|anglais)\s*[.?!]*$/i,
    bareEnglishVerb: /^\s*to\s+([a-z]+(?:\s+[a-z]+){0,2})\s*[.?!]*$/i,
    intoStudyLanguage: /(?:en francais|en français|in french)/i,
    /** Only an explicit "in English" sends a "how do you say" the other way. */
    intoEnglishLanguage: /(?:in english|en anglais)/i,
  },

  LEADING_ARTICLE: /^(?:le|la|les|l'|un|une|des|du|de|the|a)\s*/,

  HELP: /\b(aide|help|que peux tu faire|que sais tu faire|what can you do)\b/,

  describeFlags,

  verbHeadline(result, gloss, lead, language) {
    const group = GROUP_NAMES[result.flags.group][language];
    return language === 'fr'
      ? `${lead}**${result.verb}**${gloss ? ` — *${gloss}*` : ''}. Verbe en -${result.class}, ${group}${describeFlags(result, 'fr')}.`
      : `${lead}**${result.verb}**${gloss ? ` — *${gloss}*` : ''}. A ${group} verb in -${result.class}${describeFlags(result, 'en')}.`;
  },

  // The French counterpart of "irregular and stem-changing": a third-group verb
  // that also takes être is about as much as one verb can ask of a learner.
  isHairy: (result) => result.flags.irregular && result.auxiliary === 'être',

  capabilities(language) {
    return language === 'fr'
      ? `Voici ce que je sais faire, et tout vient des données du site lui-même :

- **Conjuguer** n'importe quel verbe — *conjugue prendre au subjonctif*
- **Identifier une forme** — *c'est quoi « vinrent »*
- **Chercher un mot** dans le dictionnaire — *que veut dire flâner*
- **Traduire** des phrases — *comment dit-on "I'm tired" en français*
- **Expliquer la grammaire** : être et avoir, le passé composé, passé composé et imparfait, le subjonctif, le genre et les articles, l'article partitif, les pronoms d'objet, y et en, la négation, les adjectifs, le futur, le conditionnel et les phrases en « si », savoir et connaître, c'est et il est, qui que dont où, les accents, tu et vous, les verbes pronominaux, le comparatif, depuis et pendant.`
      : `Here's what I can do, and all of it comes from the site's own data:

- **Conjugate** any verb — *conjugate prendre in the subjunctive*
- **Identify a form** — *what is "vinrent"*
- **Look words up** in the dictionary — *what does flâner mean*
- **Translate** phrases — *how do you say "I'm tired" in French*
- **Explain grammar**: être vs avoir, the passé composé, passé composé vs imparfait, the subjunctive, gender and articles, the partitive, object pronouns, y and en, negation, adjectives, the future, the conditional and si clauses, savoir vs connaître, c'est vs il est, relative pronouns, written accents, tu vs vous, pronominal verbs, comparatives, depuis vs pendant.`;
  },

  outOfScope(language, exclaim) {
    return language === 'fr'
      ? `${exclaim}Cela m'échappe. Je réponds à partir des données du site — le conjugueur, le dictionnaire et une série de fiches de grammaire —, donc je préfère ne rien dire plutôt qu'inventer.

Essayez *conjugue partir*, *que veut dire flâner*, *c'est quoi « vinrent »* ou *le subjonctif*. Écrivez **aide** pour voir la liste complète.`
      : `${exclaim}That one's outside what I cover. I answer from the site's own data — the conjugator, the dictionary and a set of grammar explanations — so I'd rather say nothing than invent an answer.

Try *conjugate partir*, *what does flâner mean*, *what is "vinrent"*, or *the subjunctive*. Type **help** for the full list.`;
  },

  labels: {
    fullTable: { fr: 'Tableau complet', en: 'Full table' },
    fullEntry: { fr: 'Article complet', en: 'Full entry' },
    conjugation: { fr: 'Conjugaison', en: 'Conjugation' },
    synonyms: { fr: '**Synonymes :** ', en: '**Synonyms:** ' },
    person: { fr: 'personne', en: 'person' },
    form: { fr: 'forme', en: 'form' },
    conjugatedForm: { fr: "C'est une forme conjuguée :", en: "That's a conjugated form:" },
    otherTenses: { fr: '_Les autres temps sont dans le tableau complet._', en: '_The remaining tenses are in the full table._' },
    of: { fr: 'de', en: 'of' },
    translatedWith: { fr: 'traduit avec', en: 'translated with' },
  },

  DEFAULT_TENSES: ['indicatif.present', 'indicatif.passeCompose', 'subjonctif.present'],
};
