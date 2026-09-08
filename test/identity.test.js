/**
 * Where a request came from.
 *
 * Only one thing still asks — the translator's report log, which rate-limits on
 * it — but the two ways of getting it wrong both matter: believing a header any
 * client can send, and refusing to believe it when the app really is behind a
 * proxy.
 */
let checked = 0;
const failures = [];
function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

const { addressOf } = await import('../server/identity.js');

const direct = { headers: {}, socket: { remoteAddress: '10.0.0.1' } };
ok('the socket address is used', addressOf(direct) === '10.0.0.1', addressOf(direct));
ok('and an unknown one does not throw', addressOf({ headers: {}, socket: {} }) === 'unknown');
ok('nor does a request with nothing on it', addressOf({}) === 'unknown');

// X-Forwarded-For is a header, and any client can send one. Believing it by
// default would let anybody claim a fresh allowance by claiming a fresh address.
const spoofed = { headers: { 'x-forwarded-for': '203.0.113.5' }, socket: { remoteAddress: '10.0.0.1' } };
ok('a forwarded header is ignored by default', addressOf(spoofed) === '10.0.0.1', addressOf(spoofed));

process.env.TRUST_PROXY = '1';
const proxied = await import('../server/identity.js?trusted');
ok('with TRUST_PROXY it uses the forwarded address', proxied.addressOf(spoofed) === '203.0.113.5');
ok('and takes the first hop of a chain, not the last',
  proxied.addressOf({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }, socket: {} }) === '203.0.113.5');
ok('falling back to the socket when the header is empty',
  proxied.addressOf({ headers: { 'x-forwarded-for': '  ' }, socket: { remoteAddress: '10.0.0.9' } }) === '10.0.0.9');

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} address checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} address checks passed`);
