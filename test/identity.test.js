/**
 * Who the allowance belongs to.
 *
 * A classroom shares one address, so identity has to be per browser or thirty
 * students share five questions.
 */
const { identify, addressOf } = await import('../server/identity.js');

let checked = 0;
const failures = [];

function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

/** A stand-in response that records the cookie it was told to set. */
function fakeRes() {
  const jar = {};
  return {
    jar,
    cookie(name, value, options) { jar.name = name; jar.value = value; jar.options = options; },
  };
}

const CLASSROOM = { socket: { remoteAddress: '10.0.0.7' } };

// --- one room, two students ------------------------------------------------
const a = fakeRes();
const b = fakeRes();
const idA = identify({ headers: {}, ...CLASSROOM }, a);
const idB = identify({ headers: {}, ...CLASSROOM }, b);

ok('two browsers behind one address get different identities', idA !== idB, `${idA} / ${idB}`);
ok('identity is not the address', !idA.includes('10.0.0.7'), idA);
ok('a cookie is issued', a.jar.name === 'profegpt_id', a.jar.name);
ok('the cookie is not readable by scripts', a.jar.options?.httpOnly === true);
ok('it is scoped to the whole site', a.jar.options?.path === '/');
ok('it survives a browser restart', (a.jar.options?.maxAge ?? 0) > 30 * 24 * 60 * 60 * 1000);

// --- a returning browser keeps its identity -------------------------------
const returning = { headers: { cookie: `profegpt_id=${a.jar.value}` }, ...CLASSROOM };
const again = fakeRes();
ok('a returning browser is recognised', identify(returning, again) === idA);
ok('and is not issued a second cookie', again.jar.name === undefined);

// --- a forged identity is refused -----------------------------------------
const forged = fakeRes();
const forgedId = identify({ headers: { cookie: 'profegpt_id=iamsomeoneelse.notasignature' }, ...CLASSROOM }, forged);
ok('an unsigned identity is rejected', forgedId !== 'b:iamsomeoneelse', forgedId);
ok('and a fresh one is issued instead', forged.jar.name === 'profegpt_id');

const tampered = `${a.jar.value.split('.')[0]}.aaaaaaaaaaaaaaaaaaaaaaaa`;
const tamperedRes = fakeRes();
ok('a tampered signature is rejected',
  identify({ headers: { cookie: `profegpt_id=${tampered}` }, ...CLASSROOM }, tamperedRes) !== idA);

// --- no cookie possible: fall back to the address -------------------------
const fallback = identify({ headers: {}, ...CLASSROOM }, null);
ok('falls back to the address when no cookie can be set', fallback === 'ip:10.0.0.7', fallback);

// --- the address helper still behaves ------------------------------------
const spoofed = { headers: { 'x-forwarded-for': '203.0.113.5' }, socket: { remoteAddress: '10.0.0.1' } };
ok('a forwarded header is ignored by default', addressOf(spoofed) === '10.0.0.1', addressOf(spoofed));

process.env.TRUST_PROXY = '1';
const proxied = await import('../server/identity.js?trusted');
ok('with TRUST_PROXY it uses the forwarded address', proxied.addressOf(spoofed) === '203.0.113.5');
ok('and takes the first hop of the chain',
  proxied.addressOf({ headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }, socket: {} }) === '203.0.113.5');
delete process.env.TRUST_PROXY;

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} identity checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} identity checks passed`);
