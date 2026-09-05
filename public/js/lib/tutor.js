/**
 * The grounded tutor behind the chat page.
 *
 * It answers from data the site already holds — the conjugation engine, the RAE
 * dictionary, the translator — plus a set of hand-written grammar explanations.
 * Nothing is generated, so nothing it says about Spanish can be invented; the
 * cost is that its scope is finite, and it says so when a question falls outside.
 *
 * Every answer is a list of blocks the chat view knows how to render:
 *   { type: 'md',    text }
 *   { type: 'table', head: [...], rows: [[...]] }
 *   { type: 'links', label, items: [{ label, href }] }
 */

import { conjugate, PERSONS, PERSON_LABELS } from './conjugator.js';
import { COMMON_VERBS, IRREGULARS, STEM_CHANGES } from '../data/verbs.js';
import { TOPICS, SMALL_TALK, EXCLAMATIONS } from '../data/grammar.js';
import { fold, getJson, postJson } from './dom.js';

const GLOSSES = new Map(COMMON_VERBS);

/**
 * Infinitives we will recognise anywhere in a sentence. Deliberately a closed
 * list rather than "any word ending in -ar/-er/-ir": English is full of words
 * that end that way ("later", "other", "under") and misreading one as a verb is
 * worse than missing an unusual verb.
 */
const KNOWN_VERBS = new Set([
  ...COMMON_VERBS.map(([verb]) => fold(verb)),
  ...Object.keys(IRREGULARS).map(fold),
  ...Object.keys(STEM_CHANGES).map(fold),
]);

/** Words that mean the question is about a verb's forms, not about grammar in general. */
const CONJUGATION_CUE = /\b(conjuga\w*|conjugat\w*|tense|tenses|tiempo|tiempos|forms?|formas?|presente|present|pasado|past|preterit\w*|indefinido|imperfect\w*|futuro|future|subjuntivo|subjunctive|condicional|conditional|imperativo|imperative|gerundio|gerund|participio|participle)\b/;

/** The first known verb named anywhere in the question. */
function verbNamedIn(words) {
  for (const word of words) {
    if (KNOWN_VERBS.has(word)) return word;
  }
  return null;
}

/**
 * The profe's interjections. Used where she would have used them — cheering a
 * find, tutting at a miss — and rationed, because a catchphrase on every single
 * message stops being a catchphrase.
 */
const EXCLAIM_ODDS = { good: 0.4, bad: 1, wow: 1 };

function exclaim(kind) {
  const options = EXCLAMATIONS[kind];
  if (!options || Math.random() > (EXCLAIM_ODDS[kind] ?? 1)) return '';
  return `${options[Math.floor(Math.random() * options.length)]} `;
}

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

/** Words in a question that pin it to one tense. */
const TENSE_HINTS = [
  [/\b(presente|present)\b/, 'indicativo.presente'],
  [/\b(preterit\w*|indefinido|pasado simple|past simple)\b/, 'indicativo.preterito'],
  [/\b(imperfecto de subjuntivo|imperfect subjunctive|subjuntivo imperfecto)\b/, 'subjuntivo.imperfectoRa'],
  [/\b(imperfecto|imperfect)\b/, 'indicativo.imperfecto'],
  [/\b(futuro|future)\b/, 'indicativo.futuro'],
  [/\b(condicional|conditional)\b/, 'indicativo.condicional'],
  [/\b(subjuntivo|subjunctive)\b/, 'subjuntivo.presente'],
];

/**
 * Matched against the accented text, not the folded one: "él" is a person but
 * "el" is just an article, and folding would merge them.
 */
const PERSON_HINTS = [
  [/\b(yo|first person singular|primera persona del singular)\b/, 'yo'],
  [/\b(tú|second person singular|segunda persona del singular)\b/, 'tu'],
  [/\b(él|ella|usted|third person singular|tercera persona del singular)\b/, 'el'],
  [/\b(nosotros|first person plural|primera persona del plural)\b/, 'nosotros'],
  [/\b(vosotros|second person plural|segunda persona del plural)\b/, 'vosotros'],
  [/\b(ellos|ellas|ustedes|third person plural|tercera persona del plural)\b/, 'ellos'],
];

// ---------------------------------------------------------------------------
// language of the question
// ---------------------------------------------------------------------------

