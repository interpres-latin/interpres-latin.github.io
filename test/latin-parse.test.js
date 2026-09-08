/**
 * The Latin parser, on whole sentences.
 *
 * Not offline, unlike the rest of `npm test`: the parser asks the dictionary
 * what each word can be before it decides what each word is. Run with
 * `npm run test:parse`.
 *
 * These are exact-match checks on purpose. A translation that is nearly right
 * is a translation that moved, and the point of a parser over a ranking is that
 * the same sentence gives the same answer every time.
 */
import { parseLatin } from '../server/latin-parse.js';

let checked = 0;
const failures = [];
const ok = (name, condition, detail = '') => {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
};

const CASES = [
  // The plain shapes: subject, verb, object.
  ['puella epistulam scribit', 'The girl writes the letter.'],
  ['pueri libros portant', 'The boys carry the books.'],
  ['regina insulam regit', 'The queen rules the island.'],
  ['puellae rosas portant', 'The girls carry the roses.'],

  // The verb says what number the subject is, and supplies it when Latin drops it.
  ['in horto laboramus', 'We work in the garden.'],
  ['puellam non video', 'I do not see the girl.'],

  // A preposition decides the case of what follows it.
  ['canis in via currit', 'The dog runs in the street.'],
  ['nauta ad insulam navigat', 'The sailor sails to the island.'],
  ['servus dominum in horto videt', 'The slave sees the master in the garden.'],
  ['puella cibum cum amico in culina consumit',
    'The girl consumes the food with the friend in the kitchen.'],

  // An adjective agrees with its noun, which narrows both.
  ['magna puella librum portat', 'The big girl carries the book.'],
  ['pueri boni libros portant', 'The good boys carry the books.'],

  // *sum* takes a complement rather than an object.
  ['villa agricolae est magna', 'The house of the farmer is big.'],
  ['canis puellae est magnus', 'The dog of the girl is big.'],
  ['liber pueri est magnus', 'The book of the boy is big.'],

  // Dative or genitive, decided by whether the verb has anyone to give to.
  ['agricola puellae rosam dat', 'The farmer gives the rose to the girl.'],
  ['servus domino epistulam mittit', 'The slave sends the letter to the master.'],
  ['poeta libros poetae legit', 'The poet reads the books of the poet.'],
  ['dominus servos ad villam mittit', 'The master sends the slaves to the house.'],

  // An imperative needs somebody to address, or it is not an imperative.
  ['veni, puella', 'Come, girl.'],
  ['veni ad villam', 'I came to the house.'],

  // Tense, and negation on a plural subject.
  ['servi dominum non viderunt', 'The slaves did not see the master.'],
  ['puer in horto non laborat', 'The boy does not work in the garden.'],
];

const results = await Promise.all(CASES.map(async ([latin, want]) => {
  const parsed = await parseLatin(latin).catch((error) => ({ text: `(threw: ${error.message})` }));
  return [latin, want, parsed?.text ?? '(refused)'];
}));

for (const [latin, want, got] of results) {
  ok(`"${latin}"`, got.toLowerCase() === want.toLowerCase(), `want: ${want}\n    got:  ${got}`);
}

/**
 * It answers rather than declining, and shows what it could not place.
 *
 * Refusing hid the failure as surely as dropping the words did, and a parser
 * that declines whenever it is not certain declines nearly everything. A phrase
 * with no verb still says what it does know.
 */
const noVerb = await parseLatin('in villa magna');
ok('a phrase with no verb still answers', noVerb !== null, JSON.stringify(noVerb));
ok('and says what it knows', /in the big house/i.test(noVerb?.text ?? ''), noVerb?.text);
ok('without repeating the adjective', !/the big\.?$/i.test(noVerb?.text ?? ''), noVerb?.text);

// Words it cannot place are shown in brackets, never dropped in silence.
const partial = await parseLatin('me sanus periclitor iuvo');
ok('an unplaceable word is shown, not dropped', /\[[^\]]+\]/.test(partial?.text ?? ''), partial?.text);

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} parser checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}\n`);
  process.exit(1);
}
console.log(`✓ all ${checked} parser checks passed`);
