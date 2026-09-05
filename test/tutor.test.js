/**
 * Intent routing and the conjugated-form index.
 *
 * Only the offline paths are covered here — dictionary and translation answers
 * need the server, and are exercised by the browser smoke tests instead.
 */
import { answer, detectLanguage, getFormIndex } from '../public/js/lib/tutor.js';

let checked = 0;
const failures = [];

function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

function text(blocks) {
  return blocks.map((block) => (block.type === 'md' ? block.text : JSON.stringify(block))).join('\n');
}

// --- language detection ----------------------------------------------------
ok('detects English', detectLanguage('what does sobremesa mean') === 'en');
ok('detects Spanish', detectLanguage('qué significa sobremesa') === 'es');
ok('detects Spanish from accents alone', detectLanguage('¿mañana?') === 'es');

// --- the form index --------------------------------------------------------
const index = getFormIndex();
ok('index is populated', index.size > 5000, `${index.size} forms`);
ok('index has hablo', index.get('hablo')?.some((e) => e.verb === 'hablar'));
ok('index has dijeron', index.get('dijeron')?.some((e) => e.verb === 'decir'));
ok('index has durmiendo', index.get('durmiendo')?.some((e) => e.verb === 'dormir'));
ok('index has tuviéramos', index.get('tuvieramos')?.some((e) => e.verb === 'tener'));
ok('index is accent-insensitive', Boolean(index.get('hableis')), 'habléis should be findable unaccented');

// --- routing ---------------------------------------------------------------
const cases = [
  ['hola', /puedo conjugar|hello/i, 'greeting'],
  ['help', /conjugate|conjugar/i, 'capabilities'],
  ['ayuda', /conjugar/i, 'capabilities in Spanish'],

  ['ser y estar', /ser y estar|ser vs/i, 'ser/estar topic'],
  ['what is the difference between por and para', /por vs\. para|por y para/i, 'por/para topic'],
  ['cuándo se usa el subjuntivo', /subjuntivo/i, 'subjunctive topic'],
  ['why do we say me gusta', /gustar/i, 'gustar topic'],
  ['saber vs conocer', /saber/i, 'saber/conocer topic'],
  ['explain written accents', /accent|tilde/i, 'accents topic'],
  ['muy vs mucho', /muy/i, 'muy/mucho topic'],

  ['conjuga tener', /tener/i, 'conjugation'],
  // The verb can come first, and can be shorter than the word beside it —
  // "ir conjugation" once fell through to the model because of both.
  ['ir conjugation', /\bir\b/i, 'verb-first conjugation'],
  ['ir', /\bir\b/i, 'a two-letter infinitive alone'],
  ['tener conjugation', /tener/i, 'verb-first, longer verb'],
  ['conjugación de ir', /\bir\b/i, 'conjugation with "de"'],
  ['hablar conjugation table', /hablar/i, 'verb-first with trailing words'],
  ['how do you conjugate ir', /\bir\b/i, 'question form'],
  ['conjugate pedir', /pedir/i, 'conjugation in English'],
  // A verb named anywhere, with a cue about forms, beats a general topic:
  // "how do you say tener in the past tense" used to answer with the
  // preterite-vs-imperfect essay instead of tener's table.
  ['how to say ir present tense', /\bir\b/i, 'verb + tense in a long question'],
  ['present tense of ir', /\bir\b/i, 'tense before the verb'],
  ['how do you say tener in the past tense', /tener/i, 'verb beats the past-tense topic'],
  ['what is hablar in the future', /hablar/i, 'verb beats the future topic'],
  ['give me the preterite forms of pedir', /pedir/i, 'verb beats the preterite topic'],
  ['give the present tense for ir', /\bir\b/i, 'imperative phrasing, verb last'],
  ['give me the present tense of ir', /\bir\b/i, 'the same with "of"'],
  // …but an exact topic match still wins, articles and all.
  ['cuándo se usa el subjuntivo', /subjuntivo no es un tiempo|subjunctive isn/i, 'exact topic beats the verb "usar"'],
  ['el subjuntivo', /subjuntivo no es un tiempo|subjunctive isn/i, 'topic despite the leading article'],
  ['la tilde', /tilde|accent/i, 'article-prefixed topic'],
  ['qué es «dijeron»', /decir/i, 'form lookup'],
  ['tuve', /tener/i, 'bare form lookup'],
  ['durmiendo', /dormir/i, 'gerund lookup'],
];

for (const [question, pattern, name] of cases) {
  const result = await answer(question);
  const body = text(result.blocks);
  ok(`routes "${question}" → ${name}`, result.confident && pattern.test(body), body.slice(0, 160));
}

// --- tense and person narrowing -------------------------------------------
const subjunctive = await answer('conjuga tener en subjuntivo');
ok('subjunctive request returns subjunctive forms',
  subjunctive.blocks.some((b) => b.type === 'table' && b.rows.some(([, form]) => form === 'tenga')),
  text(subjunctive.blocks).slice(0, 200));

const preterite = await answer('conjugate pedir in the preterite');
ok('preterite request returns preterite forms',
  preterite.blocks.some((b) => b.type === 'table' && b.rows.some(([, form]) => form === 'pidió')),
  text(preterite.blocks).slice(0, 200));

const single = await answer('conjuga hacer en pretérito, yo');
ok('tense + person returns one form', /\*\*hice\*\*/.test(text(single.blocks)), text(single.blocks).slice(0, 160));

// "el verbo" must not be read as the pronoun "él"
const article = await answer('conjuga el verbo hablar en presente');
ok('"el verbo" is not mistaken for the pronoun él',
  article.blocks.some((b) => b.type === 'table' && b.rows.length === 6),
  text(article.blocks).slice(0, 160));

// A named verb only wins when the question is about forms.
const meaning = await answer('ser y estar');
ok('"ser y estar" stays a topic, not a conjugation of ser',
  /ser y estar|ser vs/i.test(text(meaning.blocks)) && !meaning.blocks.some((b) => b.type === 'table'),
  text(meaning.blocks).slice(0, 120));

// The tense asked for is the tense shown.
const future = await answer('what is hablar in the future');
ok('the requested tense is the one returned',
  future.blocks.some((b) => b.type === 'table' && b.rows.some(([, form]) => form === 'hablaré')),
  text(future.blocks).slice(0, 200));

// --- honest refusal --------------------------------------------------------
const outside = await answer('who won the world cup in 1998');
ok('declines what it does not cover', outside.confident === false, text(outside.blocks).slice(0, 120));
ok('refusal explains the scope', /outside what I cover|se me escapa/i.test(text(outside.blocks)));

const outsideEs = await answer('¿cuál es la capital de Mongolia?');
ok('declines in Spanish too', outsideEs.confident === false && /se me escapa/.test(text(outsideEs.blocks)));

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} tutor checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} tutor checks passed`);
