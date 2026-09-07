/**
 * The translation chain: which engine answers, and in what order.
 *
 * Offline: fetch is stubbed, so these assert the fallback order and the
 * agreement rule rather than what a volunteer instance is doing today. The
 * model is stubbed out entirely by leaving no provider key configured, which
 * is also the shape a deployment without keys has.
 */
let checked = 0;
const failures = [];
function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

// Pinned before the module is imported, so these checks do not move every time
// a volunteer instance dies and the shipped default is trimmed. The names carry
// "lingva" so the stub below can tell which engine is being asked.
process.env.LINGVA_INSTANCES = 'lingva-one.test,lingva-two.test,lingva-three.test';

// No model, so the chain under test is the dedicated engines. DeepL is given a
// free-tier-shaped key so the host it picks can be asserted.
delete process.env.GEMINI_API_KEY;
delete process.env.OPENROUTER_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.GROQ_API_KEY;
process.env.DEEPL_API_KEY = 'test-key:fx';

const { translate, chunk, resetLingvaCooldowns, allEverydayWords } = await import('../server/translators.js');
const LINGVA_COUNT = process.env.LINGVA_INSTANCES.split(',').length;

let plan = {};
const asked = [];
globalThis.fetch = async (url) => {
  const target = String(url);
  asked.push(target);
  const which = target.includes('wikipedia') ? 'wikipedia'
    : target.includes('deepl') ? 'deepl'
      : target.includes('lingva') ? 'lingva'
        : target.includes('mymemory') ? 'mymemory'
          : 'apertium';
  let answer = plan[which];

  // The real API reports how each queried title was normalised. The single-
  // article stubs cannot know what was asked, so fill it in here from the URL.
  if (which === 'wikipedia' && answer?.query?.normalized?.[0]?.from === '*') {
    const asked = decodeURIComponent(new URL(target).searchParams.get('titles') || '').split('|');
    const to = answer.query.normalized[0].to;
    answer = { query: { ...answer.query, normalized: asked.map((from) => ({ from, to })) } };
  }
  // Lingva carries its text in the path, so a stub can answer per phrase —
  // which matters here, since a name is translated on its own to learn how the
  // engine renders it before being swapped for the real one.
  if (which === 'lingva' && answer && typeof answer === 'object' && !answer.translation) {
    const asked = decodeURIComponent(target.split('/').pop());
    answer = answer[asked] ? { translation: answer[asked] } : null;
  }
  // Apertium answers per pair when the plan is keyed by one, so a two-hop
  // pivot can be told apart from a direct translation.
  if (which === 'apertium' && answer && !answer.responseData) {
    const pair = decodeURIComponent(new URL(target).searchParams.get('langpair') || '');
    answer = answer[pair] ? { responseData: { translatedText: answer[pair] } } : null;
  }
  if (!answer) return { ok: false, status: 503, json: async () => ({}) };
  return { ok: true, json: async () => answer };
};

const article = (title, resolved) => ({
  query: {
    // The real API reports how it normalised each queried title; resolution
    // depends on that, so the stub has to report it too.
    normalized: [{ from: '*', to: resolved ?? title }],
    pages: { 1: { title: resolved ?? title, langlinks: [{ '*': title }] } },
  },
});
const noArticle = { query: { pages: { '-1': { missing: '' } } } };

/** A batched answer: which queried phrases are articles, and what they map to. */
const articles = (entries) => ({
  query: {
    normalized: entries.map(([asked, title]) => ({ from: asked, to: title })),
    pages: Object.fromEntries(entries.map(([, title, link], i) => [i, { title, langlinks: [{ '*': link }] }])),
  },
});

const memory = (...translations) => ({
  responseStatus: 200,
  responseData: { translatedText: translations[0] },
  matches: translations.map((translation) => ({ translation })),
});

