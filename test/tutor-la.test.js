/**
 * Intent routing on the Latin side.
 *
 * The router is shared with Spanish and French; these prove the Latin pack
 * drives it, and that the two things only Latin does — declining a noun and
 * looking up a course stage — are answered before the general routing gets a
 * look at them. Offline: anything needing Whitaker's is left to the live checks.
 */
import { answer, getFormIndex } from '../public/js/lib/tutor.js';
import { STAGES, findStage } from '../public/js/data/stages-la.js';

let checked = 0;
const failures = [];
function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}
const text = (blocks) => blocks.map((b) => (b.type === 'md' ? b.text : JSON.stringify(b))).join('\n');
const la = (question, options = {}) => answer(question, { study: 'la', ...options });

// --- the form index --------------------------------------------------------
const index = getFormIndex('la');
ok('index is populated', index.size > 2000, `${index.size} forms`);
ok('index has amavit', index.get('amavit')?.some((e) => e.verb === 'amo'));
ok('index has rexerunt', index.get('rexerunt')?.some((e) => e.verb === 'rego'));
ok('index has ceperat', index.get('ceperat')?.some((e) => e.verb === 'capio'));
ok('index has essent', index.get('essent')?.some((e) => e.verb === 'sum'));

// --- stage data ------------------------------------------------------------
ok('stage lookup by number', findStage('5')?.title === 'in theatro');
ok('stage lookup with the word', findStage('stage 12')?.title === 'Vesuvius');
ok('stage lookup in roman numerals', findStage('XII')?.title === 'Vesuvius');
ok('an unknown stage is null', findStage('99') === null);
ok('every stage has words', Object.values(STAGES).every((s) => s.words.length > 10));
ok('every entry is a pair', Object.values(STAGES).every((s) => s.words.every((w) => w.length === 2 && w[0] && w[1])));

const results = [];
const routes = (question, pattern, label) => {
  results.push(la(question).then((result) => {
    ok(`routes "${question}" (${label})`, pattern.test(text(result.blocks)),
      `got: ${text(result.blocks).slice(0, 140).replace(/\n/g, ' ')}`);
  }));
};

// --- the two intents only Latin has ---------------------------------------
// Declining is tried before defining, or "decline puella" is answered with a
// dictionary entry instead of a table.
routes('decline puella, puellae', /first declension/i, 'declining a noun');
routes('decline bonus, bona, bonum', /1st\/2nd declension adjective/i, 'declining an adjective');
routes('decline fortis, forte', /3rd declension adjective/i, 'a two-termination adjective');
routes('stage 5', /in theatro/i, 'a stage');
routes('stage XII', /Vesuvius/i, 'a stage in roman numerals');
routes('vocabulary for stage 1', /Caecilius/i, 'a stage, asked the long way');
routes('stage 99', /only have stages/i, 'a stage that does not exist');

// --- conjugation, which needs the parts looked up -------------------------
routes('conjugate rego', /rego, regere, rexi, rectus/i, 'a verb by its lemma');
routes('conjugate capio', /capio, capere, cepi, captus/i, 'a third -io verb');
routes('conjugate sum', /sum, esse, fui/i, 'an irregular verb');
routes('conjugate sequor', /deponent/i, 'a deponent');

// --- grammar, which is the bulk of what a Latin reader asks for -----------
routes('the ablative absolute', /ablative absolute/i, 'ablative absolute');
routes('the cases', /nominative/i, 'the cases');
routes('what is the genitive', /genitive/i, 'one case');
routes('indirect statement', /accusative/i, 'indirect statement');
routes('purpose and result', /ut\b|purpose/i, 'purpose and result');
routes('principal parts', /principal parts/i, 'principal parts');
routes('deponent verbs', /passive in form/i, 'deponents');
routes('qui quae quod', /relative/i, 'relative pronouns');
routes('gerund and gerundive', /gerundive/i, 'gerund and gerundive');
routes('help', /decline/i, 'capabilities');

// --- the answer is always English -----------------------------------------
results.push(la('the cases').then((result) => {
  ok('a Latin question is answered in English', result.language === 'en', result.language);
}));
results.push(la('the cases', { language: 'la', force: true }).then((result) => {
  ok('and force cannot make it answer in Latin', result.language === 'en', result.language);
}));

// --- out of scope ----------------------------------------------------------
results.push(la('who won the world cup in 1998').then((result) => {
  ok('declines what it cannot ground', result.confident === false);
  ok('and says so', /outside what I cover/i.test(text(result.blocks)));
}));

// --- the packs stay apart --------------------------------------------------
results.push(answer('ser y estar', { study: 'es' }).then((result) => {
  ok('Spanish still answers its own questions', result.confident);
}));
results.push(la('ser y estar').then((result) => {
  ok('and Latin mode does not', result.confident === false, text(result.blocks).slice(0, 100));
}));

// --- "to see in Latin": a vocabulary question with no verb asking for one --
for (const [question, pattern, why] of [
  ['to see in latin', /video/i, 'the gloss index answers it'],
  ['to want', /volo/i, 'without the direction named'],
  ['to rule in latin', /rego/i, 'another verb'],
]) {
  results.push(answer(question, { study: 'la' }).then((result) => {
    ok(`"${question}" is grounded — ${why}`, result.confident, text(result.blocks).slice(0, 90));
    ok(`"${question}" names the verb`, pattern.test(text(result.blocks)), text(result.blocks).slice(0, 90));
  }));
}

await Promise.all(results);

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} Latin tutor checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} Latin tutor checks passed`);
