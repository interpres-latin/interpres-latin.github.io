/**
 * The guards that keep OpenRouter from ever costing money.
 *
 * These run offline: `fetch` is stubbed so the assertions are about what the
 * code refuses to send, not about what a server happens to answer today.
 */
process.env.OPENROUTER_API_KEY = 'sk-or-test';

let checked = 0;
const failures = [];

function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

const realFetch = globalThis.fetch;
const sent = [];

/** Catalogue with one free model and one paid one wearing a ":free" name. */
const CATALOGUE = {
  data: [
    { id: 'free/model:free', pricing: { prompt: '0', completion: '0', request: '0', image: '0' } },
    { id: 'liar/model:free', pricing: { prompt: '0.0000005', completion: '0', request: '0', image: '0' } },
    { id: 'paid/model', pricing: { prompt: '0.000003', completion: '0.000015' } },
  ],
};

globalThis.fetch = async (url, init) => {
  const target = String(url);
  if (target.endsWith('/models')) {
    return { ok: true, json: async () => CATALOGUE };
  }
  sent.push({ url: target, body: JSON.parse(init.body) });
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
  };
};

const openrouter = await import('../server/providers/openrouter.js');

async function attempt(models) {
  process.env.OPENROUTER_MODEL = models;
  sent.length = 0;
  try {
    const text = await openrouter.ask({ messages: [{ role: 'user', content: 'x' }] });
    return { ok: true, text };
  } catch (error) {
    return { ok: false, error };
  }
}

// --- a genuinely free model goes through -----------------------------------
let result = await attempt('free/model:free');
ok('a zero-priced model is allowed', result.ok, result.error?.message);
ok('the request names that model', sent[0]?.body.model === 'free/model:free');

// --- every request carries a zero price ceiling ----------------------------
const price = sent[0]?.body.provider?.max_price;
ok('the request carries provider.max_price', Boolean(price), JSON.stringify(sent[0]?.body.provider));
ok('prompt price ceiling is zero', price?.prompt === 0);
ok('completion price ceiling is zero', price?.completion === 0);
ok('per-request price ceiling is zero', price?.request === 0);
ok('per-image price ceiling is zero', price?.image === 0);

// --- a model without the :free suffix is refused before any request --------
result = await attempt('anthropic/claude-opus-4');
ok('a non-":free" model is refused', !result.ok);
ok('refusal explains why', /must end in ":free"/.test(result.error?.message || ''), result.error?.message);
ok('nothing was sent for it', sent.length === 0, `${sent.length} requests`);

// --- a ":free" name that actually charges is still refused -----------------
result = await attempt('liar/model:free');
ok('a ":free" name with a real price is refused', !result.ok);
ok('refusal names the chargeable field', /charges for prompt/.test(result.error?.message || ''), result.error?.message);
ok('nothing was sent for it either', sent.length === 0, `${sent.length} requests`);

// --- a model OpenRouter does not list is refused ---------------------------
result = await attempt('nobody/invented:free');
ok('an unlisted model is refused', !result.ok);
ok('refusal says it is unlisted', /does not list/.test(result.error?.message || ''));

// --- rotation moves to the next free model on failure ----------------------
let attemptCount = 0;
globalThis.fetch = async (url, init) => {
  const target = String(url);
  if (target.endsWith('/models')) return { ok: true, json: async () => CATALOGUE };
  attemptCount += 1;
  sent.push({ url: target, body: JSON.parse(init.body) });
  if (attemptCount === 1) {
    return { ok: false, json: async () => ({ error: { message: 'Provider returned error', code: 502 } }) };
  }
  return { ok: true, json: async () => ({ choices: [{ message: { content: 'second' } }] }) };
};

process.env.OPENROUTER_MODEL = 'free/model:free, free/model:free';
sent.length = 0;
const rotated = await openrouter.ask({ messages: [{ role: 'user', content: 'x' }] });
ok('an overloaded model rotates to the next', rotated === 'second', rotated);
ok('both attempts still carried the price ceiling',
  sent.every((request) => request.body.provider?.max_price?.prompt === 0), `${sent.length} requests`);

// --- an unverifiable model closes the gate rather than opening it ---------
// The catalogue is cached after the first lookup, so an unknown model is
// refused as unlisted; with a cold cache and a failing lookup it is refused for
// not being verifiable. Either way nothing reaches the wire, which is the
// property that matters.
let reachedWire = false;
globalThis.fetch = async (url) => {
  if (String(url).endsWith('/models')) return { ok: false, json: async () => ({}) };
  reachedWire = true;
  return { ok: true, json: async () => ({ choices: [{ message: { content: 'leaked' } }] }) };
};
const blind = await attempt('brand/new:free');
ok('an unverifiable model is refused, not assumed free', !blind.ok, blind.text);
ok('it never reaches the wire', reachedWire === false);
ok('and the refusal is a NOT_FREE refusal', blind.error?.code === 'NOT_FREE', String(blind.error?.code));

globalThis.fetch = realFetch;

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} OpenRouter guard checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} OpenRouter guard checks passed`);
