/**
 * The Apps Script build, run without Apps Script.
 *
 * The generated server.js and Code.js are loaded into a bare V8 context — no
 * fetch, no URL, no Buffer, no timers, which is what Apps Script gives them —
 * with stand-ins for the services they call (appscript/emulator.mjs).
 * Requests go through api() exactly as google.script.run would send them.
 *
 * Offline: every outside host is answered here. The one real reply used is a
 * saved Whitaker's Words analysis of *canem* (test/fixtures).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../appscript/build.mjs';
import { project as emulate, reply } from '../appscript/emulator.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { dist } = build({ quiet: true });
const CANEM = fs.readFileSync(path.join(HERE, 'fixtures/alpheios-canem.json'), 'utf8');

/** The project with UrlFetchApp answered by `respond`, which returns plain parts or an Error to throw. */
function project({ properties = {}, respond = () => ({ status: 404 }) } = {}) {
  return emulate({
    dist,
    properties,
    urlFetch(url, params) {
      const answer = respond(url, params);
      if (answer instanceof Error) throw answer;
      return reply(answer);
    },
  });
}

/** Whitaker's knows canem; every other host has nothing. */
const dictionaryHosts = (url) => (url.includes('morph.alpheios.net') && url.includes('word=canem')
  ? { status: 201, body: CANEM, headers: { 'Content-Type': 'application/json' } }
  : { status: 404, body: '{}' });

const json = (response) => JSON.parse(response.body);
const call = (app, request) => app.execution().api(request);