const ENGLISH_MARKERS = /\b(what|how|when|why|which|does|do|is|are|the|of|mean|means|say|difference|between|conjugate|tell|explain|help|verb|word|in spanish)\b/g;
const SPANISH_MARKERS = /\b(que|qué|como|cómo|cuando|cuándo|por|para|el|la|los|las|un|una|significa|dice|diferencia|entre|conjuga|conjugar|explica|ayuda|verbo|palabra|en espanol|español)\b/g;

/**
 * Crude but adequate: count marker words. A bare word like "ayuda" or
 * "durmiendo" carries no signal at all, so the caller can pass the language the
 * conversation has been using rather than flip-flopping between the two.
 */
export function detectLanguage(text, fallback = null) {
  const lower = String(text).toLowerCase();
  const english = (lower.match(ENGLISH_MARKERS) || []).length;
  const spanish = (lower.match(SPANISH_MARKERS) || []).length;
  if (english > spanish) return 'en';
  if (spanish > english) return 'es';
  if (/[áéíóúñ¿¡]/.test(lower)) return 'es';
  return fallback || 'en';
}

// ---------------------------------------------------------------------------
// reverse index: conjugated form -> where it comes from
// ---------------------------------------------------------------------------

let formIndex = null;

/** Built once, lazily: ~240 verbs × their single-word forms. */
function getFormIndex() {
  if (formIndex) return formIndex;
  formIndex = new Map();

  const add = (form, entry) => {
    if (!form || form.includes(' ')) return; // compound tenses are not looked up
    const key = fold(form);
    if (!formIndex.has(key)) formIndex.set(key, []);
    const bucket = formIndex.get(key);
    if (!bucket.some((item) => item.verb === entry.verb && item.label === entry.label)) bucket.push(entry);
  };

  for (const [verb] of COMMON_VERBS) {
    const result = conjugate(verb);
    if (!result.ok) continue;

    for (const mood of ['indicativo', 'subjuntivo']) {
      for (const [tense, forms] of Object.entries(result.table[mood])) {
        const label = TENSE_LABELS[`${mood}.${tense}`];
        if (!label) continue; // compound tenses
        for (const person of PERSONS) add(forms[person], { verb, person, label, mood, tense });
      }
    }

    for (const [person, form] of Object.entries(result.table.imperativo.afirmativo)) {
      add(form, { verb, person, label: { es: 'imperativo afirmativo', en: 'affirmative imperative' }, mood: 'imperativo' });
    }

    add(result.table.formas.gerundio, { verb, label: { es: 'gerundio', en: 'gerund' }, mood: 'formas' });
    add(result.table.formas.participio, { verb, label: { es: 'participio', en: 'participle' }, mood: 'formas' });
  }

  return formIndex;
}

// ---------------------------------------------------------------------------
// answer builders
// ---------------------------------------------------------------------------

function conjugationAnswer(verb, language, { tense = null, person = null } = {}) {
  const result = conjugate(verb);
  if (!result.ok) return null;

  const gloss = GLOSSES.get(result.verb);
  const blocks = [];

  if (tense && person) {
    const [mood, key] = tense.split('.');
    const form = result.table[mood]?.[key]?.[person];
    if (form) {
      const label = TENSE_LABELS[tense][language];
      blocks.push({
        type: 'md',
        text: language === 'es'
          ? `**${form}** — ${PERSON_LABELS[person]}, ${label} de *${result.verb}*.`
          : `**${form}** — ${PERSON_LABELS[person]}, ${label} of *${result.verb}*.`,
      });
      return withVerbLink(blocks, result.verb, language);
    }
  }

  const tenses = tense ? [tense] : ['indicativo.presente', 'indicativo.preterito', 'subjuntivo.presente'];

  // A verb that is both irregular and stem-changing earns a proper reaction.
  const hairy = result.flags.irregular && result.flags.stemChange;
  const lead = hairy ? exclaim('wow') : '';

  blocks.push({
    type: 'md',
    text: language === 'es'
      ? `${lead}**${result.verb}**${gloss ? ` — *${gloss}*` : ''}. Verbo terminado en -${result.class}${describeFlags(result, 'es')}.`
      : `${lead}**${result.verb}**${gloss ? ` — *${gloss}*` : ''}. An -${result.class} verb${describeFlags(result, 'en')}.`,
  });

  for (const key of tenses) {
    const [mood, name] = key.split('.');
    const forms = result.table[mood]?.[name];
    if (!forms) continue;
    blocks.push({
      type: 'table',
      caption: TENSE_LABELS[key][language],
      head: [language === 'es' ? 'persona' : 'person', language === 'es' ? 'forma' : 'form'],
      rows: PERSONS.map((p) => [PERSON_LABELS[p], forms[p] || '—']),
    });
  }

  if (!tense) {
    blocks.push({
      type: 'md',
      text: language === 'es'
        ? '_Los demás tiempos están en la tabla completa._'
        : '_The remaining tenses are in the full table._',
    });
  }

  return withVerbLink(blocks, result.verb, language);
}

