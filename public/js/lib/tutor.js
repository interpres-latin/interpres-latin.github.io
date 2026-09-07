/**
 * The grounded tutor behind the chat page.
 *
 * It answers from data the site already holds — the conjugation engine, the
 * dictionary, the translator — plus a set of hand-written grammar
 * explanations. Nothing is generated, so nothing it says about the language can
 * be invented; the cost is that its scope is finite, and it says so when a
 * question falls outside.
 *
 * The routing here is language-neutral. Everything specific to a language —
 * which engine to call, which words signal an intent, what the tutor says in
 * its own voice — comes from a pack: lib/tutor-es.js or lib/tutor-fr.js. The
 * two sides therefore share one set of decisions rather than drifting apart,
 * which matters because the interesting behaviour is all in the routing.
 *
 * Every answer is a list of blocks the chat view knows how to render:
 *   { type: 'md',    text }
 *   { type: 'table', head: [...], rows: [[...]] }
 *   { type: 'links', label, items: [{ label, href }] }
 */

import { PACK as ES } from './tutor-es.js';
import { PACK as FR } from './tutor-fr.js';
import { PACK as LA } from './tutor-la.js';
import { studyLang } from './study.js';
import { fold, getJson, postJson } from './dom.js';

const PACKS = { es: ES, fr: FR, la: LA };

/** The pack for the language the site is currently about. */
function activePack(override = null) {
  return PACKS[override] ?? PACKS[studyLang()] ?? ES;
}

/**
 * The profe's interjections. Used where she would have used them — cheering a
 * find, tutting at a miss — and rationed, because a catchphrase on every single
 * message stops being a catchphrase.
 */
const EXCLAIM_ODDS = { good: 0.4, bad: 1, wow: 1 };

function exclaim(pack, kind) {
  const options = pack.EXCLAMATIONS[kind];
  if (!options || Math.random() > (EXCLAIM_ODDS[kind] ?? 1)) return '';
  return `${options[Math.floor(Math.random() * options.length)]} `;
}

/** The first known verb named anywhere in the question. */
function verbNamedIn(pack, words) {
  for (const word of words) {
    if (pack.KNOWN_VERBS.has(word)) return word;
  }
  return null;
}

// ---------------------------------------------------------------------------
// language of the question
// ---------------------------------------------------------------------------

/**
 * Crude but adequate: count marker words. A bare word like "ayuda" or
 * "durmiendo" carries no signal at all, so the caller can pass the language the
 * conversation has been using rather than flip-flopping between the two.
 */
export function detectLanguage(text, fallback = null, pack = null) {
  const active = activePack(pack);
  const lower = String(text).toLowerCase();
  const english = (lower.match(active.MARKERS.english) || []).length;
  const study = (lower.match(active.MARKERS.study) || []).length;
  if (english > study) return 'en';
  if (study > english) return active.code;
  if (active.MARKERS.diacritics.test(lower)) return active.code;
  return fallback || 'en';
}

// ---------------------------------------------------------------------------
// reverse index: conjugated form -> where it comes from
// ---------------------------------------------------------------------------

const indexes = new Map();

/** Built once per language, lazily: every verb in the list × its single-word forms. */
function getFormIndex(pack = null) {
  const active = activePack(pack);
  if (indexes.has(active.code)) return indexes.get(active.code);

  const index = new Map();
  const { shape } = active;

  const add = (form, entry) => {
    if (!form || form.includes(' ')) return; // compound tenses are not looked up
    const key = fold(form);
    if (!index.has(key)) index.set(key, []);
    const bucket = index.get(key);
    if (!bucket.some((item) => item.verb === entry.verb && item.label === entry.label)) bucket.push(entry);
  };

  for (const [verb] of active.GLOSSES) {
    const result = active.conjugate(verb);
    if (!result.ok) continue;

    for (const key of active.INDEX_TENSES) {
      const [mood, tense] = key.split('.');
      const forms = result.table[mood]?.[tense];
      if (!forms) continue;
      const label = active.TENSE_LABELS[key];
      for (const person of active.PERSONS) add(forms[person], { verb, person, label, mood, tense });
    }

    const imperative = result.table[shape.imperative]?.[shape.affirmative] ?? {};
    for (const [person, form] of Object.entries(imperative)) {
      add(form, { verb, person, label: active.FORM_LABELS.imperative, mood: shape.imperative });
    }

    const nonFinite = result.table[shape.nonFinite] ?? {};
    add(nonFinite[shape.gerund], { verb, label: active.FORM_LABELS.gerund, mood: shape.nonFinite });
    add(nonFinite[shape.participle], { verb, label: active.FORM_LABELS.participle, mood: shape.nonFinite });
  }

  indexes.set(active.code, index);
  return index;
}

