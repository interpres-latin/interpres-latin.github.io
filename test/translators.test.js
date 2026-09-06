/**
 * Translation runs on dedicated engines, never a language model.
 *
 * Offline: fetch is stubbed, so these assert the fallback order and the
 * agreement rule rather than what a volunteer instance is doing today.
 */
let checked = 0;
const failures = [];
function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

const { translate, chunk } = await import('../server/translators.js');

let plan = {};
const asked = [];
globalThis.fetch = async (url) => {
  const target = String(url);
  asked.push(target);
  const which = target.includes('lingva') ? 'lingva'
    : target.includes('mymemory') ? 'mymemory'
      : 'apertium';
  const answer = plan[which];
  if (!answer) return { ok: false, status: 503, json: async () => ({}) };
  return { ok: true, json: async () => answer };
};

const memory = (...translations) => ({
  responseStatus: 200,
  responseData: { translatedText: translations[0] },
  matches: translations.map((translation) => ({ translation })),
});

// --- Lingva first ----------------------------------------------------------
plan = {
  lingva: { translation: 'Good morning' },
  mymemory: memory('Wrong one', 'Wrong one'),
  apertium: { responseData: { translatedText: 'Good mornings' } },
};
asked.length = 0;
let result = await translate('Buenos días', 'es', 'en');
ok('Lingva is preferred', result.engine === 'Lingva' && result.text === 'Good morning', JSON.stringify(result));
ok('and nothing else is called', !asked.some((u) => u.includes('mymemory')), asked.join(' '));

// --- MyMemory when Lingva is down, and its candidates agree ---------------
plan = { lingva: null, mymemory: memory('Good morning', 'Good morning'), apertium: { responseData: { translatedText: 'Good mornings' } } };
result = await translate('Buenos días', 'es', 'en');
ok('falls back to MyMemory when Lingva is down', result.engine === 'MyMemory', JSON.stringify(result));
ok('and returns the agreed translation', result.text === 'Good morning', result.text);

// --- MyMemory is skipped when its candidates disagree ---------------------
// This is the "Good morning Najlaa how are you?" case: three stored
// translations of one sentence, the wrong one scoring highest.
plan = {
  lingva: null,
  mymemory: memory('Good morning Najlaa how are you?', 'Yes, morning, how are you doing?', 'Good morning how are you?'),
  apertium: { responseData: { translatedText: 'Good morning, how you are?' } },
};
result = await translate('Buenos días, ¿cómo estás?', 'es', 'en');
ok('a memory that disagrees with itself is skipped', result.engine === 'Apertium', JSON.stringify(result));
ok('and the stray name never reaches the reader', !/Najlaa/.test(result.text), result.text);

// --- agreement ignores case and punctuation -------------------------------
plan = { lingva: null, mymemory: memory('Good morning.', 'good morning'), apertium: null };
result = await translate('Buenos días', 'es', 'en');
ok('agreement is not defeated by punctuation', result.engine === 'MyMemory', JSON.stringify(result));

// --- a single candidate is taken at face value ----------------------------
plan = { lingva: null, mymemory: memory('The only answer'), apertium: null };
result = await translate('algo', 'es', 'en');
ok('a lone candidate has nothing to disagree with', result.engine === 'MyMemory', JSON.stringify(result));

// --- Apertium's untranslated markers are stripped -------------------------
plan = { lingva: null, mymemory: null, apertium: { responseData: { translatedText: 'Dónde es la #canal de tren' } } };
result = await translate('where is the train station', 'en', 'es');
ok('Apertium is the floor', result.engine === 'Apertium');
ok('its failure markers are stripped', !result.text.includes('#'), result.text);

// --- everything down ------------------------------------------------------
plan = { lingva: null, mymemory: null, apertium: null };
let threw = false;
try { await translate('hola', 'es', 'en'); } catch { threw = true; }
ok('every engine failing is an error, not a wrong answer', threw);

// --- no model is ever consulted -------------------------------------------
const source = (await import('node:fs')).readFileSync(new URL('../server/routes/translate.js', import.meta.url), 'utf8');
ok('the route imports no model', !/llm\.js|providerInfo|hasProvider/.test(source));

// --- long text is split on sentence boundaries ----------------------------
const long = `${'Una frase corta. '.repeat(60)}`;
const pieces = chunk(long, 450);
ok('long text is split', pieces.length > 1, `${pieces.length} pieces`);
ok('and every piece is within the limit', pieces.every((p) => p.length <= 450));

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} translator checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} translator checks passed`);