function describeFlags(result, language) {
  const parts = [];
  if (result.flags.stemChange) {
    parts.push(language === 'es' ? `con cambio de raíz ${result.flags.stemChange.replace(':', ' → ')}` : `with a ${result.flags.stemChange.replace(':', ' → ')} stem change`);
  }
  if (result.flags.irregular) parts.push(language === 'es' ? 'irregular' : 'irregular');
  if (result.flags.derivedFrom) {
    parts.push(language === 'es' ? `se conjuga como *${result.flags.derivedFrom}*` : `conjugated like *${result.flags.derivedFrom}*`);
  }
  return parts.length ? `, ${parts.join(', ')}` : '';
}

function withVerbLink(blocks, verb, language) {
  blocks.push({
    type: 'links',
    label: language === 'es' ? 'Tabla completa' : 'Full table',
    items: [{ label: verb, href: '/conjugacion' }],
  });
  return blocks;
}

async function dictionaryAnswer(word, language) {
  const data = await getJson(`/api/dictionary?word=${encodeURIComponent(word)}`);
  const senses = data.entries.flatMap((entry) => entry.senses).slice(0, 3);
  if (!senses.length) return null;

  const blocks = [{
    type: 'md',
    text: `${exclaim('good')}**${data.word}**${data.entries[0]?.origin ? ` — *${data.entries[0].origin}*` : ''}`,
  }];

  const lines = senses.map((sense, index) => {
    const tags = [sense.category, sense.gender, sense.verbCategory].filter(Boolean).join(', ');
    return `${index + 1}. ${tags ? `*(${tags})* ` : ''}${sense.description}`;
  });
  blocks.push({ type: 'md', text: lines.join('\n') });

  const example = data.examples?.[senses[0].number];
  if (example?.es) {
    blocks.push({
      type: 'md',
      text: `> ${example.es}${example.en ? `\n> \n> ${example.en}` : ''}`,
    });
  }

  const synonyms = senses[0].synonyms.slice(0, 6);
  if (synonyms.length) {
    blocks.push({
      type: 'md',
      text: `${language === 'es' ? '**Sinónimos:** ' : '**Synonyms:** '}${synonyms.join(', ')}`,
    });
  }

  blocks.push({
    type: 'links',
    label: language === 'es' ? 'Ficha completa' : 'Full entry',
    items: [{ label: data.word, href: `/diccionario?q=${encodeURIComponent(data.word)}` }],
  });
  return blocks;
}

async function translationAnswer(text, from, language) {
  const data = await postJson('/api/translate', { text, from });
  if (!data.translation) return null;
  return [
    { type: 'md', text: `**${data.translation}**` },
    {
      type: 'md',
      text: language === 'es'
        ? `_«${text}» — traducido con ${data.engine || 'MyMemory'}._`
        : `_"${text}" — translated with ${data.engine || 'MyMemory'}._`,
    },
  ];
}

function formLookupAnswer(word, language) {
  const matches = getFormIndex().get(fold(word));
  if (!matches?.length) return null;

  const lines = matches.slice(0, 4).map((match) => {
    const who = match.person ? `${PERSON_LABELS[match.person]}, ` : '';
    return language === 'es'
      ? `- **${word}** — ${who}${match.label.es} de *${match.verb}*`
      : `- **${word}** — ${who}${match.label.en} of *${match.verb}*`;
  });

  return [
    {
      type: 'md',
      text: (language === 'es' ? 'Es una forma conjugada:\n\n' : "That's a conjugated form:\n\n") + lines.join('\n'),
    },
    {
      type: 'links',
      label: language === 'es' ? 'Conjugación' : 'Conjugation',
      items: [...new Set(matches.slice(0, 4).map((m) => m.verb))].map((verb) => ({ label: verb, href: '/conjugacion' })),
    },
  ];
}

