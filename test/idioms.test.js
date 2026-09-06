/**
 * Idioms are paired with their equivalents, not flattened into plain language.
 */
const { findIdioms, IDIOM_COUNT } = await import('../server/idioms.js');

let checked = 0;
const failures = [];
function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

ok('there is a table to search', IDIOM_COUNT >= 20, `${IDIOM_COUNT} entries`);

// --- an idiom maps to an idiom, not to a paraphrase -----------------------
let found = findIdioms('it cost me an arm and a leg', 'en', 'es');
ok('the English idiom is recognised', found.length === 1, JSON.stringify(found));
ok('and pairs with the Spanish idiom', found[0].say === 'costó un ojo de la cara', found[0]?.say);
ok('not with a flat paraphrase', !/mucho dinero|muy caro$/.test(found[0].say), found[0]?.say);
ok('and carries the plain meaning as a note',
  /expensive/.test(found[0].meaning.en), JSON.stringify(found[0]?.meaning));

// --- found inside a sentence ----------------------------------------------
found = findIdioms('the tickets cost an arm and a leg, sadly', 'en', 'es');
ok('an idiom inside a sentence is found', found.length === 1, JSON.stringify(found));

// --- the longest phrasing wins --------------------------------------------
found = findIdioms('she was pulling my leg the whole time', 'en', 'es');
ok('a phrasing variant is matched', found[0]?.say === 'tomar el pelo a alguien', found[0]?.say);

// --- Spanish source --------------------------------------------------------
found = findIdioms('me costó un ojo de la cara', 'es', 'en');
ok('a Spanish idiom is recognised', found.length === 1, JSON.stringify(found));
ok('and pairs with the English idiom',
  found[0].say === 'it cost an arm and a leg', found[0]?.say);

found = findIdioms('vamos a estirar la pata algún día', 'es', 'en');
ok('another Spanish idiom is found', found[0]?.say === 'to kick the bucket', found[0]?.say);

// --- accents and case are not required ------------------------------------
ok('matching ignores accents', findIdioms('llover a cantaros', 'es', 'en').length === 1);
ok('matching ignores case', findIdioms('IT COST AN ARM AND A LEG', 'en', 'es').length === 1);

// --- ordinary text matches nothing ----------------------------------------
ok('plain text has no idioms', findIdioms('the dog sleeps in the garden', 'en', 'es').length === 0);
ok('and neither does plain Spanish', findIdioms('el perro duerme en el jardín', 'es', 'en').length === 0);

// --- direction matters -----------------------------------------------------
ok('an English phrasing is not matched when reading Spanish',
  findIdioms('it cost an arm and a leg', 'es', 'en').length === 0);

// --- no more than two per translation -------------------------------------
const many = findIdioms('it was a piece of cake and it cost an arm and a leg and we killed two birds with one stone', 'en', 'es');
ok('at most two idioms are annotated', many.length <= 2, `${many.length}`);

// --- every entry is complete ----------------------------------------------
const table = findIdioms('', 'en', 'es');
ok('an empty string finds nothing', table.length === 0);

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} idiom checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} idiom checks passed`);
