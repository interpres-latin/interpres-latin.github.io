/**
 * The Spanish language pack for the tutor.
 *
 * Everything in here is what lib/tutor.js needs to know about Spanish: the
 * conjugation engine to call, the shape of the table it returns, the words that
 * signal an intent, and the sentences the tutor says in its own voice. The
 * routing that uses all of it is language-neutral and lives next door.
 */

import { conjugate, PERSONS, PERSON_LABELS } from './conjugator.js';
import { COMMON_VERBS, IRREGULARS, STEM_CHANGES } from '../data/verbs.js';
import { TOPICS, SMALL_TALK, EXCLAMATIONS } from '../data/grammar.js';
import { fold } from './dom.js';

const TENSE_LABELS = {
  'indicativo.presente': { es: 'presente de indicativo', en: 'present indicative' },
  'indicativo.preterito': { es: 'pretérito perfecto simple', en: 'preterite' },
  'indicativo.imperfecto': { es: 'pretérito imperfecto', en: 'imperfect' },
  'indicativo.futuro': { es: 'futuro simple', en: 'future' },
  'indicativo.condicional': { es: 'condicional simple', en: 'conditional' },
  'subjuntivo.presente': { es: 'presente de subjuntivo', en: 'present subjunctive' },
  'subjuntivo.imperfectoRa': { es: 'imperfecto de subjuntivo (-ra)', en: 'imperfect subjunctive (-ra)' },
  'subjuntivo.imperfectoSe': { es: 'imperfecto de subjuntivo (-se)', en: 'imperfect subjunctive (-se)' },
  'subjuntivo.futuro': { es: 'futuro de subjuntivo', en: 'future subjunctive' },
};

function describeFlags(result, language) {
  const parts = [];
  if (result.flags.stemChange) {
    parts.push(language === 'es'
      ? `con cambio de raíz ${result.flags.stemChange.replace(':', ' → ')}`
      : `with a ${result.flags.stemChange.replace(':', ' → ')} stem change`);
  }
  if (result.flags.irregular) parts.push('irregular');
  if (result.flags.derivedFrom) {
    parts.push(language === 'es'
      ? `se conjuga como *${result.flags.derivedFrom}*`
      : `conjugated like *${result.flags.derivedFrom}*`);
  }
  return parts.length ? `, ${parts.join(', ')}` : '';
}