function topicAnswer(topic, language) {
  return [
    { type: 'md', text: `### ${topic.title[language]}\n\n${topic.body[language]}` },
  ];
}

// ---------------------------------------------------------------------------
// intent matching
// ---------------------------------------------------------------------------

// "conjuga X", "conjugación de X", "how do you conjugate X"
const CONJUGATE = /(?:conjuga(?:r|me|cion|ción)?|conjugate|conjugation of|como se conjuga|cómo se conjuga)\s+(?:de[l]?\s+|el\s+verbo\s+|the\s+verb\s+)?([a-záéíóúüñ]+)/i;
// the other word order: "ir conjugation", "tener conjugado"
const CONJUGATE_TRAILING = /^([a-záéíóúüñ]+)\s+(?:conjugation|conjugated|conjugation table|conjugación|conjugado)\b/i;
const DEFINE = /(?:que significa|qué significa|significado de|define|definicion de|definición de|what does|what is the meaning of|meaning of)\s+["«'“]?([a-záéíóúüñ]+)["»'”]?/i;
const TRANSLATE_ES = /(?:como se dice|cómo se dice|how do you say|how do i say|translate)\s+["«'“]?(.+?)["»'”]?\s*(?:en espanol|en español|in spanish|al espanol|al español)?\s*\??$/i;
const TRANSLATE_TEXT = /(?:traduce|traducir|translate)\s+["«'“]?(.+?)["»'”]?\s*$/i;
const WHAT_FORM = /(?:que es|qué es|que forma es|qué forma es|what form is|what is)\s+["«'“]?([a-záéíóúüñ]+)["»'”]?/i;

function findHint(text, table) {
  for (const [pattern, value] of table) if (pattern.test(text)) return value;
  return null;
}

/** "el subjuntivo" is the same question as "subjuntivo". */
const LEADING_ARTICLE = /^(?:el|la|los|las|un|una|the|a)\s+/;

function scoreTopic(topic, folded) {
  const bare = folded.replace(LEADING_ARTICLE, '');
  let score = 0;
  for (const keyword of topic.keywords) {
    const key = fold(keyword);
    if (folded === key || bare === key) return 100;
    if (new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(folded)) {
      score += key.includes(' ') ? 6 : 3;
    }
  }
  return score;
}

/**
 * Work out what the question is asking and answer it.
 * @returns {Promise<{blocks: Array, confident: boolean}>}
 */
export async function answer(question, { language = null } = {}) {
  const text = String(question || '').trim();
  const lang = detectLanguage(text, language);
  const folded = fold(text).replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();
  const accented = text.toLowerCase().replace(/[¿?¡!.,;:«»"]/g, ' ').replace(/\s+/g, ' ').trim();

  const respond = (blocks) => ({ blocks, confident: true, language: lang });

  // 1. greetings and thanks
  for (const item of SMALL_TALK) {
    if (item.match.test(folded)) return respond([{ type: 'md', text: item.reply[lang] }]);
  }

  // 2. what can you do
  if (/\b(ayuda|help|que puedes hacer|what can you do|que sabes hacer)\b/.test(folded)) {
    return respond([{ type: 'md', text: capabilities(lang) }]);
  }

  // 3. explicit commands
  const conjugateMatch = CONJUGATE.exec(text) || CONJUGATE_TRAILING.exec(text);
  if (conjugateMatch) {
    const blocks = conjugationAnswer(conjugateMatch[1], lang, {
      tense: findHint(folded, TENSE_HINTS),
      person: findHint(accented, PERSON_HINTS),
    });
    if (blocks) return respond(blocks);
  }

  // Tracked so a failed lookup cannot quietly answer a different question: a
  // translation request that could not be served should not fall through to a
  // grammar topic that happens to share a word with it.
  let askedSomethingSpecific = false;

  const translateMatch = TRANSLATE_ES.exec(text);
  if (translateMatch && /(?:en espanol|en español|in spanish|al espanol|al español)/i.test(text)) {
    askedSomethingSpecific = true;
    const blocks = await translationAnswer(translateMatch[1].trim(), 'en', lang).catch(() => null);
    if (blocks) return respond(blocks);
  }

  const defineMatch = DEFINE.exec(text);
  if (defineMatch) {
    askedSomethingSpecific = true;
    const word = defineMatch[1];
    const blocks = await dictionaryAnswer(word, lang).catch(() => null);
    if (blocks) return respond(blocks);

    const asForm = formLookupAnswer(word, lang);
    if (asForm) return respond(asForm);

    // The dictionary is unreachable but we do know this verb — its table is a
    // better answer than nothing.
    if (KNOWN_VERBS.has(fold(word))) {
      const table = conjugationAnswer(word, lang);
      if (table) return respond(table);
    }
  }

  const formMatch = WHAT_FORM.exec(text);
  if (formMatch) {
    const blocks = formLookupAnswer(formMatch[1], lang);
    if (blocks) return respond(blocks);
  }

  const words = folded.split(' ').filter(Boolean);

  const ranked = TOPICS
    .map((topic) => ({ topic, score: scoreTopic(topic, folded) }))
    .sort((a, b) => b.score - a.score);

  // 4. A question that names a verb *and* asks about forms wants that verb's
  //    table, not a general essay: "how do you say tener in the past tense"
  //    used to land on the preterite-vs-imperfect topic. An exact topic match
  //    (score 100) still wins, so "cuándo se usa el subjuntivo" stays a topic.
  if (ranked[0]?.score < 100 && CONJUGATION_CUE.test(folded)) {
    const named = verbNamedIn(words);
    if (named) {
      const blocks = conjugationAnswer(named, lang, {
        tense: findHint(folded, TENSE_HINTS),
        person: findHint(accented, PERSON_HINTS),
      });
      if (blocks) return respond(blocks);
    }
  }

  // 5. grammar topics
  if (!askedSomethingSpecific && ranked[0]?.score >= 6) return respond(topicAnswer(ranked[0].topic, lang));

  // 6. a bare word or two: a verb form, an infinitive, or a dictionary entry.
  // Every word is a candidate, not just the first long one — "ir conjugation"
  // has its verb in the two-letter word.
  if (words.length <= 3) {
    // An infinitive anywhere in the phrase wins outright.
    for (const word of words) {
      if (!/(?:ar|er|ir|ír)$/.test(word)) continue;
      const blocks = conjugationAnswer(word, lang, {
        tense: findHint(folded, TENSE_HINTS),
        person: findHint(accented, PERSON_HINTS),
      });
      if (blocks) return respond(blocks);
    }

    for (const word of words) {
      const asForm = formLookupAnswer(word, lang);
      if (asForm) return respond(asForm);
    }

    const headword = words.find((word) => word.length > 2) || words[0];
    if (headword) {
      const blocks = await dictionaryAnswer(headword, lang).catch(() => null);
      if (blocks) return respond(blocks);
    }
  }

  // 7. an explicit "traduce …" that did not name a direction
  const anyTranslate = TRANSLATE_TEXT.exec(text);
  if (anyTranslate) {
    const phrase = anyTranslate[1].trim();
    const blocks = await translationAnswer(phrase, detectLanguage(phrase, 'es') === 'en' ? 'en' : 'es', lang).catch(() => null);
    if (blocks) return respond(blocks);
  }

  // 8. a lower-confidence topic match is better than nothing
  if (!askedSomethingSpecific && ranked[0]?.score >= 3) return respond(topicAnswer(ranked[0].topic, lang));

  return { blocks: [{ type: 'md', text: outOfScope(lang) }], confident: false, language: lang };
}

function capabilities(language) {
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
}

function outOfScope(language) {
  return language === 'es'
    ? `${exclaim('bad')}Eso se me escapa. Respondo a partir de los datos del sitio —el conjugador, la RAE y un puñado de explicaciones de gramática—, así que no invento respuestas sobre lo que no conozco.

Prueba con *conjuga salir*, *qué significa madrugar*, *qué es «tuve»* o *ser y estar*. Escribe **ayuda** para ver la lista completa.`
    : `${exclaim('bad')}That one's outside what I cover. I answer from the site's own data — the conjugator, the RAE dictionary and a set of grammar explanations — so I'd rather say nothing than invent an answer.

Try *conjugate salir*, *what does madrugar mean*, *what is "tuve"*, or *ser vs estar*. Type **help** for the full list.`;
}

/** Exposed for the tests. */
export { getFormIndex };