// ---------------------------------------------------------------------------
// English gloss -> verb
// ---------------------------------------------------------------------------

const glossIndexes = new Map();

/**
 * The search index read backwards: "to say" -> decir.
 *
 * Every verb in the index is stored with its English gloss, so the same data
 * that powers the conjugator's search answers a vocabulary question — offline,
 * exactly, and without spending a translation. A gloss holding several senses
 * ("to take, to grab") is indexed under each of them, and under the bare verb
 * as well, since a reader is as likely to type "say" as "to say".
 */
function glossIndex(pack) {
  if (glossIndexes.has(pack.code)) return glossIndexes.get(pack.code);

  const index = new Map();
  const add = (key, verb) => {
    const clean = fold(key).replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean && !index.has(clean)) index.set(clean, verb);
  };

  for (const [verb, gloss] of pack.GLOSSES) {
    for (const sense of String(gloss).split(/[,;]/)) {
      const phrase = sense.trim();
      if (!phrase) continue;
      add(phrase, verb);
      add(phrase.replace(/^to\s+/i, ''), verb);
    }
  }

  glossIndexes.set(pack.code, index);
  return index;
}

/** The verb an English phrase names, if the index knows one. */
function verbForGloss(pack, phrase) {
  const key = fold(phrase).replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!key) return null;
  const index = glossIndex(pack);
  return index.get(key) ?? index.get(`to ${key}`) ?? null;
}

// ---------------------------------------------------------------------------
// answer builders
// ---------------------------------------------------------------------------

function conjugationAnswer(pack, verb, language, { tense = null, person = null } = {}) {
  const result = pack.conjugate(verb);
  if (!result.ok) return null;

  const gloss = pack.GLOSSES.get(result.verb);
  const blocks = [];

  if (tense && person) {
    const [mood, key] = tense.split('.');
    const form = result.table[mood]?.[key]?.[person];
    if (form) {
      const label = pack.TENSE_LABELS[tense][language];
      blocks.push({
        type: 'md',
        text: `**${form}** — ${pack.PERSON_LABELS[person]}, ${label} ${pack.labels.of[language]} *${result.verb}*.`,
      });
      return withVerbLink(pack, blocks, result.verb, language);
    }
  }

  const tenses = tense ? [tense] : pack.DEFAULT_TENSES;
  const lead = pack.isHairy(result) ? exclaim(pack, 'wow') : '';

  blocks.push({ type: 'md', text: pack.verbHeadline(result, gloss, lead, language) });

  for (const key of tenses) {
    const [mood, name] = key.split('.');
    const forms = result.table[mood]?.[name];
    if (!forms) continue;
    blocks.push({
      type: 'table',
      caption: pack.TENSE_LABELS[key][language],
      head: [pack.labels.person[language], pack.labels.form[language]],
      rows: pack.PERSONS.map((p) => [pack.PERSON_LABELS[p], forms[p] || '—']),
    });
  }

  if (!tense) blocks.push({ type: 'md', text: pack.labels.otherTenses[language] });

  return withVerbLink(pack, blocks, result.verb, language);
}

function withVerbLink(pack, blocks, verb, language) {
  blocks.push({
    type: 'links',
    label: pack.labels.fullTable[language],
    items: [{ label: verb, href: `/conjugacion?v=${encodeURIComponent(verb)}` }],
  });
  return blocks;
}

