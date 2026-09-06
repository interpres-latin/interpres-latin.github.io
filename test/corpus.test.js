/**
 * Example sentences and glosses come from corpora, not a model.
 *
 * Offline: fetch is stubbed, so these assert how candidates are chosen rather
 * than what Tatoeba happens to hold today.
 */
const { tatoebaExamples, wiktionaryGloss } = await import('../server/corpus.js');

let checked = 0;
const failures = [];
function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

const sentence = (es, en) => ({ text: es, translations: [[{ lang: 'eng', text: en }]] });

let payload;
globalThis.fetch = async (url) => {
  if (String(url).includes('tatoeba')) return { ok: true, json: async () => payload };
  return { ok: true, json: async () => payload };
};

// --- prefers sentences that actually contain the word ---------------------
payload = {
  results: [
    sentence('Es un madrugador convencido.', 'He is a committed early riser.'),
    sentence('Mañana tenemos que madrugar.', 'We have to get up early tomorrow.'),
  ],
};
let found = await tatoebaExamples('madrugar', 2);
ok('a sentence containing the word outranks a relative',
  found[0].text === 'Mañana tenemos que madrugar.', found.map((f) => f.text).join(' | '));

// --- accent-insensitive matching -----------------------------------------
payload = { results: [sentence('Un rincón entrañable.', 'A lovely corner.'), sentence('Nada aquí.', 'Nothing here.')] };
found = await tatoebaExamples('entrañable', 1);
ok('matching ignores accents', found[0].text === 'Un rincón entrañable.', found[0]?.text);

// --- skips sentences with no English --------------------------------------
payload = {
  results: [
    { text: 'Sin traducción alguna.', translations: [[{ lang: 'fra', text: 'Pas de traduction.' }]] },
    sentence('El perro duerme.', 'The dog sleeps.'),
  ],
};
found = await tatoebaExamples('perro', 5);
ok('an untranslated sentence is dropped', found.length === 1 && found[0].en === 'The dog sleeps.',
  JSON.stringify(found));

// --- shorter is better, all else equal ------------------------------------
payload = {
  results: [
    sentence('El perro que vive en la casa de mi abuela ladra todas las noches.', 'Long one.'),
    sentence('El perro ladra.', 'The dog barks.'),
  ],
};
found = await tatoebaExamples('ladrar-test-perro', 2);
ok('the shorter sentence comes first', found[0].text === 'El perro ladra.', found[0]?.text);

// --- respects the limit ---------------------------------------------------
ok('never returns more than asked', (await tatoebaExamples('limit-test', 1)).length === 1);

// --- an upstream failure is not fatal -------------------------------------
globalThis.fetch = async () => { throw new Error('offline'); };
ok('a failed lookup yields nothing rather than throwing',
  (await tatoebaExamples('unreachable-word')) === null);

// --- Wiktionary glosses ---------------------------------------------------
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({
    es: [{ partOfSpeech: 'Verb', definitions: [{ definition: 'to <a href="/x">get up</a> early' }, { definition: '' }] }],
    fr: [{ partOfSpeech: 'Verb', definitions: [{ definition: 'French, not wanted' }] }],
  }),
});
const gloss = await wiktionaryGloss('madrugar');
ok('a gloss comes back', Array.isArray(gloss) && gloss.length === 1, JSON.stringify(gloss));
ok('markup is stripped', gloss[0] === 'to get up early', gloss[0]);
ok('empty definitions are skipped', !gloss.includes(''));
ok('other languages are ignored', !gloss.some((g) => /French/.test(g)));

// --- the language is a parameter, not a constant --------------------------
const frenchGloss = await wiktionaryGloss('manger-fr-test', 3, 'fr');
ok('French mode reads the French section', frenchGloss?.[0] === 'French, not wanted',
  JSON.stringify(frenchGloss));

let requested = null;
globalThis.fetch = async (url) => {
  requested = String(url);
  return { ok: true, json: async () => ({ results: [] }) };
};
await tatoebaExamples('manger', 2, 'fr');
ok('and Tatoeba is asked for French sentences', /from=fra/.test(requested), requested);
await tatoebaExamples('madrugar-2', 2);
ok('while Spanish stays the default', /from=spa/.test(requested), requested);

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} corpus checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} corpus checks passed`);
