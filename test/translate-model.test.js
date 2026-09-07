/**
 * The guards around model translation.
 *
 * The model itself is not tested here — it is a network call to somebody
 * else's service. What is tested is everything this project does to a model's
 * reply before a student sees it: the wrapping it adds when told not to, and
 * the shapes that mean it answered the sentence instead of translating it.
 */
import { looksLikeATranslation, tidy } from '../server/translate-model.js';

let checked = 0;
const failures = [];

function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

// --- the wrapping a model adds even when told not to ----------------------
ok('a bare translation is left alone', tidy('le chien de la fille') === 'le chien de la fille');
ok('surrounding quotes come off', tidy('"le chien de la fille"') === 'le chien de la fille');
ok('so do guillemets', tidy('« le chien de la fille »') === 'le chien de la fille');
ok('so do single quotes', tidy("'le chien'") === 'le chien');
ok('a code fence comes off', tidy('```\nle chien\n```') === 'le chien');
ok('a "Translation:" prefix comes off', tidy('Translation: le chien') === 'le chien');
ok('and its French spelling', tidy('Traduction : le chien') === 'le chien');
ok('whitespace is trimmed', tidy('   le chien   ') === 'le chien');
ok('nothing stays nothing', tidy(null) === '');

// A quotation *inside* the sentence is part of the sentence.
ok('an inner quotation survives',
  tidy('Il a dit "bonjour" à la fille') === 'Il a dit "bonjour" à la fille',
  tidy('Il a dit "bonjour" à la fille'));

// --- replies that are a conversation rather than a translation ------------
const source = 'the dog of the girl';
ok('a plain translation passes', looksLikeATranslation('le chien de la fille', source));
ok('an empty reply fails', !looksLikeATranslation('', source));
ok('several lines fail', !looksLikeATranslation('le chien\nou bien: le chien de la fille', source));
ok('a preamble fails', !looksLikeATranslation('Sure! le chien de la fille', source));
ok('"Here is" fails', !looksLikeATranslation('Here is the translation: le chien', source));
ok('a first-person answer fails', !looksLikeATranslation('I cannot translate that.', source));
ok('an assistant disclaimer fails', !looksLikeATranslation('As an AI language model, I...', source));
ok('a note fails', !looksLikeATranslation('Note: this is ambiguous', source));
ok('an apology fails', !looksLikeATranslation('Sorry, I did not understand', source));

// The target language is often English, and English sentences begin with
// ordinary words. These must not be mistaken for a model refusing.
ok('"I ate bread" is a translation, not a refusal',
  looksLikeATranslation('I ate bread', "J'ai mangé du pain"));
ok('"I am tired" likewise', looksLikeATranslation('I am tired', 'fessus sum'));
ok('"Sorry" as a translation of a word passes', looksLikeATranslation('Sorry', 'Pardon'));
ok('"Note" as a noun passes', looksLikeATranslation('Note the difference', 'Notez la différence'));

// Length: an explanation is long relative to the sentence it explains.
ok('a rambling reply fails',
  !looksLikeATranslation('le chien de la fille, '.repeat(8), source));
ok('a short word for a short word passes', looksLikeATranslation('canis', 'dog'));
ok('a long-ish translation of a long sentence passes',
  looksLikeATranslation(
    'Le chat noir dort sur la vieille table de la cuisine',
    'The black cat sleeps on the old kitchen table',
  ));

// A sentence that merely mentions translation is still a translation.
ok('the word "translation" mid-sentence is fine',
  looksLikeATranslation('Cette traduction est correcte', 'This translation is correct'));

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} model-translation checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} model-translation checks passed`);
