/**
 * The teacher's padlock: two switches behind one dialog.
 *
 * The lock seals the site for everybody. The restriction is softer — it leaves
 * everything working and narrows the site to Spanish, taking away the two
 * languages that are not today's lesson. They have separate passcodes and must
 * not reach each other: restricting must never seal the room, and unlocking
 * must never quietly open French and Latin back up.
 *
 * The router is mounted on a real express app, since that is the only way to
 * exercise what the browser actually talks to.
 */
import express from 'express';
import { router } from '../server/routes/lock.js';

let checked = 0;
const failures = [];
function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

const app = express();
app.use(express.json());
app.use('/api/lock', router);

const server = app.listen(0);
const { port } = server.address();
const base = `http://127.0.0.1:${port}/api/lock`;

const read = async () => (await fetch(base)).json();
const send = async (passcode, body = {}) => {
  const response = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode, ...body }),
  });
  return { status: response.status, state: await response.json() };
};

// --- it starts open --------------------------------------------------------
let state = await read();
ok('starts unlocked', state.locked === false);
ok('and says nothing about subjects, which are per-browser', state.restricted === undefined);

// --- the word that hands one browser the other languages ------------------
let result = await send('profe');
ok('"profe" is accepted', result.status === 200, String(result.status));
ok('and says the browser may open them', result.state.opened === true);
ok('and does not seal anything', result.state.locked === false);
ok('without locking the site', result.state.locked === false);
ok('and nothing was recorded for anyone else',
  (await read()).restricted === undefined && (await read()).opened === undefined);

// There is no word that takes the languages away again — that would be a
// switch over other people's screens, which this deliberately is not.
result = await send('walsh');
ok('"walsh" is now just a wrong passcode', result.status === 403, String(result.status));
ok('and still does not lock', result.state.locked === false);

// Case and stray spaces are forgiven, as they are for the lock.
ok('the passcode is case-insensitive', (await send('  PROFE ')).state.opened === true);

// --- the lock, which is a different switch ---------------------------------
result = await send('AP_Lit');
ok('the teacher passcode locks', result.state.locked === true);
ok('and does not open the subjects', result.state.opened === undefined);
ok('a lock records when', typeof result.state.since === 'number');

result = await send('AP_Lit');
ok('and toggles back', result.state.locked === false);
ok('clearing the timestamp', result.state.since === null);

// --- the two do not reach each other --------------------------------------
await send('profe');
result = await send('AP_Lit', { locked: true });
ok('locking says nothing about subjects', result.state.opened === undefined && result.state.locked === true);
result = await send('AP_Lit', { locked: false });
ok('and neither does unlocking', result.state.opened === undefined && result.state.locked === false);
await send('walsh');

// --- anything else is refused ---------------------------------------------
result = await send('nope');
ok('a wrong passcode is refused', result.status === 403, String(result.status));
ok('and changes nothing', result.state.locked === false && result.state.opened === undefined);
ok('and says nothing about which was wrong', !/profe|walsh|AP_Lit/i.test(JSON.stringify(result.state)));
result = await send('');
ok('an empty passcode is refused', result.status === 403);

server.close();

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} lock checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} lock checks passed`);
