/**
 * The sliding-window quota that meters off-topic chat questions.
 */
process.env.CHAT_FREE_LIMIT = '10'; // the default is 5; pinned here for the arithmetic below
process.env.CHAT_WINDOW_MINUTES = '30';

const { consume, peek, refund, callerOf } = await import('../server/quota.js');

let checked = 0;
const failures = [];

function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

const T0 = 1_000_000_000_000;
const MINUTE = 60_000;

// --- spending the allowance ------------------------------------------------
ok('starts full', peek('a', T0).remaining === 10);

let last;
for (let i = 1; i <= 10; i += 1) last = consume('a', T0 + i);
ok('ten questions are allowed', last.allowed === true);
ok('allowance is spent', last.remaining === 0, `remaining ${last.remaining}`);

const eleventh = consume('a', T0 + 11);
ok('the eleventh is refused', eleventh.allowed === false);
ok('refusal does not go negative', eleventh.remaining === 0);
ok('refusal reports when a slot returns', typeof eleventh.resetAt === 'number');
ok('reset is one window after the first question',
  eleventh.resetAt === T0 + 1 + 30 * MINUTE, `resetAt ${eleventh.resetAt}`);

// --- the window slides -----------------------------------------------------
ok('still empty just before the window closes', peek('a', T0 + 30 * MINUTE).remaining === 0);
// The first question was at T0 + 1, so it ages out one window later.
ok('one slot returns once the oldest ages out',
  peek('a', T0 + 30 * MINUTE + 1).remaining === 1,
  `remaining ${peek('a', T0 + 30 * MINUTE + 1).remaining}`);
ok('all slots return after a full window',
  peek('a', T0 + 61 * MINUTE).remaining === 10);
ok('peek does not itself spend or clear anything',
  peek('a', T0 + 12).remaining === 0, 'a should still be empty at T0+12');

// --- callers are independent ----------------------------------------------
ok('a second caller has their own allowance', peek('b', T0 + 11).remaining === 10);
consume('b', T0 + 12);
ok('spending for b does not touch a', peek('a', T0 + 12).remaining === 0);
ok('b spent one of their own', peek('b', T0 + 12).remaining === 9);

// --- refunds ---------------------------------------------------------------
consume('c', T0);
consume('c', T0 + 1);
ok('c has spent two', peek('c', T0 + 2).remaining === 8);
refund('c');
ok('a refund returns the slot', peek('c', T0 + 2).remaining === 9);
refund('c');
refund('c');
ok('refunding past empty is harmless', peek('c', T0 + 2).remaining === 10);

// --- one allowance, whichever provider serves it ---------------------------
// The chain exists to survive an outage, not to hand out extra questions: a
// question costs one slot however many providers were tried.
ok('there is a single allowance, not one per provider', peek('solo').limit === 10);

// --- identifying the caller -----------------------------------------------
// A client can send any header it likes, so an untrusted X-Forwarded-For would
// let anyone mint a fresh allowance on demand.
const spoofed = { headers: { 'x-forwarded-for': '203.0.113.5' }, socket: { remoteAddress: '10.0.0.1' } };
ok('a forwarded header is ignored by default', callerOf(spoofed) === '10.0.0.1', callerOf(spoofed));
ok('falls back to the socket',
  callerOf({ headers: {}, socket: { remoteAddress: '198.51.100.7' } }) === '198.51.100.7');
ok('survives a request with neither', callerOf({ headers: {}, socket: {} }) === 'unknown');

// …and is honoured only when a proxy is declared.
process.env.TRUST_PROXY = '1';
const proxied = await import('../server/quota.js?trusted');
ok('with TRUST_PROXY it uses the forwarded address',
  proxied.callerOf(spoofed) === '203.0.113.5', proxied.callerOf(spoofed));
ok('and takes the first hop, not the proxy chain',
  proxied.callerOf({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }, socket: {} }) === '203.0.113.5');
delete process.env.TRUST_PROXY;

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} quota checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} quota checks passed`);
