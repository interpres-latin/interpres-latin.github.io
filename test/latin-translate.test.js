/**
 * The rules-based Latin translator, offline half.
 *
 * The morphology comes from Whitaker's over the network, so the sentences
 * themselves are exercised by hand and by the browser smoke tests. What is
 * covered here is everything that does not need the wire: the two-way lexicon,
 * and the English word-shaping that decides whether the reader is told "the
 * girl has the money" or "the girl haves the money".
 */
import {
  courseGloss, latinFor, knowsEnglish, singularsOf, LEXICON_SIZE,
} from '../server/latin-lexicon.js';
import {
  pluralise, thirdPerson, pastOf, firstSense, verbStem, englishVerb, baseVerb, notted,
  adjectiveCitation, verbCandidates,
} from '../server/latin-translate.js';

let checked = 0;
const failures = [];

function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

// --- the lexicon, both ways -----------------------------------------------
ok('the lexicon is populated', LEXICON_SIZE.latin > 500 && LEXICON_SIZE.english > 1000,
  JSON.stringify(LEXICON_SIZE));

for (const [english, latin] of [
  ['girl', 'puella'], ['boy', 'puer'], ['dog', 'canis'], ['slave', 'servus'],
  ['house', 'villa'], ['money', 'pecunia'], ['father', 'pater'],
]) {
  ok(`"${english}" → ${latin}`, latinFor(english).includes(latin), JSON.stringify(latinFor(english)));
}

// The course does not teach agricola, and every first-declension table does.
ok('"farmer" reaches agricola from the supplement', latinFor('farmer').includes('agricola'));
ok('and the supplement never displaces the course', latinFor('house')[0] === 'villa',
  JSON.stringify(latinFor('house')));

// Plurals: the lexicon is written in the singular.
ok('"farmers" finds agricola', latinFor('farmers').includes('agricola'));
ok('"girls" finds puella', latinFor('girls').includes('puella'));
ok('"boxes" would look for "box"', singularsOf('boxes').includes('box'));
ok('"cities" would look for "city"', singularsOf('cities').includes('city'));
ok('"grass" is not a plural', singularsOf('grass').every((guess) => guess !== 'gras'),
  JSON.stringify(singularsOf('grass')));

ok('the course gloss wins over a dictionary', courseGloss('laborat') === 'works');
ok('and is there for nouns too', courseGloss('puella') === 'girl');
ok('an unknown word has no course gloss', courseGloss('zzzz') === null);
ok('knowsEnglish is true for a known word', knowsEnglish('girl'));
ok('and false for nonsense', !knowsEnglish('qwertyuiop'));

// --- trimming a gloss to one sense ----------------------------------------
ok('a dictionary gloss is cut to its first sense',
  firstSense('girl, (female) child/daughter; maiden') === 'girl');
ok('a course gloss is cut too', firstSense('house, villa') === 'house');
ok('parentheticals go', firstSense('spring (of water), fountain') === 'spring');
ok('a single word survives', firstSense('farmer') === 'farmer');
ok('nothing stays nothing', firstSense('') === null);

// --- English word shapes ---------------------------------------------------
ok('regular plural', pluralise('farmer') === 'farmers');
ok('sibilant plural', pluralise('box') === 'boxes');
ok('consonant-y plural', pluralise('city') === 'cities');
ok('vowel-y plural', pluralise('boy') === 'boys');

ok('regular third person', thirdPerson('praise') === 'praises');
ok('sibilant third person', thirdPerson('watch') === 'watches');
ok('consonant-y third person', thirdPerson('carry') === 'carries');
ok('"go" takes -es', thirdPerson('go') === 'goes');
ok('"have" is irregular', thirdPerson('have') === 'has', thirdPerson('have'));
ok('"be" is irregular', thirdPerson('be') === 'is');

ok('regular past', pastOf('praise') === 'praised');
ok('consonant-y past', pastOf('carry') === 'carried');
ok('irregular past', pastOf('see') === 'saw');
ok('another irregular past', pastOf('give') === 'gave');

