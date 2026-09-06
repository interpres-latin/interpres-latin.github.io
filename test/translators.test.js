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
  const which = target.includes('wikipedia') ? 'wikipedia'
    : target.includes('lingva') ? 'lingva'
      : target.includes('mymemory') ? 'mymemory'
        : 'apertium';
  const answer = plan[which];
  if (!answer) return { ok: false, status: 503, json: async () => ({}) };
  return { ok: true, json: async () => answer };
};

const article = (title, resolved) => ({ query: { pages: { 1: { title: resolved ?? title, langlinks: [{ '*': title }] } } } });
const noArticle = { query: { pages: { '-1': { missing: '' } } } };

const memory = (...translations) => ({
  responseStatus: 200,
  responseData: { translatedText: translations[0] },
  matches: translations.map((translation) => ({ translation })),
});

// --- names and titles go to Wikipedia, not to a translator ----------------
// "Cuban Missile Crisis" translated literally becomes "crisis de los misiles
// cubanos", which says the missiles were Cuban. They were Soviet.
plan = {
  wikipedia: article('Crisis de los misiles de Cuba', 'Cuban Missile Crisis'),
  lingva: { translation: 'crisis de los misiles cubanos' },
};
let named = await translate('Cuban Missile Crisis', 'en', 'es');
ok('an established name comes from Wikipedia', named.engine === 'Wikipedia', JSON.stringify(named));
ok('and is the name people actually use', named.text === 'Crisis de los misiles de Cuba', named.text);

named = await translate('cuban missile crisis', 'en', 'es');
ok('capitalisation does not matter', named.engine === 'Wikipedia', JSON.stringify(named));

// --- prose is never sent to the encyclopedia ------------------------------
plan = { wikipedia: article('Should not be used'), lingva: { translation: 'The dog sleeps in the garden' } };
asked.length = 0;
let prose = await translate('El perro duerme en el jardín.', 'es', 'en');
ok('a sentence is not treated as a title', prose.engine === 'Lingva', JSON.stringify(prose));
ok('and Wikipedia is not even asked', !asked.some((u) => u.includes('wikipedia')), asked.join(' '));

// --- an article about something else is refused ---------------------------
// The query resolving to a *different* title means the phrase was not that name.
plan = { wikipedia: article('Money Heist', 'La casa de papel (serie de televisión)'), lingva: { translation: 'the paper house' } };
const loose = await translate('la casa de papel', 'es', 'en');
ok('a loose article match is refused', loose.engine === 'Lingva', JSON.stringify(loose));

// --- a single word is left to the translator ------------------------------
asked.length = 0;
plan = { wikipedia: article('Dog'), lingva: { translation: 'dog' } };
const single = await translate('perro', 'es', 'en');
ok('a lone common word skips the encyclopedia', single.engine === 'Lingva', JSON.stringify(single));
ok('which is not consulted for it', !asked.some((u) => u.includes('wikipedia')));

// --- a phrase with no article falls through -------------------------------
plan = { wikipedia: noArticle, lingva: { translation: 'a green table' } };
const nothing = await translate('una mesa verde', 'es', 'en');
ok('a phrase with no article falls through to the translator',
  nothing.engine === 'Lingva' && nothing.text === 'a green table', JSON.stringify(nothing));

plan = {};

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