async function dictionaryAnswer(pack, word, language) {
  const data = await getJson(`/api/dictionary?word=${encodeURIComponent(word)}&study=${pack.code}`);
  const senses = data.entries.flatMap((entry) => entry.senses).slice(0, 3);
  if (!senses.length) return null;

  const blocks = [{
    type: 'md',
    text: `${exclaim(pack, 'good')}**${data.word}**${data.entries[0]?.origin ? ` — *${data.entries[0].origin}*` : ''}`,
  }];

  const lines = senses.map((sense, index) => {
    const tags = [sense.category, sense.gender, sense.verbCategory].filter(Boolean).join(', ');
    return `${index + 1}. ${tags ? `*(${tags})* ` : ''}${sense.description}`;
  });
  blocks.push({ type: 'md', text: lines.join('\n') });

  const example = data.examples?.[senses[0].number];
  const source = example?.text ?? example?.es;
  if (source) {
    blocks.push({ type: 'md', text: `> ${source}${example.en ? `\n> \n> ${example.en}` : ''}` });
  }

  const synonyms = senses[0].synonyms.slice(0, 6);
  if (synonyms.length) {
    blocks.push({ type: 'md', text: `${pack.labels.synonyms[language]}${synonyms.join(', ')}` });
  }

  blocks.push({
    type: 'links',
    label: pack.labels.fullEntry[language],
    items: [{ label: data.word, href: `/diccionario?q=${encodeURIComponent(data.word)}` }],
  });
  return blocks;
}

async function translationAnswer(pack, text, from, language) {
  const data = await postJson('/api/translate', { text, from, study: pack.code });
  if (!data.translation) return null;

  const blocks = [
    { type: 'md', text: `**${data.translation}**` },
    {
      type: 'md',
      text: `_«${text}» — ${pack.labels.translatedWith[language]} ${data.engine || 'MyMemory'}._`,
    },
  ];
  // The array is what every caller wants; the translation rides along for the
  // one that asks for a definition of the word it just produced.
  blocks.translation = data.translation;
  return blocks;
}

/**
 * The part of "how do you say X in Spanish and give a definition" that is X.
 *
 * The intent pattern only allowed the language at the very end, so the lazy
 * capture swallowed the rest of the question and translated *that*: asking for
 * tomato returned «tomate» en español y su definición, the whole sentence
 * rendered into Spanish. The language marker is cut wherever it appears, and so
 * is a tacked-on request for a definition.
 */
