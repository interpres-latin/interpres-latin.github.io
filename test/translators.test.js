/**
 * The translation chain: which engine answers, and in what order.
 *
 * Offline: fetch is stubbed, so these assert the order and the guards rather
 * than what a service is doing today.
 *
 * The chain is short now. Lingva, MyMemory, Apertium and DeepL went with the
 * Spanish and French sides they were built for — none of them can do Latin, and
 * MyMemory answered a request for it in Malagasy. What is left is Wikipedia for
 * names, then the site's own grammar, then the glossaries; the grammar itself
 * is covered by latin-translate.test.js.
 */
let checked = 0;
const failures = [];
function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

// No model and no keys, which is also the shape a deployment without keys has.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.GROQ_API_KEY;

const { translate, chunk, allEverydayWords } = await import('../server/translators.js');

let plan = {};
const asked = [];
globalThis.fetch = async (url) => {
  const target = String(url);
  asked.push(target);
  const which = target.includes('wikipedia') ? 'wikipedia' : 'other';
  let answer = plan[which];

  // The real API reports how each queried title was normalised. The single-
  // article stubs cannot know what was asked, so fill it in here from the URL.
  if (which === 'wikipedia' && answer?.query?.normalized?.[0]?.from === '*') {
    const titles = decodeURIComponent(new URL(target).searchParams.get('titles') || '').split('|');
    const to = answer.query.normalized[0].to;
    answer = { query: { ...answer.query, normalized: titles.map((from) => ({ from, to })) } };
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

// --- names and titles go to Wikipedia, not to a translator ----------------
//
// Machine translation renders a name literally. Wikipedia's cross-language
// links hold what Latin actually calls the thing, which is a fact rather than
// a guess — the one lookup in the chain that is not this site's own code.
plan = { wikipedia: article('Bellum Punicum Secundum', 'Second Punic War') };
asked.length = 0;
const named = await translate('Second Punic War', 'en', 'la');
ok('an established name comes from Wikipedia', named.engine === 'Wikipedia', JSON.stringify(named));
ok('and is the name the language actually uses',
  named.text === 'Bellum Punicum Secundum', named.text);

asked.length = 0;
const lower = await translate('second punic war', 'en', 'la');
ok('capitalisation does not matter', lower.engine === 'Wikipedia', JSON.stringify(lower));

// --- a phrase with no article falls through -------------------------------
//
// Falling through means reaching the rules translator, which needs Whitaker's
// over the network and does not have it here. What matters is that Wikipedia
// declined rather than answering with something loosely related.
plan = { wikipedia: noArticle };
asked.length = 0;
const nothing = await translate('Marcus Nemo Nusquam', 'en', 'la').catch((error) => error);
ok('a phrase with no article is not answered by the encyclopedia',
  nothing instanceof Error || nothing.engine !== 'Wikipedia', JSON.stringify(nothing));
ok('though it was asked', asked.some((u) => u.includes('wikipedia')));

// --- prose is never looked up as a title ----------------------------------
plan = { wikipedia: article('should not be reached') };
asked.length = 0;
const prose = await translate('The dog sleeps in the garden.', 'en', 'la').catch((error) => error);
ok('a sentence is not treated as a title',
  prose instanceof Error || prose.engine !== 'Wikipedia', JSON.stringify(prose));
ok('and the encyclopedia is not consulted for one',
  !asked.some((u) => u.includes('wikipedia')), asked.join(' '));

// --- a common phrase is not a name ----------------------------------------
//
// Wikipedia has an article called "I Am". Without this guard a whole input of
// ordinary words could be answered with a title instead of a translation.
ok('"I am" is all everyday words', allEverydayWords('I am'));
ok('and so is "am I"', allEverydayWords('am I'));
ok('and "it is"', allEverydayWords('it is'));
ok('and "we have been"', allEverydayWords('we have been'));
ok('"I am tired" is not, because "tired" is not', !allEverydayWords('I am tired'));
ok('a real name is not', !allEverydayWords('Second Punic War'));
ok('nor is one with a common word in it', !allEverydayWords('the Great Wall of China'));
ok('nothing is not', !allEverydayWords(''));

plan = { wikipedia: article('Ego Sum') };
asked.length = 0;
const everyday = await translate('I am', 'en', 'la').catch((error) => error);
ok('so a common phrase is not answered with an article',
  everyday instanceof Error || everyday.engine !== 'Wikipedia', JSON.stringify(everyday));

// --- the chunker ----------------------------------------------------------
//
// Splits on sentence boundaries so each piece still reads as a sentence, which
// is what any engine downstream needs to make sense of it.
const long = `${'Puella epistulam scribit. '.repeat(30)}Servus in horto laborat.`;
const pieces = chunk(long, 450);
ok('a long text is split', pieces.length > 1, String(pieces.length));
ok('and no piece is over the limit', pieces.every((piece) => piece.length <= 450),
  String(Math.max(...pieces.map((p) => p.length))));
ok('and nothing is lost', pieces.join(' ').replace(/\s+/g, ' ') === long.replace(/\s+/g, ' ').trim());
ok('a short text is one piece', chunk('Puella ambulat.', 450).length === 1);
ok('and empty text is no pieces', chunk('   ', 450).length === 0);

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} translator checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} translator checks passed`);