let passed = 0;
async function test(name, run) {
  try {
    await run();
    passed += 1;
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

// --- the entry points ------------------------------------------------------

await test('only the entry points are callable', () => {
  const context = project().execution();
  const callable = Object.keys(context).filter((key) => typeof context[key] === 'function' && !key.endsWith('_'));
  assert.deepEqual(callable.sort(), ['api', 'apiResult', 'doGet']);
});

await test('doGet turns the path and query into the first route', () => {
  const output = project().execution().doGet({ pathInfo: 'conjugacion', parameter: { v: 'amo', page: 'x' } });
  const boot = JSON.parse(/window.__INTERPRES__ = (\{.*?\});<\/script>/.exec(output.html)[1]);
  assert.deepEqual(boot, { path: '/conjugacion', search: '?v=amo', url: 'https://script.google.com/macros/s/EMULATED/exec' });
});

await test('?page= works as well as a path', () => {
  const output = project().execution().doGet({ parameter: { page: 'diccionario', q: 'canem' } });
  const boot = JSON.parse(/window.__INTERPRES__ = (\{.*?\});<\/script>/.exec(output.html)[1]);
  assert.equal(boot.path, '/diccionario');
  assert.equal(boot.search, '?q=canem');
});

await test('doGet cannot be made to close its own script tag', () => {
  const output = project().execution().doGet({ parameter: { q: '</script><script>alert(1)</script>' } });
  assert.ok(!output.html.includes('</script><script>alert(1)'));
});

await test('the boot placeholder is a string, which HtmlService does not strip', () => {
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  assert.ok(html.includes('window.__INTERPRES__ = "__INTERPRES_BOOT__";'));
});

// --- the page --------------------------------------------------------------

await test('the page carries every module, the styles and the art, and nothing by path', () => {
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  assert.ok(!html.includes('/assets/'), 'an illustration is still referenced by path');
  assert.ok(!html.includes('type="module"'));
  assert.ok(!html.includes('href="/styles.css"'));
  assert.ok(html.includes("__require('public/js/app.js')"));
  assert.ok(html.includes('.nav__links'), 'the stylesheet is inlined');
  // Every illustration the site uses, once in the logo and again in the views and the CSS.
  for (const name of ['logo', 'colosseum', 'helmet', 'column', 'scroll', 'laurel', 'owl']) {
    const svg = fs.readFileSync(path.join(HERE, '..', 'public/assets/art', `${name}.svg`));
    assert.ok(html.includes(svg.toString('base64')), `${name}.svg is not inlined`);
  }
});

// --- health and providers --------------------------------------------------

await test('health says which runtime and which models, with no keys', async () => {
  const health = json(await call(project(), { url: '/api/health' }));
  assert.equal(health.runtime, 'apps-script');
  assert.equal(health.ai, false);
  assert.deepEqual(health.chain, []);
});

await test('the free provider comes first, the paid one after, as on Node', async () => {
  const app = project({ properties: { GROQ_API_KEY: 'g', ANTHROPIC_API_KEY: 'a' } });
  const health = json(await call(app, { url: '/api/health' }));
  assert.deepEqual(health.chain.map((provider) => provider.id), ['groq', 'anthropic']);
  assert.equal(health.chain[0].free, true);
  assert.equal(health.chain[1].free, false);
});

// --- the dictionary --------------------------------------------------------

await test('a dictionary lookup answers from Whitaker\'s', async () => {
  const app = project({ respond: dictionaryHosts });
  const response = await call(app, { url: '/api/dictionary?word=canem&lang=en' });
  assert.equal(response.status, 200, response.body);
  const entry = json(response);
  assert.equal(entry.word, 'canem');
  const headwords = entry.entries.flatMap((group) => group.senses.map((sense) => sense.headword)).join(' ');
  assert.match(headwords, /canis/);
  assert.ok(app.requests.some((request) => request.url.includes('morph.alpheios.net')));
});

await test('a second lookup is answered from CacheService', async () => {
  const app = project({ respond: dictionaryHosts });
  const first = await call(app, { url: '/api/dictionary?word=canem&lang=en' });
  const fetched = app.requests.length;
  assert.ok(fetched > 0);

  const second = await call(app, { url: '/api/dictionary?word=canem&lang=en' });
  assert.equal(second.body, first.body);
  assert.equal(app.requests.length, fetched, 'the second lookup went back out to the network');
});

await test('a word Whitaker\'s does not know is a 404 with an answer, not a crash', async () => {
  const app = project({
    respond: (url) => (url.includes('alpheios')
      ? { status: 201, body: '{"RDF":{"Annotation":{}}}' }
      : { status: 404, body: '{}' }),
  });
  const response = await call(app, { url: '/api/dictionary?word=qqqzz&lang=en' });
  assert.equal(response.status, 404, response.body);
  assert.ok(json(response).error);
});

await test('an unreachable dictionary is a 5xx answer, not a crashed execution', async () => {
  const app = project({ respond: () => new Error('DNS error: morph.alpheios.net') });
  const response = await call(app, { url: '/api/dictionary?word=canem&lang=en' });
  assert.ok(response.status >= 500, response.body);
});

// --- pronunciation ---------------------------------------------------------

await test('pronunciation comes back as base64 audio, and is kept', async () => {
  const audio = Buffer.from([0x49, 0x44, 0x33, 0xff, 0x00, 0x80]);
  const app = project({
    properties: { ELEVENLABS_API_KEY: 'k' },
    respond: () => ({ body: audio, headers: { 'Content-Type': 'audio/mpeg' } }),
  });
  const response = await call(app, { url: '/api/speak?word=puella' });
  assert.equal(response.status, 200, response.body);
  assert.equal(response.headers['content-type'], 'audio/mpeg');
  assert.deepEqual(Buffer.from(response.base64, 'base64'), audio);

  // The clip is kept, so the monthly budget is spent once per word.
  const asked = app.requests.length;
  const again = await call(app, { url: '/api/speak?word=puella' });
  assert.deepEqual(Buffer.from(again.base64, 'base64'), audio);
  assert.equal(app.requests.length, asked);
});

await test('without a speech key the speaker says so, as on Node', async () => {
  const response = await call(project(), { url: '/api/speak?word=puella' });
  assert.equal(response.status, 503);
});

// --- Claude, over plain HTTP ----------------------------------------------

function claude(app) {
  return app.execution().interpres_().require('appscript/src/modules/anthropic.js');
}

await test('Claude is asked over the Messages API with the right headers and body', async () => {
  let seen = null;
  const app = project({
    properties: { ANTHROPIC_API_KEY: 'sk-test' },
    respond(url, params) {
      seen = { url, params };
      return { body: { content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: ' Salve! ' }], stop_reason: 'end_turn' } };
    },
  });
  const text = await claude(app).ask({ system: 'Be brief.', messages: [{ role: 'user', content: 'Hello' }] });
  assert.equal(text, 'Salve!');
  assert.equal(seen.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(seen.params.method, 'post');
  assert.equal(seen.params.headers['x-api-key'], 'sk-test');
  assert.equal(seen.params.headers['anthropic-version'], '2026-10-21');
  assert.equal(seen.params.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
  const body = JSON.parse(seen.params.payload);
  assert.equal(body.fallbacks, 'default');
  assert.deepEqual(body.output_config, { effort: 'low' });
  assert.equal(body.system, 'Be brief.');
});

await test('an account without the fallback beta is retried without it', async () => {
  const sent = [];
  const app = project({
    properties: { ANTHROPIC_API_KEY: 'sk-test' },
    respond(_url, params) {
      sent.push(params);
      if (sent.length === 1) return { status: 400, body: { error: { type: 'invalid_request_error', message: 'fallbacks: not enabled' } } };
      return { body: { content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn' } };
    },
  });
  assert.equal(await claude(app).ask({ messages: [{ role: 'user', content: 'x' }] }), 'ok');
  assert.equal(sent.length, 2);
  assert.equal(sent[1].headers['anthropic-beta'], undefined);
  assert.equal(JSON.parse(sent[1].payload).fallbacks, undefined);
});

await test('a refusal is a 422, not an empty answer', async () => {
  const app = project({
    properties: { ANTHROPIC_API_KEY: 'sk-test' },
    respond: () => ({ body: { content: [], stop_reason: 'refusal', stop_details: { explanation: 'Declined.' } } }),
  });
  await assert.rejects(claude(app).ask({ messages: [{ role: 'user', content: 'x' }] }), (error) => error.status === 422);
});

// --- plumbing --------------------------------------------------------------

await test('unknown routes and bad JSON are refused politely', async () => {
  const app = project();
  assert.equal((await call(app, { url: '/api/nothing' })).status, 404);
  assert.equal((await call(app, { url: '/api/translate' })).status, 404, 'the translator is gone');
  const bad = await call(app, { method: 'POST', url: '/api/dictionary', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal(bad.status, 400);
});

await test('apiResult hands over a stashed response exactly once', async () => {
  const app = project();
  const response = await call(app, { id: 'abcdef123456', url: '/api/health' });
  const collected = app.execution().apiResult('abcdef123456');
  assert.equal(JSON.stringify(collected), JSON.stringify(response));
  assert.equal(app.execution().apiResult('abcdef123456'), null);
  assert.equal(app.execution().apiResult('../../etc'), null);
});

await test('a browser that gets real answers stops the stashing', async () => {
  const app = project();
  await call(app, { id: 'abcdef123456', unwrapped: true, url: '/api/health' });
  assert.equal(app.execution().apiResult('abcdef123456'), null);
});

console.log(`✓ all ${passed} Apps Script checks passed`);
