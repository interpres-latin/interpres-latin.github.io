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
    sentence('Canicula in horto dormit.', 'The puppy sleeps in the garden.'),
    sentence('Canis in via currit.', 'The dog runs in the street.'),
  ],
};
let found = await tatoebaExamples('canis', 2);
ok('a sentence containing the word outranks a relative',
  found[0].text === 'Canis in via currit.', found.map((f) => f.text).join(' | '));

// --- macron-insensitive matching ------------------------------------------
// A text prints *puella* and a dictionary prints *puĕlla*; they are the same
// word, and a reader who typed one must be shown the other.
payload = { results: [sentence('Puĕlla epistulam scribit.', 'The girl writes a letter.'), sentence('Nihil hic.', 'Nothing here.')] };
found = await tatoebaExamples('puella', 1);
ok('matching ignores macrons', found[0].text === 'Puĕlla epistulam scribit.', found[0]?.text);

// --- skips sentences with no English --------------------------------------
payload = {
  results: [
    { text: 'Nulla translatio.', translations: [[{ lang: 'fra', text: 'Pas de traduction.' }]] },
    sentence('Servus laborat.', 'The slave works.'),
  ],
};
found = await tatoebaExamples('servus', 5);
ok('an untranslated sentence is dropped', found.length === 1 && found[0].en === 'The slave works.',
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
//
// The page holds a section per language and only the Latin one is wanted: an
// English entry under the same spelling is a different word that happens to
// look the same, which is exactly what a dictionary must not conflate.
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({
    la: [{ partOfSpeech: 'Verb', definitions: [{ definition: 'to <a href="/x">rise</a> early' }, { definition: '' }] }],
    en: [{ partOfSpeech: 'Noun', definitions: [{ definition: 'English, not wanted' }] }],
  }),
});
const gloss = await wiktionaryGloss('surgo');
ok('a gloss comes back', Array.isArray(gloss) && gloss.length === 1, JSON.stringify(gloss));
ok('markup is stripped', gloss[0] === 'to rise early', gloss[0]);
ok('empty definitions are skipped', !gloss.includes(''));
ok('other languages are ignored', !gloss.some((g) => /English/.test(g)));

let requested = null;
globalThis.fetch = async (url) => {
  requested = String(url);
  return { ok: true, json: async () => ({ results: [] }) };
};
await tatoebaExamples('surgo-2', 2);
ok('Tatoeba is asked for Latin sentences', /from=lat/.test(requested), requested);



if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} corpus checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} corpus checks passed`);