// A course verb gloss is a third person singular — "works", "sits" — and has
// to be reduced before it can be put into another tense.
ok('"works" reduces to "work"', verbStem('works') === 'work');
ok('"carries" reduces to "carry"', verbStem('carries') === 'carry');
ok('"watches" reduces to "watch"', verbStem('watches') === 'watch');
ok('"has" reduces to "have"', verbStem('has') === 'have', verbStem('has'));
ok('"is" reduces to "be"', verbStem('is') === 'be');
ok('"to praise" reduces to "praise"', verbStem('to praise') === 'praise');
// Not every -s is a third person: these must survive intact.
ok('"loves" reduces to "love"', verbStem('loves') === 'love');

// --- putting an English verb into the Latin's tense ------------------------
const present3s = { tense: 'present', number: 'singular', person: '3rd' };
const present3p = { tense: 'present', number: 'plural', person: '3rd' };
ok('present singular', englishVerb('praise', present3s) === 'praises');
ok('present plural', englishVerb('praise', present3p) === 'praise');
ok('"be" in the present', englishVerb('be', present3s) === 'is');
ok('imperfect is a past continuous',
  englishVerb('work', { tense: 'imperfect', number: 'plural' }) === 'were working');
ok('imperfect singular',
  englishVerb('work', { tense: 'imperfect', number: 'singular' }) === 'was working');
ok('perfect is a simple past',
  englishVerb('praise', { tense: 'perfect', number: 'singular' }) === 'praised');
ok('pluperfect',
  englishVerb('praise', { tense: 'pluperfect', number: 'singular' }) === 'had praised');
ok('future', englishVerb('praise', { tense: 'future', number: 'singular' }) === 'will praise');

// --- finding the infinitive behind an English form ------------------------
ok('"praised" comes from "praise"', baseVerb('praised') === 'prais' || baseVerb('praised') === 'praise',
  baseVerb('praised'));
ok('"carried" comes from "carry"', baseVerb('carried') === 'carry');
ok('"gave" comes from "give"', baseVerb('gave') === 'give');
ok('"saw" comes from "see"', baseVerb('saw') === 'see');
ok('a plain verb is left alone', baseVerb('praise') === 'praise');

// --- English for a Latin subjunctive --------------------------------------
// English kept almost none of its subjunctive, so what is left is the modals —
// except after a wish, which is the one place it still inflects.
ok('present subjunctive is "may"',
  englishVerb('praise', { tense: 'present', number: 'singular', person: '3rd' }) === 'praises');

// --- the negative goes after the auxiliary, not in front of the verb ------
ok('a simple present takes "does not"', notted('works') === 'does not work');
ok('"is" takes a bare not', notted('is') === 'is not');
ok('an auxiliary keeps its place', notted('was working') === 'was not working');
ok('and a modal does too', notted('may praise') === 'may not praise');

// --- Whitaker's compressed adjective parts --------------------------------
// They arrive the way a paper dictionary prints them, comparative and all, with
// the neuter as a bare ending. Handed over unexpanded they produced "laetaes".
ok('a first/second declension adjective expands',
  adjectiveCitation(['laetus', 'laeta -um']) === 'laetus, laeta, laetum',
  adjectiveCitation(['laetus', 'laeta -um']));
ok('and another', adjectiveCitation(['bonus', 'bona -um']) === 'bonus, bona, bonum');
ok('a third declension one is left as it is',
  adjectiveCitation(['fortis', 'forte']) === 'fortis, forte');
ok('two-termination likewise', adjectiveCitation(['omnis', 'omne']) === 'omnis, omne');
ok('the comparative and superlative are dropped',
  !adjectiveCitation(['laetus', 'laeta -um', 'laetior -or -us', 'laetissimus -a -um']).includes('laetior'));
ok('nothing is not a citation', adjectiveCitation([]) === '');

// --- the forms an English verb might be hiding behind ---------------------
// One guess was not enough: "praised" is praise with a d and prais with an ed,
// and only the lexicon knows which — so the whole past tense failed.
ok('"praised" offers "praise"', verbCandidates('praised').includes('praise'),
  JSON.stringify(verbCandidates('praised')));
ok('and offers "prais" too', verbCandidates('praised').includes('prais'));
ok('"carried" offers "carry"', verbCandidates('carried').includes('carry'));
ok('"gave" offers "give"', verbCandidates('gave').includes('give'));
ok('"praises" offers "praise"', verbCandidates('praises').includes('praise'));
ok('"working" offers "work"', verbCandidates('working').includes('work'));
ok('the word itself is always a candidate', verbCandidates('laudo').includes('laudo'));

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} Latin-translator checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} Latin-translator checks passed`);