const LANGUAGE_TAIL = /\s+(?:in|into|en|al|au)\s+(?:spanish|espa[nñ]ol|english|ingl[eé]s|french|fran[cç]ais|latin|lat[ií]n)\b.*$/i;
const EXTRA_REQUEST = /\s*(?:[,;]|\band\b|\by\b|\bet\b)\s*(?:also\s+)?(?:give|show|tell|with|include|add)?\s*(?:me\s+)?(?:the\s+|a\s+|its\s+|it's\s+)?(?:definition|meaning|significado|definici[oó]n|d[eé]finition|sens)\b.*$/i;

function translationPhrase(raw) {
  return String(raw ?? '').replace(LANGUAGE_TAIL, '').replace(EXTRA_REQUEST, '').trim();
}

/** Whether the question also asked what the word means. */
const WANTS_DEFINITION = /\b(definition|define|meaning|significado|definici[oó]n|significa|d[eé]finition|sens)\b/i;

function formLookupAnswer(pack, word, language) {
  const matches = getFormIndex(pack.code).get(fold(word));
  if (!matches?.length) return null;

  const lines = matches.slice(0, 4).map((match) => {
    const who = match.person ? `${pack.PERSON_LABELS[match.person]}, ` : '';
    return `- **${word}** — ${who}${match.label[language]} ${pack.labels.of[language]} *${match.verb}*`;
  });

  return [
    { type: 'md', text: `${pack.labels.conjugatedForm[language]}\n\n${lines.join('\n')}` },
    {
      type: 'links',
      label: pack.labels.conjugation[language],
      items: [...new Set(matches.slice(0, 4).map((m) => m.verb))]
        .map((verb) => ({ label: verb, href: `/conjugacion?v=${encodeURIComponent(verb)}` })),
    },
  ];
}

function topicAnswer(topic, language) {
  // A pack may hold one body for every language it answers in — the Latin notes
  // are written in English whatever the interface says, because a tutor
  // replying in Latin would be a joke at the reader's expense.
  const title = topic.title[language] ?? topic.title.en;
  const body = topic.body[language] ?? topic.body.en;
  return [{ type: 'md', text: `### ${title}\n\n${body}` }];
}

// ---------------------------------------------------------------------------
// intent matching
// ---------------------------------------------------------------------------

function findHint(text, table) {
  for (const [pattern, value] of table) if (pattern.test(text)) return value;
  return null;
}

/**
 * A keyword matches its own plural, and a plural keyword its own singular.
 *
 * Otherwise "comparatives" misses the keyword *comparative*, and "how do I make
 * a command" misses *commands* — a question is declined over one letter, and
 * the reader spends one of their free five on it. The stem has to stay long
 * enough to be worth matching, so a short word ending in s is left alone.
 */
function keywordPattern(key) {
  const stem = key.length > 4 && key.endsWith('s') ? key.slice(0, -1) : key;
  return `\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`;
}

function scoreTopic(pack, topic, folded) {
  const bare = folded.replace(pack.LEADING_ARTICLE, '');
  let score = 0;
  for (const keyword of topic.keywords) {
    const key = fold(keyword);
    if (folded === key || bare === key) return 100;
    if (new RegExp(keywordPattern(key)).test(folded)) {
      score += key.includes(' ') ? 6 : 3;
    }
  }
  return score;
}

/**
 * Work out what the question is asking and answer it.
 * @returns {Promise<{blocks: Array, confident: boolean, language: string}>}
 */
export async function answer(question, { language = null, force = false, study = null } = {}) {
  const pack = activePack(study);
  const { INTENTS } = pack;

  const text = String(question || '').trim();
  // A pack may pin the language it answers in whatever it was asked in, which
  // is how the Latin side stays English.
  const lang = pack.ANSWER_LANGUAGE
    ?? (force && language ? language : detectLanguage(text, language, pack.code));
  const folded = fold(text).replace(/[¿?¡!.,;:«»"“”]/g, ' ').replace(/\s+/g, ' ').trim();
  const accented = text.toLowerCase().replace(/[¿?¡!.,;:«»"]/g, ' ').replace(/\s+/g, ' ').trim();

  const respond = (blocks) => ({ blocks, confident: true, language: lang });

  // 1. greetings and thanks
  for (const item of pack.SMALL_TALK) {
    if (item.match.test(folded)) return respond([{ type: 'md', text: item.reply[lang] }]);
  }

  // 2. what can you do
  if (pack.HELP.test(folded)) {
    return respond([{ type: 'md', text: pack.capabilities(lang) }]);
  }

  // 3. explicit commands
  const conjugateMatch = INTENTS.conjugate.exec(text)
    || INTENTS.conjugateTrailing.exec(text)
    || INTENTS.verbMarker.exec(text);
  if (conjugateMatch) {
    const blocks = conjugationAnswer(pack, conjugateMatch[1], lang, {
      tense: findHint(folded, pack.TENSE_HINTS),
      person: findHint(accented, pack.PERSON_HINTS),
    });
    if (blocks) return respond(blocks);
  }

  // 3b. intents only one language has — declining a noun, or looking up a
  //     vocabulary stage. Tried before the general ones so "decline puella"
  //     is not read as a request to define it.
  for (const intent of pack.EXTRA_INTENTS ?? []) {
    const match = intent.pattern.exec(text);
    if (!match) continue;
    // eslint-disable-next-line no-await-in-loop
    const blocks = await Promise.resolve(intent.build(match, lang, pack)).catch(() => null);
    if (blocks) return respond(blocks);
  }

  // Tracked so a failed lookup cannot quietly answer a different question: a
  // translation request that could not be served should not fall through to a
  // grammar topic that happens to share a word with it.
  let askedSomethingSpecific = false;

  /**
   * "How do you say X" — with or without naming the language.
   *
   * It used to insist the question ended "in Spanish", and refused otherwise.
   * Nobody types that on a Spanish site: "how to say I'm gay" was handed to a
   * model, which answered it well and charged a slot of the off-topic
   * allowance for a question the site's own translator could have answered.
   * The whole site is a translator between English and one other language, so
   * an unnamed direction is not ambiguous — it is the obvious one.
   *
   * Only an explicit "in English" sends it the other way.
   */
  const translateMatch = INTENTS.translateInto.exec(text);
  if (translateMatch) {
    const phrase = translationPhrase(translateMatch[1]);
    if (!phrase) return respond(pack.CAPABILITIES[lang]);

    // "how do you say the subjunctive" is a grammar question wearing this
    // shape; the same guard step 5b uses, applied before the engines.
    const asTopic = pack.TOPICS
      .map((topic) => ({ topic, score: scoreTopic(pack, topic, fold(phrase)) }))
      .sort((a, b) => b.score - a.score)[0];

    if (asTopic?.score >= 100) return respond(topicAnswer(asTopic.topic, lang));

    askedSomethingSpecific = true;
    const from = INTENTS.intoEnglishLanguage?.test(text) ? pack.code : 'en';
    const blocks = await translationAnswer(pack, phrase, from, lang).catch(() => null);

    if (blocks) {
      // "and give a definition" is a second question, and it is about the word
      // that just came back rather than the one that was typed.
      if (WANTS_DEFINITION.test(text) && blocks.translation && from === 'en') {
        const defined = await dictionaryAnswer(pack, blocks.translation, lang).catch(() => null);
        if (defined) return respond([...blocks, ...defined]);
      }
      return respond(blocks);
    }
  }

  const defineMatch = INTENTS.define.exec(text);
  if (defineMatch) {
    askedSomethingSpecific = true;
    const word = defineMatch[1];
    const blocks = await dictionaryAnswer(pack, word, lang).catch(() => null);
    if (blocks) return respond(blocks);

    const asForm = formLookupAnswer(pack, word, lang);
    if (asForm) return respond(asForm);

    // The dictionary is unreachable but we do know this verb — its table is a
    // better answer than nothing.
    if (pack.KNOWN_VERBS.has(fold(word))) {
      const table = conjugationAnswer(pack, word, lang);
      if (table) return respond(table);
    }
  }

  const formMatch = INTENTS.whatForm.exec(text);
  if (formMatch) {
    const blocks = formLookupAnswer(pack, formMatch[1], lang);
    if (blocks) return respond(blocks);
  }

  const words = folded.split(' ').filter(Boolean);

  const ranked = pack.TOPICS
    .map((topic) => ({ topic, score: scoreTopic(pack, topic, folded) }))
    .sort((a, b) => b.score - a.score);

  // 4. A question that names a verb *and* asks about forms wants that verb's
  //    table, not a general essay: "how do you say tener in the past tense"
  //    used to land on the preterite-vs-imperfect topic. An exact topic match
  //    (score 100) still wins, so "cuándo se usa el subjuntivo" stays a topic.
  if (ranked[0]?.score < 100 && pack.CONJUGATION_CUE.test(folded)) {
    const named = verbNamedIn(pack, words);
    if (named) {
      const blocks = conjugationAnswer(pack, named, lang, {
        tense: findHint(folded, pack.TENSE_HINTS),
        person: findHint(accented, pack.PERSON_HINTS),
      });
      if (blocks) return respond(blocks);
    }
  }

  // 5. grammar topics
  if (!askedSomethingSpecific && ranked[0]?.score >= 6) return respond(topicAnswer(ranked[0].topic, lang));

  // 5b. "to say in Spanish" — a vocabulary question with the direction named
  //     but nothing asking for a translation, which is how most people put it.
  //     After the topics, so "the subjunctive in Spanish" stays a topic.
  const intoStudy = INTENTS.intoStudy?.exec(text);
  const intoEnglish = INTENTS.intoEnglish?.exec(text);
  const bareVerb = !intoStudy && !intoEnglish ? INTENTS.bareEnglishVerb?.exec(text) : null;

  if (intoStudy || bareVerb) {
    const phrase = (intoStudy ?? bareVerb)[1].trim();

    // "the subjunctive in Spanish" is a grammar question wearing this shape.
    // Scored on the phrase alone, since the trailing "in Spanish" is what makes
    // it look like a translation request in the first place.
    const asTopic = pack.TOPICS
      .map((topic) => ({ topic, score: scoreTopic(pack, topic, fold(phrase)) }))
      .sort((a, b) => b.score - a.score)[0];
    if (asTopic?.score >= 6) return respond(topicAnswer(asTopic.topic, lang));

    askedSomethingSpecific = true;

    // The conjugator's own index answers this exactly, offline, and gives the
    // whole paradigm rather than one word — so it is tried before the engines.
    const known = verbForGloss(pack, phrase);
    if (known) {
      const blocks = conjugationAnswer(pack, known, lang, {
        tense: findHint(folded, pack.TENSE_HINTS),
        person: findHint(accented, pack.PERSON_HINTS),
      });
      if (blocks) return respond(blocks);
    }

    const blocks = await translationAnswer(pack, phrase, 'en', lang).catch(() => null);
    if (blocks) return respond(blocks);
  }

  if (intoEnglish) {
    askedSomethingSpecific = true;
    const blocks = await translationAnswer(pack, intoEnglish[1].trim(), pack.code, lang).catch(() => null);
    if (blocks) return respond(blocks);
  }

  // 6. a bare word or two: a verb form, an infinitive, or a dictionary entry.
  // Every word is a candidate, not just the first long one — "ir conjugation"
  // has its verb in the two-letter word. Skipped when the question already
  // named its subject: if "qué significa sobremesa" could not reach the
  // dictionary, the answer is not "significa is a form of significar".
  if (!askedSomethingSpecific && words.length <= 3) {
    // An infinitive anywhere in the phrase wins outright — but only one we
    // know. French endings collide with ordinary English words far too often
    // to conjugate on the strength of the spelling alone.
    for (const word of words) {
      if (!pack.INFINITIVE.test(word) || !pack.KNOWN_VERBS.has(word)) continue;
      const blocks = conjugationAnswer(pack, word, lang, {
        tense: findHint(folded, pack.TENSE_HINTS),
        person: findHint(accented, pack.PERSON_HINTS),
      });
      if (blocks) return respond(blocks);
    }

    for (const word of words) {
      const asForm = formLookupAnswer(pack, word, lang);
      if (asForm) return respond(asForm);
    }

    const headword = words.find((word) => word.length > 2) || words[0];
    if (headword) {
      const blocks = await dictionaryAnswer(pack, headword, lang).catch(() => null);
      if (blocks) return respond(blocks);
    }
  }

  // 7. an explicit "traduce …" that did not name a direction
  const anyTranslate = INTENTS.translateAny.exec(text);
  if (anyTranslate) {
    const phrase = anyTranslate[1].trim();
    const from = detectLanguage(phrase, pack.code, pack.code) === 'en' ? 'en' : pack.code;
    const blocks = await translationAnswer(pack, phrase, from, lang).catch(() => null);
    if (blocks) return respond(blocks);
  }

  // 8. a lower-confidence topic match is better than nothing
  if (!askedSomethingSpecific && ranked[0]?.score >= 3) return respond(topicAnswer(ranked[0].topic, lang));

  return {
    blocks: [{ type: 'md', text: pack.outOfScope(lang, exclaim(pack, 'bad')) }],
    confident: false,
    language: lang,
  };
}

/** Exposed for the tests. */
export { getFormIndex, activePack };