export const PACK = {
  code: 'es',
  conjugate,
  PERSONS,
  PERSON_LABELS,
  TOPICS,
  SMALL_TALK,
  EXCLAMATIONS,
  GLOSSES: new Map(COMMON_VERBS),

  /** Where the paradigm keeps its moods, so the routing can stay generic. */
  shape: {
    moods: ['indicativo', 'subjuntivo'],
    imperative: 'imperativo',
    affirmative: 'afirmativo',
    nonFinite: 'formas',
    gerund: 'gerundio',
    participle: 'participio',
  },

  /**
   * Infinitives we will recognise anywhere in a sentence. Deliberately a closed
   * list rather than "any word ending in -ar/-er/-ir": English is full of words
   * that end that way ("later", "other", "under") and misreading one as a verb
   * is worse than missing an unusual verb.
   */
  KNOWN_VERBS: new Set([
    ...COMMON_VERBS.map(([verb]) => fold(verb)),
    ...Object.keys(IRREGULARS).map(fold),
    ...Object.keys(STEM_CHANGES).map(fold),
  ]),

  /** Endings worth trying as an infinitive when the question is a bare word or two. */
  INFINITIVE: /(?:ar|er|ir|ír)$/,

  TENSE_LABELS,

  /** Tenses that go into the reverse index of conjugated forms. */
  INDEX_TENSES: Object.keys(TENSE_LABELS),

  FORM_LABELS: {
    imperative: { es: 'imperativo afirmativo', en: 'affirmative imperative' },
    gerund: { es: 'gerundio', en: 'gerund' },
    participle: { es: 'participio', en: 'participle' },
  },

  /** Words that mean the question is about a verb's forms, not about grammar in general. */
  CONJUGATION_CUE: /\b(conjuga\w*|conjugat\w*|tense|tenses|tiempo|tiempos|forms?|formas?|presente|present|pasado|past|preterit\w*|indefinido|imperfect\w*|futuro|future|subjuntivo|subjunctive|condicional|conditional|imperativo|imperative|gerundio|gerund|participio|participle)\b/,

  /** Words in a question that pin it to one tense. */
  TENSE_HINTS: [
    [/\b(presente|present)\b/, 'indicativo.presente'],
    [/\b(preterit\w*|indefinido|pasado simple|past simple)\b/, 'indicativo.preterito'],
    [/\b(imperfecto de subjuntivo|imperfect subjunctive|subjuntivo imperfecto)\b/, 'subjuntivo.imperfectoRa'],
    [/\b(imperfecto|imperfect)\b/, 'indicativo.imperfecto'],
    [/\b(futuro|future)\b/, 'indicativo.futuro'],
    [/\b(condicional|conditional)\b/, 'indicativo.condicional'],
    [/\b(subjuntivo|subjunctive)\b/, 'subjuntivo.presente'],
  ],

  /**
   * Matched against the accented text, not the folded one: "él" is a person but
   * "el" is just an article, and folding would merge them.
   */
  PERSON_HINTS: [
    [/\b(yo|first person singular|primera persona del singular)\b/, 'yo'],
    [/\b(tú|second person singular|segunda persona del singular)\b/, 'tu'],
    [/\b(él|ella|usted|third person singular|tercera persona del singular)\b/, 'el'],
    [/\b(nosotros|first person plural|primera persona del plural)\b/, 'nosotros'],
    [/\b(vosotros|second person plural|segunda persona del plural)\b/, 'vosotros'],
    [/\b(ellos|ellas|ustedes|third person plural|tercera persona del plural)\b/, 'ellos'],
  ],

  MARKERS: {
    study: /\b(que|qué|como|cómo|cuando|cuándo|por|para|el|la|los|las|un|una|significa|dice|diferencia|entre|conjuga|conjugar|explica|ayuda|verbo|palabra|en espanol|español)\b/g,
    english: /\b(what|how|when|why|which|does|do|is|are|the|of|mean|means|say|difference|between|conjugate|tell|explain|help|verb|word|in spanish)\b/g,
    diacritics: /[áéíóúñ¿¡]/,
  },

  /** Intent patterns. Each captures the thing being asked about in group 1. */
  INTENTS: {
    conjugate: /(?:conjuga(?:r|me|cion|ción)?|conjugate|conjugation\s+(?:of|for)|como se conjuga|cómo se conjuga)\s+(?:de[l]?\s+|the\s+|el\s+|la\s+)?(?:verbo?\s+)?([a-záéíóúüñ]+)/i,
    // "the verb checkear" — an explicit marker, so an unknown verb is still safe
    // to read as one. Without it a stray English word ending in -ar/-er/-ir
    // ("answer", "later") would be conjugated into nonsense.
    verbMarker: /\b(?:verbo|verb)\s+([a-záéíóúüñ]{3,})\b/i,
    // the other word order: "ir conjugation", "tener conjugado"
    conjugateTrailing: /^([a-záéíóúüñ]+)\s+(?:conjugation|conjugated|conjugation table|conjugación|conjugado)\b/i,
    define: /(?:que significa|qué significa|significado de|define|definicion de|definición de|what does|what is the meaning of|meaning of)\s+["«'“]?([a-záéíóúüñ]+)["»'”]?/i,
    translateInto: /(?:como se dice|cómo se dice|how do you say|how do i say|translate)\s+["«'“]?(.+?)["»'”]?\s*(?:en espanol|en español|in spanish|al espanol|al español)?\s*\??$/i,
    translateAny: /(?:traduce|traducir|translate)\s+["«'“]?(.+?)["»'”]?\s*$/i,
    whatForm: /(?:que es|qué es|que forma es|qué forma es|what form is|what is)\s+["«'“]?([a-záéíóúüñ]+)["»'”]?/i,
    /** Confirms that a "how do you say" really asked for the study language. */
    intoStudyLanguage: /(?:en espanol|en español|in spanish|al espanol|al español)/i,
  },

  /** "el subjuntivo" is the same question as "subjuntivo". */
  LEADING_ARTICLE: /^(?:el|la|los|las|un|una|the|a)\s+/,

  HELP: /\b(ayuda|help|que puedes hacer|what can you do|que sabes hacer)\b/,

  describeFlags,

  /** The one-line summary above a conjugation table. */
  verbHeadline(result, gloss, lead, language) {
    return language === 'es'
      ? `${lead}**${result.verb}**${gloss ? ` — *${gloss}*` : ''}. Verbo terminado en -${result.class}${describeFlags(result, 'es')}.`
      : `${lead}**${result.verb}**${gloss ? ` — *${gloss}*` : ''}. An -${result.class} verb${describeFlags(result, 'en')}.`;
  },

  /** A verb hairy enough to earn a reaction. */
  isHairy: (result) => result.flags.irregular && result.flags.stemChange,

  capabilities(language) {
    return language === 'es'
      ? `Esto es lo que sé hacer, y todo sale de los datos del propio sitio:

- **Conjugar** cualquier verbo — *conjuga tener en subjuntivo*
- **Identificar formas** — *qué es «dijeron»*
- **Buscar palabras** en el diccionario de la RAE — *qué significa sobremesa*
- **Traducir** frases — *cómo se dice "I'm tired" en español*
- **Explicar gramática**: ser y estar, por y para, pretérito e imperfecto, el subjuntivo, gustar, saber y conocer, los pronombres de objeto, los usos de «se», las tildes, el futuro, la «a» personal, tú y usted, los adjetivos, haber y tener, muy y mucho, el condicional.`
      : `Here's what I can do, and all of it comes from the site's own data:

- **Conjugate** any verb — *conjugate tener in the subjunctive*
- **Identify a form** — *what is "dijeron"*
- **Look words up** in the RAE dictionary — *what does sobremesa mean*
- **Translate** phrases — *how do you say "I'm tired" in Spanish*
- **Explain grammar**: ser vs estar, por vs para, preterite vs imperfect, the subjunctive, gustar, saber vs conocer, object pronouns, the uses of "se", written accents, the future, the personal "a", tú vs usted, adjectives, haber vs tener, muy vs mucho, the conditional.`;
  },

  outOfScope(language, exclaim) {
    return language === 'es'
      ? `${exclaim}Eso se me escapa. Respondo a partir de los datos del sitio —el conjugador, la RAE y un puñado de explicaciones de gramática—, así que no invento respuestas sobre lo que no conozco.

Prueba con *conjuga salir*, *qué significa madrugar*, *qué es «tuve»* o *ser y estar*. Escribe **ayuda** para ver la lista completa.`
      : `${exclaim}That one's outside what I cover. I answer from the site's own data — the conjugator, the RAE dictionary and a set of grammar explanations — so I'd rather say nothing than invent an answer.

Try *conjugate salir*, *what does madrugar mean*, *what is "tuve"*, or *ser vs estar*. Type **help** for the full list.`;
  },

  /** Wording that names the dictionary behind an answer. */
  labels: {
    fullTable: { es: 'Tabla completa', en: 'Full table' },
    fullEntry: { es: 'Ficha completa', en: 'Full entry' },
    conjugation: { es: 'Conjugación', en: 'Conjugation' },
    synonyms: { es: '**Sinónimos:** ', en: '**Synonyms:** ' },
    person: { es: 'persona', en: 'person' },
    form: { es: 'forma', en: 'form' },
    conjugatedForm: { es: 'Es una forma conjugada:', en: "That's a conjugated form:" },
    otherTenses: { es: '_Los demás tiempos están en la tabla completa._', en: '_The remaining tenses are in the full table._' },
    of: { es: 'de', en: 'of' },
    translatedWith: { es: 'traducido con', en: 'translated with' },
  },

  /** Tenses shown when a question names a verb but no particular tense. */
  DEFAULT_TENSES: ['indicativo.presente', 'indicativo.preterito', 'subjuntivo.presente'],
};
