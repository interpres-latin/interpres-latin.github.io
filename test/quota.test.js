/**
 * The sliding-window quota that meters off-topic chat questions.
 */
process.env.CHAT_FREE_LIMIT = '10';
process.env.CHAT_WINDOW_MINUTES = '30';
process.env.CHAT_OVERFLOW_LIMIT = '20';

const { consume, peek, refund, overall, callerOf } = await import('../server/quota.js');

let checked = 0;
const failures = [];

function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

const T0 = 1_000_000_000_000;
const MINUTE = 60_000;

// --- spending the allowance ------------------------------------------------
ok('starts full', peek('a', 0, T0).remaining === 10);

let last;
for (let i = 1; i <= 10; i += 1) last = consume('a', 0, T0 + i);
ok('ten questions are allowed', last.allowed === true);
ok('allowance is spent', last.remaining === 0, `remaining ${last.remaining}`);

const eleventh = consume('a', 0, T0 + 11);
ok('the eleventh is refused', eleventh.allowed === false);
ok('refusal does not go negative', eleventh.remaining === 0);
ok('refusal reports when a slot returns', typeof eleventh.resetAt === 'number');
ok('reset is one window after the first question',
  eleventh.resetAt === T0 + 1 + 30 * MINUTE, `resetAt ${eleventh.resetAt}`);

// --- the window slides -----------------------------------------------------
ok('still empty just before the window closes', peek('a', 0, T0 + 30 * MINUTE).remaining === 0);
// The first question was at T0 + 1, so it ages out one window later.
ok('one slot returns once the oldest ages out',
  peek('a', 0, T0 + 30 * MINUTE + 1).remaining === 1,
  `remaining ${peek('a', 0, T0 + 30 * MINUTE + 1).remaining}`);
ok('all slots return after a full window',
  peek('a', 0, T0 + 61 * MINUTE).remaining === 10);
ok('peek does not itself spend or clear anything',
  peek('a', 0, T0 + 12).remaining === 0, 'a should still be empty at T0+12');

// --- callers are independent ----------------------------------------------
ok('a second caller has their own allowance', peek('b', 0, T0 + 11).remaining === 10);
consume('b', 0, T0 + 12);
ok('spending for b does not touch a', peek('a', 0, T0 + 12).remaining === 0);
ok('b spent one of their own', peek('b', 0, T0 + 12).remaining === 9);

// --- refunds ---------------------------------------------------------------
consume('c', 0, T0);
consume('c', 0, T0 + 1);
ok('c has spent two', peek('c', 0, T0 + 2).remaining === 8);
refund('c', 0);
ok('a refund returns the slot', peek('c', 0, T0 + 2).remaining === 9);
refund('c', 0);
refund('c', 0);
ok('refunding past empty is harmless', peek('c', 0, T0 + 2).remaining === 10);

// --- tiers are independent allowances --------------------------------------
ok('the overflow tier has its own, larger limit', peek('t', 1, T0).limit === 20);
ok('spending tier 0 leaves tier 1 untouched',
  (() => { for (let i = 0; i < 10; i += 1) consume('t', 0, T0 + i); return peek('t', 1, T0).remaining === 20; })());
ok('tier 0 is now spent', peek('t', 0, T0 + 10).remaining === 0);
ok('tier 1 still answers', consume('t', 1, T0 + 11).allowed === true);

// --- the aggregate the UI counts down --------------------------------------
const combined = overall('t', 2, T0 + 12);
ok('aggregate limit spans both tiers', combined.limit === 30, `limit ${combined.limit}`);
ok('aggregate remaining is what is left overall', combined.remaining === 19, `remaining ${combined.remaining}`);
ok('aggregate reports both tiers', combined.tiers.length === 2);
ok('aggregate has no reset while capacity remains', combined.resetAt === null);

for (let i = 1; i < 20; i += 1) consume('t', 1, T0 + 12 + i);
const spent = overall('t', 2, T0 + 40);
ok('aggregate empties only when every tier is spent', spent.remaining === 0, `remaining ${spent.remaining}`);
ok('and then reports when the first slot returns', typeof spent.resetAt === 'number');

// --- identifying the caller -----------------------------------------------
ok('prefers the forwarded address',
  callerOf({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }, socket: { remoteAddress: '10.0.0.1' } }) === '203.0.113.5');
ok('falls back to the socket',
  callerOf({ headers: {}, socket: { remoteAddress: '198.51.100.7' } }) === '198.51.100.7');
ok('survives a request with neither', callerOf({ headers: {}, socket: {} }) === 'unknown');

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} quota checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} quota checks passed`);
