/**
 * Idioms are paired with their equivalents, not flattened into plain language.
 */
const { findIdioms, IDIOM_COUNT, alreadyIdiomatic, idiomSignature } = await import('../server/idioms.js');

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

// --- an idiom the engine already got right is left alone -------------------
// The stored form is a citation — *llueve a cántaros*, third person present. An
// engine that produced the idiom in some other inflection has got it right, and
// pasting the citation form over it yields "está llueve a cántaros", which is
// worse than the literal rendering the feature exists to repair.
for (const [translated, say, expected, why] of [
  ['está lloviendo a cántaros', 'llueve a cántaros', true, 'same idiom, different inflection'],
  ['llueve a cántaros', 'llueve a cántaros', true, 'exactly the stored form'],
  ['Está lloviendo gatos y perros', 'llueve a cántaros', false, 'word for word — needs repair'],
  ['costó un brazo y una pierna', 'costó un ojo de la cara', false, 'word for word'],
  ['me costó un ojo de la cara', 'costó un ojo de la cara', true, 'idiom present, extra pronoun'],
  ['es pan comido', 'pan comido', true, 'a two-word idiom keeps both words'],
  ['fue muy fácil', 'pan comido', false, 'a paraphrase is not the idiom'],
  // French citation forms open with a pronoun, so dropping one word still
  // leaves an inflected verb — the tail has to be checked as well.
  ['coûtait les yeux de la tête', 'ça a coûté les yeux de la tête', true, 'French, imperfect'],
  ['ça a coûté un bras et une jambe', 'ça a coûté les yeux de la tête', false, 'French, word for word'],
  ['il a cassé sa pipe', 'casser sa pipe', true, 'French, conjugated'],
  ['il a donné un coup de pied dans le seau', 'casser sa pipe', false, 'French, word for word'],
]) {
  ok(`"${translated}" ${expected ? 'is' : 'is not'} already idiomatic (${why})`,
    alreadyIdiomatic(translated, say) === expected);
}

ok('a signature drops the verb where the verb leads', idiomSignature('llueve a cántaros').includes('a cantaros'));
ok('and keeps both words of a two-word idiom', idiomSignature('pan comido').includes('pan comido'));
ok('a signature ignores accents', alreadyIdiomatic('LLUEVE A CANTAROS', 'llueve a cántaros'));

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} idiom checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} idiom checks passed`);