/** The same, but the first candidate is MyMemory's own machine translation. */
const machineMemory = (...translations) => ({
  responseStatus: 200,
  responseData: { translatedText: translations[0] },
  matches: translations.map((translation, index) => (index === 0
    ? { translation, 'created-by': 'MT!' }
    : { translation })),
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

// --- prose is translated, not looked up as a title -------------------------
plan = { wikipedia: noArticle, lingva: { translation: 'The dog sleeps in the garden' } };
let prose = await translate('El perro duerme en el jardín.', 'es', 'en');
ok('a sentence is not treated as a title', prose.engine === 'Lingva', JSON.stringify(prose));
ok('and comes back as the translator wrote it',
  prose.text === 'The dog sleeps in the garden', prose.text);

// --- an article about something else is refused ---------------------------
// The query resolving to a *different* title means the phrase was not that name.
plan = { wikipedia: article('Money Heist', 'La casa de papel (serie de televisión)'), lingva: { translation: 'the paper house' } };
const loose = await translate('la casa de papel', 'es', 'en');
ok('a loose article match is refused', loose.engine === 'Lingva', JSON.stringify(loose));

// --- a single word is left to the translator ------------------------------
asked.length = 0;
plan = { wikipedia: article('Dog Animal'), lingva: { translation: 'dog' } };
const single = await translate('perro', 'es', 'en');
ok('a lone common word skips the encyclopedia', single.engine === 'Lingva', JSON.stringify(single));
ok('which is not consulted for it', !asked.some((u) => u.includes('wikipedia')));

// --- a phrase with no article falls through -------------------------------
plan = { wikipedia: noArticle, lingva: { translation: 'a green table' } };
const nothing = await translate('una mesa verde', 'es', 'en');
ok('a phrase with no article falls through to the translator',
  nothing.engine === 'Lingva' && nothing.text === 'a green table', JSON.stringify(nothing));

plan = {};

// --- a name in lower case is still a name ---------------------------------
// Students type "the cuban missile crisis" without capitals, and deserve the
// real name back. Detection cannot depend on capitalisation.
plan = {
  wikipedia: articles([['cuban missile crisis', 'Cuban Missile Crisis', 'Crisis de los misiles de Cuba']]),
  lingva: {
    'the cuban missile crisis was serious': 'la crisis de los misiles cubanos fue grave',
    'cuban missile crisis': 'crisis de los misiles cubanos',
  },
};
let lower = await translate('the cuban missile crisis was serious', 'en', 'es');
ok('a lower-case name is still corrected',
  lower.text === 'la crisis de los misiles de Cuba fue grave', lower.text);

// --- a common noun that happens to be an article is left alone ------------
// "history class" is an article too, redirecting to "Social studies".
// Wikipedia only capitalises proper nouns, so the title says which is which.
plan = {
  wikipedia: articles([['history class', 'Social studies', 'Ciencias sociales']]),
  lingva: { 'I have a history class': 'Tengo una clase de historia' },
};
const common = await translate('I have a history class', 'en', 'es');
ok('a common-noun article does not rename anything',
  common.text === 'Tengo una clase de historia', common.text);

// --- one request covers every candidate ----------------------------------
// A sentence yields dozens of candidate phrases; they go in one query.
asked.length = 0;
const longSentence = 'ayer por la tarde mi hermana compró un libro nuevo en la tienda pequeña';
plan = { wikipedia: noArticle, lingva: { [longSentence]: 'yesterday afternoon my sister bought a new book' } };
await translate(longSentence, 'es', 'en');
const wikiCalls = asked.filter((u) => u.includes('wikipedia')).length;
ok('every candidate is checked in one request, not one each', wikiCalls === 1, `${wikiCalls} requests`);

// --- a name buried in a sentence is put right ------------------------------
// The whole-input lookup cannot see it, and the translator renders it
// literally, so it has to be restored afterwards.
plan = {
  wikipedia: articles([['Cuban Missile Crisis', 'Cuban Missile Crisis', 'Crisis de los misiles de Cuba']]),
  lingva: {
    'The Cuban Missile Crisis was serious.': 'La crisis de los misiles cubanos fue grave.',
    'Cuban Missile Crisis': 'crisis de los misiles cubanos',
  },
};
let inSentence = await translate('The Cuban Missile Crisis was serious.', 'en', 'es');
ok('the established name replaces the literal one inside a sentence',
  inSentence.text === 'La crisis de los misiles de Cuba fue grave.', inSentence.text);
ok('and the sentence still comes from the translator', inSentence.engine === 'Lingva');

// --- the surrounding capitalisation is kept -------------------------------
plan = {
  wikipedia: articles([['Spanish Civil War', 'Spanish Civil War', 'Guerra Civil Española']]),
  lingva: {
    'We studied the Spanish Civil War at school.': 'Estudiamos la guerra civil de España en la escuela.',
    'Spanish Civil War': 'guerra civil de España',
  },
};
const midSentence = await translate('We studied the Spanish Civil War at school.', 'en', 'es');
ok('the name is corrected mid-sentence',
  midSentence.text === 'Estudiamos la guerra Civil Española en la escuela.', midSentence.text);
ok('and keeps the lower case of the position it sits in',
  !/ La guerra/.test(midSentence.text), midSentence.text);

// --- text with no names is returned untouched -----------------------------
plan = { wikipedia: noArticle, lingva: { 'El perro duerme en el jardín.': 'The dog sleeps in the garden.' } };
const plain = await translate('El perro duerme en el jardín.', 'es', 'en');
ok('a sentence with no name is untouched',
  plain.text === 'The dog sleeps in the garden.', plain.text);

// --- a name the encyclopedia does not know is left alone ------------------
plan = { wikipedia: noArticle, lingva: { 'Yesterday Maria And Pedro Went Home.': 'Ayer María y Pedro se fueron a casa.' } };
const unknown = await translate('Yesterday Maria And Pedro Went Home.', 'en', 'es');
ok('unknown capitalised words are left as the translator rendered them',
  unknown.text === 'Ayer María y Pedro se fueron a casa.', unknown.text);

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

// --- MyMemory's own machine translation is taken on its own ---------------
// It offers this only when the memory holds nothing close, so there is no
// crowd to take a vote among — and refusing it left French and Latin, which
// have no Apertium pair and no Lingva, with no translator at all.
plan = {
  lingva: null,
  mymemory: machineMemory('le chien de la fille', 'La rumeur', 'Of the girl'),
  apertium: null,
};
result = await translate('the dog of the girl', 'en', 'fr');
ok('the machine translation is believed', result.engine === 'MyMemory', JSON.stringify(result));
ok('and it is the one returned', result.text === 'le chien de la fille', result.text);

// --- but a disagreeing crowd is still refused -----------------------------
// The Najlaa case again, now proving the machine-translation route did not
// quietly open a door for it: no MT! candidate, so the vote still decides.
plan = {
  lingva: null,
  mymemory: memory('Good morning Najlaa how are you?', 'Yes, morning, how are you doing?', 'Good morning how are you?'),
  apertium: { responseData: { translatedText: 'Good morning, how you are?' } },
};
result = await translate('Buenos días, ¿cómo estás?', 'es', 'en');
ok('a stored crowd that disagrees is still skipped', result.engine === 'Apertium', JSON.stringify(result));
ok('and the stray name still never reaches the reader', !/Najlaa/.test(result.text), result.text);

// --- a doubtful memory is still better than nothing, once labelled --------
// French and Latin have no engine behind MyMemory, so a refused vote used to
// mean a 502. The guess comes back marked instead.
plan = {
  lingva: null,
  mymemory: memory('I would like a coffee', 'a coffee please', 'Coffee'),
  apertium: null,
};
result = await translate('Je voudrais un café', 'fr', 'en');
ok('a disagreeing memory is still answered as a last resort', result.engine === 'MyMemory', JSON.stringify(result));
ok('and it is marked uncertain', result.uncertain === true, JSON.stringify(result));

// --- but only once every engine has declined ------------------------------
plan = {
  lingva: null,
  mymemory: memory('Good morning Najlaa how are you?', 'Yes, morning, how are you doing?', 'Good morning how are you?'),
  apertium: { responseData: { translatedText: 'Good morning, how you are?' } },
};
result = await translate('Buenos días, ¿cómo estás?', 'es', 'en');
ok('an engine that can answer still wins', result.engine === 'Apertium', JSON.stringify(result));
ok('and a confident answer is never marked uncertain', !result.uncertain, JSON.stringify(result));

// --- English–French through Catalan, when nothing else answers ------------
// Apertium has no eng|fra pair. It used to decline rather than pivot, which
// was right while Lingva sat above it and wrong once French had nothing else.
plan = {
  lingva: null,
  mymemory: null,
  apertium: { 'eng|cat': 'el gos de la noia', 'cat|fra': 'le chien de la fille' },
};
result = await translate('the dog of the girl', 'en', 'fr');
ok('English–French pivots through Catalan', result.engine === 'Apertium', JSON.stringify(result));
ok('and comes out the far side', result.text === 'le chien de la fille', result.text);
ok('and says it is not to be trusted', result.uncertain === true, JSON.stringify(result));

// --- the reverse pivot ----------------------------------------------------
plan = {
  lingva: null,
  mymemory: null,
  apertium: { 'fra|cat': 'el gos de la noia', 'cat|eng': 'the dog of the girl' },
};
result = await translate('le chien de la fille', 'fr', 'en');
ok('French–English pivots too', result.text === 'the dog of the girl', JSON.stringify(result));

// --- a direct pair is never pivoted ---------------------------------------
plan = { lingva: null, mymemory: null, apertium: { 'eng|spa': 'el perro de la niña' } };
result = await translate('the dog of the girl', 'en', 'es');
ok('Spanish still goes straight there', result.text === 'el perro de la niña', JSON.stringify(result));
ok('and a direct answer is not marked uncertain', !result.uncertain, JSON.stringify(result));

// --- Latin has no Apertium pivot, because no pair reaches it --------------
// The chain no longer fails outright for Latin — the glossary of dictionary
// forms is always available, and is the point of it — so what is asserted here
// is that Apertium declined and something of ours answered instead.
plan = { lingva: null, mymemory: null, apertium: { 'eng|cat': 'la noia' } };
const beforePivot = asked.length;
result = await translate('the girl', 'en', 'la');
ok('Latin never reaches an Apertium pivot',
  !asked.slice(beforePivot).some((url) => url.includes('apertium')),
  asked.slice(beforePivot).join(' '));
ok('and the site answers it itself', result.engine === 'Whitaker\u2019s Words', JSON.stringify(result));

// --- a common phrase is not a name, whatever Wikipedia also calls it ------
// Wikipedia has an article called "I Am", and "I am tired" was coming back as
// "I Am fatigué" — the two commonest words in English restored as an album
// title. Asserted on the guard itself: the stub here answers every lookup,
// which real Wikipedia does not, so a chain test would prove nothing.
ok('"I am" is all everyday words', allEverydayWords('I am'));
ok('and so is "am I"', allEverydayWords('am I'));
ok('and "it is"', allEverydayWords('it is'));
ok('and "we have been"', allEverydayWords('we have been'));
ok('and the Spanish equivalent', allEverydayWords('yo soy'));
ok('and the French', allEverydayWords('je suis'));
ok('"I am tired" is not, because "tired" is not', !allEverydayWords('I am tired'));
ok('a real name is not', !allEverydayWords('Cuban Missile Crisis'));
ok('nor is one with a common word in it', !allEverydayWords('the Great Wall of China'));
ok('nothing is not', !allEverydayWords(''));

// A real name still comes back, which is the whole point of the mechanism.
plan = {
  wikipedia: article('Crisis de los misiles de Cuba', 'Cuban Missile Crisis'),
  deepl: { translations: [{ text: 'crisis de los misiles cubanos' }] },
};
result = await translate('Cuban Missile Crisis', 'en', 'es');
ok('a real name is still restored', /Crisis de los misiles de Cuba/.test(result.text), result.text);

// --- DeepL answers before anything else ----------------------------------
plan = {
  deepl: { translations: [{ text: 'le chien de la fille' }] },
  lingva: { translation: 'le chien de la jeune fille' },
  mymemory: memory('un chien'),
};
result = await translate('the dog of the girl', 'en', 'fr');
ok('DeepL is preferred', result.engine === 'DeepL', JSON.stringify(result));
ok('and its text is used', result.text === 'le chien de la fille', result.text);
ok('a free key goes to the free host',
  asked.some((url) => url.includes('api-free.deepl.com')),
  asked.filter((url) => url.includes('deepl')).join(' '));

// --- DeepL has no Latin, so Latin passes it by ----------------------------
plan = {
  deepl: { translations: [{ text: 'SHOULD NOT BE USED' }] },
  lingva: null,
  mymemory: memory('puella'),
};
// `asked` accumulates over the whole file, so only this call's requests count.
const beforeLatin = asked.length;
result = await translate('the girl', 'en', 'la');
ok('Latin is answered by the site\u2019s own Latin, not DeepL',
  result.engine === 'Whitaker\u2019s Words', JSON.stringify(result));
ok('and DeepL is never even asked for it',
  !asked.slice(beforeLatin).some((url) => url.includes('deepl')),
  asked.slice(beforeLatin).join(' '));

// --- a spent DeepL quota falls through rather than failing ----------------
plan = { deepl: null, lingva: null, mymemory: memory('le chien de la fille') };
result = await translate('the dog of the girl', 'en', 'fr');
ok('a refused DeepL hands over', result.engine === 'MyMemory', JSON.stringify(result));

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

// --- a dead Lingva instance is passed over rather than re-tried -----------
// The translator box fires on a debounce as you type, so re-asking a dead host
// every time cost a timeout per keystroke-pause before anything else was tried.
resetLingvaCooldowns();
plan = { wikipedia: null, lingva: null, mymemory: null, apertium: { responseData: { translatedText: 'piso' } } };

asked.length = 0;
await translate('floor', 'en', 'es');
const firstRun = asked.filter((url) => url.includes('lingva')).length;
ok('every instance is tried the first time', firstRun === LINGVA_COUNT, `${firstRun} of ${LINGVA_COUNT} asked`);

asked.length = 0;
await translate('ceiling', 'en', 'es');
const secondRun = asked.filter((url) => url.includes('lingva')).length;
ok('and none of them the next time, while they are resting', secondRun === 0, `${secondRun} asked`);

// A host that answers is put straight back into the rotation.
resetLingvaCooldowns();
plan = { ...plan, lingva: { translation: 'suelo' } };
asked.length = 0;
let revived = await translate('floor again', 'en', 'es');
ok('a working instance answers', revived.engine === 'Lingva', revived.engine);
asked.length = 0;
revived = await translate('another floor', 'en', 'es');
ok('and is asked again next time', asked.some((url) => url.includes('lingva')));
ok('and still answers', revived.engine === 'Lingva', revived.engine);

// With every instance resting, Lingva steps aside and the chain carries on
// rather than the translation failing.
resetLingvaCooldowns();
plan = { ...plan, lingva: null };
await translate('wall', 'en', 'es');
asked.length = 0;
revived = await translate('wall two', 'en', 'es');
ok('the chain still answers while they rest', revived.engine === 'Apertium', revived.engine);
ok('and nothing was spent asking them', !asked.some((url) => url.includes('lingva')));

// Resting is never permanent — it expires. Clearing it stands in for the wait.
resetLingvaCooldowns();
plan = { ...plan, lingva: { translation: 'pared' } };
revived = await translate('wall three', 'en', 'es');
ok('once the rest is over they answer again', revived.engine === 'Lingva', revived.engine);

resetLingvaCooldowns();

// --- an instance may carry its own scheme, for a self-hosted one ----------
const translators = (await import('node:fs')).readFileSync(new URL('../server/translators.js', import.meta.url), 'utf8');
ok('a host without a scheme is assumed https', /https:\/\/\$\{host\}/.test(translators));
ok('and one with a scheme is left alone', /\^https\?:/.test(translators));

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
