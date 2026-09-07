/**
 * Intent routing and the conjugated-form index, French side.
 *
 * The routing itself is shared with the Spanish tutor — these checks exist to
 * prove the French pack drives it correctly, not to re-test the router. Only
 * the offline paths are covered; dictionary and translation answers need the
 * server.
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

// Everything here asks the French pack explicitly: the study language is a
// browser setting, and the tests run in Node.
const fr = (question, options = {}) => answer(question, { study: 'fr', ...options });

// --- language detection ----------------------------------------------------
ok('detects English', detectLanguage('what does flâner mean', null, 'fr') === 'en');
ok('detects French', detectLanguage('que veut dire flâner', null, 'fr') === 'fr');
ok('detects French from accents alone', detectLanguage('déjà ?', null, 'fr') === 'fr');

// --- the form index --------------------------------------------------------
const index = getFormIndex('fr');
ok('index is populated', index.size > 3000, `${index.size} forms`);
ok('index has parle', index.get('parle')?.some((e) => e.verb === 'parler'));
ok('index has vinrent', index.get('vinrent')?.some((e) => e.verb === 'venir'));
ok('index has fûmes', index.get('fumes')?.some((e) => e.verb === 'être'));
ok('index has buvions', index.get('buvions')?.some((e) => e.verb === 'boire'));
ok('index has voulu', index.get('voulu')?.some((e) => e.verb === 'vouloir'));
ok('index has compris', index.get('compris')?.some((e) => e.verb === 'comprendre'));
ok('index is accent-insensitive', Boolean(index.get('etiez')), 'étiez should be findable unaccented');

// --- routing ---------------------------------------------------------------
const cases = [
  ['bonjour', /conjuguer|hello/i, 'greeting'],
  ['aide', /conjuguer/i, 'capabilities in French'],
  ['help', /conjugate/i, 'capabilities in English'],

  ['être et avoir', /être|avoir/i, 'être/avoir topic'],
  ['le subjonctif', /subjonctif|subjunctive/i, 'subjunctive topic'],
  ['quand utiliser le subjonctif', /subjonctif|subjunctive/i, 'subjunctive, asked as a question'],
  ["what is the difference between savoir and connaître", /savoir/i, 'savoir/connaître topic'],
  ['passé composé et imparfait', /imparfait/i, 'past tenses topic'],
  ['y et en', /\by\b|\ben\b/i, 'y/en topic'],
  ['la négation', /ne .*pas|negat/i, 'negation topic'],
  ['article partitif', /partitif|partitive/i, 'partitive topic'],
  ['tu ou vous', /vous/i, 'tu/vous topic'],
  ['explain written accents', /accent/i, 'accents topic, asked in English'],
  ['depuis ou pendant', /depuis/i, 'depuis/pendant topic'],

  ['conjugue prendre', /prendre/i, 'conjugation'],
  ['conjugue partir', /partir/i, 'conjugation of a short -ir verb'],
  ['conjugaison de faire', /faire/i, 'conjugation with "de"'],
  ['conjugate vendre', /vendre/i, 'conjugation asked in English'],
  ['finir conjugation', /finir/i, 'verb-first'],
  ['aller', /aller/i, 'a bare infinitive'],
  ['le verbe boire', /boire/i, 'explicit verb marker'],
];

const results = [];
for (const [question, pattern, label] of cases) {
  results.push(fr(question).then((result) => {
    ok(`routes "${question}" (${label})`, pattern.test(text(result.blocks)),
      `got: ${text(result.blocks).slice(0, 120)}`);
    ok(`"${question}" is grounded`, result.confident);
  }));
}

// --- a named verb plus a cue about forms beats a general topic -------------
results.push(fr('comment dit-on prendre au passé composé').then((result) => {
  const body = text(result.blocks);
  ok('a verb with a tense cue gets that verb', /prendre/i.test(body), body.slice(0, 120));
  ok('and it is the tense that was asked for', /passé composé/i.test(body), body.slice(0, 200));
}));

// --- a tense and a person together give one form ---------------------------
results.push(fr('conjugue être au futur, nous').then((result) => {
  ok('tense + person gives the single form', /serons/.test(text(result.blocks)), text(result.blocks).slice(0, 160));
}));

// --- form lookup -----------------------------------------------------------
results.push(fr("c'est quoi « vinrent »").then((result) => {
  const body = text(result.blocks);
  ok('identifies a passé simple form', /venir/i.test(body), body.slice(0, 160));
}));

// --- the answer follows the language of the question -----------------------
results.push(fr('le subjonctif').then((result) => {
  ok('a French question is answered in French', result.language === 'fr');
}));
results.push(fr('what is the subjunctive').then((result) => {
  ok('an English question is answered in English', result.language === 'en');
}));
results.push(fr('le subjonctif', { language: 'en', force: true }).then((result) => {
  ok('force pins the answer language', result.language === 'en');
}));

// --- out of scope ----------------------------------------------------------
results.push(fr('who won the world cup in 1998').then((result) => {
  ok('declines what it cannot ground', result.confident === false);
  ok('and says so rather than guessing', /outside what I cover|échappe/i.test(text(result.blocks)));
}));

// --- the two packs stay apart ---------------------------------------------
results.push(answer('ser y estar', { study: 'es' }).then((result) => {
  ok('the Spanish pack still answers Spanish questions', /ser/i.test(text(result.blocks)) && result.confident);
}));
results.push(fr('ser y estar').then((result) => {
  ok('and French mode does not answer them', result.confident === false,
    text(result.blocks).slice(0, 120));
}));

// --- "to eat in French": a vocabulary question with no verb asking for one --
for (const [question, pattern, why] of [
  ['to eat in french', /manger/i, 'the gloss index answers it'],
  ['to speak in french', /parler/i, 'another verb'],
  ['to eat', /manger/i, 'without the direction named'],
]) {
  results.push(answer(question, { study: 'fr' }).then((result) => {
    ok(`"${question}" is grounded — ${why}`, result.confident, text(result.blocks).slice(0, 90));
    ok(`"${question}" names the verb`, pattern.test(text(result.blocks)), text(result.blocks).slice(0, 90));
  }));
}

await Promise.all(results);

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} French tutor checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} French tutor checks passed`);
