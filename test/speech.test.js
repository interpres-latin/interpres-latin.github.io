/**
 * Pronunciation: the guards around a small monthly budget.
 *
 * The free ElevenLabs tier is 10,000 characters a month for the whole site, so
 * what matters here is not that audio comes back — that is somebody else's
 * service — but that nothing is spent on input that was never a word, and that
 * a word already spoken is never paid for twice.
 */
process.env.ELEVENLABS_API_KEY = 'test-key';

const { speak, MAX_SPOKEN, hasSpeech } = await import('../server/speech.js');

let checked = 0;
const failures = [];

function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

let calls = 0;
globalThis.fetch = async () => {
  calls += 1;
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => new TextEncoder().encode('ID3-pretend-mp3').buffer,
  };
};

ok('a key means speech is on', hasSpeech() === true);

// --- a word is spoken, and spoken once ------------------------------------
calls = 0;
let result = await speak('chaleureux');
ok('a word comes back as audio', result.audio.length > 0);
ok('and was fetched', calls === 1, `calls=${calls}`);
ok('and is not a cache hit the first time', result.cached === false);

result = await speak('chaleureux');
ok('the same word is served from cache', result.cached === true);
ok('and costs no second request', calls === 1, `calls=${calls}`);

result = await speak('CHALEUREUX');
ok('case does not defeat the cache', result.cached === true, `calls=${calls}`);

result = await speak('corazón');
ok('a different word is fetched', calls === 2, `calls=${calls}`);

// --- what is refused before a character is spent --------------------------
async function refuses(word) {
  const before = calls;
  try {
    await speak(word);
    return false;
  } catch {
    return calls === before;
  }
}

ok('nothing is not a word', await refuses(''));
ok('whitespace is not a word', await refuses('   '));
ok('a sentence is not a word', await refuses('the quick brown fox jumps over it'));
ok('over the length cap is refused', await refuses('a'.repeat(MAX_SPOKEN + 1)));
ok('null is refused', await refuses(null));

// A two-word Latin headword is still a headword.
calls = 0;
result = await speak('res publica');
ok('res publica is spoken', result.audio.length > 0 && calls === 1, `calls=${calls}`);

// --- with no key at all, it declines rather than throwing oddly -----------
delete process.env.ELEVENLABS_API_KEY;
ok('no key means speech is off', hasSpeech() === false);
let declined = null;
try { await speak('bonjour'); } catch (error) { declined = error; }
ok('and speaking is refused', declined !== null);
ok('with a status the route can use', declined?.status === 503, String(declined?.status));

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} pronunciation checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} pronunciation checks passed`);
