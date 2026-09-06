/**
 * The Latin engines: declension and conjugation.
 *
 * Reference forms checked against the standard paradigms — Kennedy's tables for
 * the nouns, the Bescherelle-equivalent Latin ones for the verbs. Offline.
 */
import { declineNoun, declineAdjective, isIStem, formOf } from '../public/js/lib/decliner-la.js';
import { conjugate, PERSONS, classify, parseParts } from '../public/js/lib/conjugator-la.js';

let checked = 0;
const failures = [];

function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

/** A whole row of a declension: singular then plural, in the order taught. */
function noun(parts, gender, number, expected) {
  const [nom, gen] = parts.split(/,\s*/);
  const result = declineNoun(nom, gen, gender);
  checked += 1;
  if (!result.ok) { failures.push(`${parts}: ${result.error}`); return; }
  const got = ['nominative', 'vocative', 'accusative', 'genitive', 'dative', 'ablative']
    .map((c) => result.table[number][c]).join(', ');
  if (got !== expected.join(', ')) {
    failures.push(`${parts} ${number}\n    expected: ${expected.join(', ')}\n    actual:   ${got}`);
  }
}

function verb(parts, path, expected) {
  const result = conjugate(parts);
  checked += 1;
  if (!result.ok) { failures.push(`${parts} ${path}: ${result.error}`); return; }
  const cell = path.split('.').reduce((node, key) => node?.[key], result.table);
  const got = Array.isArray(expected) ? PERSONS.map((p) => cell?.[p]).join(', ') : cell;
  const want = Array.isArray(expected) ? expected.join(', ') : expected;
  if (got !== want) failures.push(`${parts} ${path}\n    expected: ${want}\n    actual:   ${got}`);
}

// === DECLENSIONS ===========================================================

// --- first ------------------------------------------------------------------
noun('puella, puellae', 'feminine', 'singular', ['puella', 'puella', 'puellam', 'puellae', 'puellae', 'puella']);
noun('puella, puellae', 'feminine', 'plural', ['puellae', 'puellae', 'puellas', 'puellarum', 'puellis', 'puellis']);

// --- second -----------------------------------------------------------------
noun('dominus, domini', 'masculine', 'singular', ['dominus', 'domine', 'dominum', 'domini', 'domino', 'domino']);
noun('dominus, domini', 'masculine', 'plural', ['domini', 'domini', 'dominos', 'dominorum', 'dominis', 'dominis']);
noun('bellum, belli', 'neuter', 'singular', ['bellum', 'bellum', 'bellum', 'belli', 'bello', 'bello']);
noun('bellum, belli', 'neuter', 'plural', ['bella', 'bella', 'bella', 'bellorum', 'bellis', 'bellis']);
// -er keeps its nominative in the vocative; -ius contracts it.
noun('puer, pueri', 'masculine', 'singular', ['puer', 'puer', 'puerum', 'pueri', 'puero', 'puero']);
noun('ager, agri', 'masculine', 'singular', ['ager', 'ager', 'agrum', 'agri', 'agro', 'agro']);
noun('filius, filii', 'masculine', 'singular', ['filius', 'fili', 'filium', 'filii', 'filio', 'filio']);

// --- third, consonant stem --------------------------------------------------
noun('rex, regis', 'masculine', 'singular', ['rex', 'rex', 'regem', 'regis', 'regi', 'rege']);
noun('rex, regis', 'masculine', 'plural', ['reges', 'reges', 'reges', 'regum', 'regibus', 'regibus']);
noun('nomen, nominis', 'neuter', 'singular', ['nomen', 'nomen', 'nomen', 'nominis', 'nomini', 'nomine']);
noun('nomen, nominis', 'neuter', 'plural', ['nomina', 'nomina', 'nomina', 'nominum', 'nominibus', 'nominibus']);

// --- third, i-stem ----------------------------------------------------------
noun('urbs, urbis', 'feminine', 'plural', ['urbes', 'urbes', 'urbes', 'urbium', 'urbibus', 'urbibus']);
noun('civis, civis', 'masculine', 'plural', ['cives', 'cives', 'cives', 'civium', 'civibus', 'civibus']);
noun('mare, maris', 'neuter', 'singular', ['mare', 'mare', 'mare', 'maris', 'mari', 'mari']);
noun('mare, maris', 'neuter', 'plural', ['maria', 'maria', 'maria', 'marium', 'maribus', 'maribus']);
noun('animal, animalis', 'neuter', 'plural', ['animalia', 'animalia', 'animalia', 'animalium', 'animalibus', 'animalibus']);

ok('urbs is an i-stem (two consonants close the stem)', isIStem('urbs', 'urb'));
ok('civis is an i-stem (parisyllabic)', isIStem('civis', 'civ'));
ok('mare is an i-stem (neuter in -e)', isIStem('mare', 'mar', 'neuter'));
ok('rex is not an i-stem', !isIStem('rex', 'reg'));
ok('nomen is not an i-stem', !isIStem('nomen', 'nomin', 'neuter'));
// Caesar and consul end like the neuter rule but are masculine consonant stems.
ok('Caesar is not an i-stem', !isIStem('caesar', 'caesar', 'masculine'));
ok('consul is not an i-stem', !isIStem('consul', 'consul', 'masculine'));

// --- fourth and fifth -------------------------------------------------------
noun('manus, manus', 'feminine', 'singular', ['manus', 'manus', 'manum', 'manus', 'manui', 'manu']);
noun('manus, manus', 'feminine', 'plural', ['manus', 'manus', 'manus', 'manuum', 'manibus', 'manibus']);
noun('cornu, cornus', 'neuter', 'plural', ['cornua', 'cornua', 'cornua', 'cornuum', 'cornibus', 'cornibus']);
noun('dies, diei', 'masculine', 'singular', ['dies', 'dies', 'diem', 'diei', 'diei', 'die']);
noun('res, rei', 'feminine', 'plural', ['res', 'res', 'res', 'rerum', 'rebus', 'rebus']);

// --- adjectives -------------------------------------------------------------
const bonus = declineAdjective('bonus, bona, bonum');
ok('bonus is first/second declension', bonus.family === '1st/2nd');
ok('bonus m. acc. sg.', bonus.table.masculine.singular.accusative === 'bonum');
ok('bonus f. gen. sg.', bonus.table.feminine.singular.genitive === 'bonae');
ok('bonus n. nom. pl.', bonus.table.neuter.plural.nominative === 'bona');

const fortis = declineAdjective('fortis, forte');
ok('fortis has two terminations', fortis.terminations === 2, String(fortis.terminations));
ok('fortis n. nom. sg. is forte', fortis.table.neuter.singular.nominative === 'forte');
ok('fortis abl. sg. is forti', fortis.table.masculine.singular.ablative === 'forti');
ok('fortis gen. pl. is fortium', fortis.table.masculine.plural.genitive === 'fortium');

const acer = declineAdjective('acer, acris, acre');
ok('acer has three terminations', acer.terminations === 3);
ok('acer m. nom. is acer', acer.table.masculine.singular.nominative === 'acer');
ok('acer f. nom. is acris', acer.table.feminine.singular.nominative === 'acris');
ok('acer n. nom. is acre', acer.table.neuter.singular.nominative === 'acre');

// One termination: the second part quoted is the genitive, and every gender
// shares the nominative — ingens, not "ingente".
const ingens = declineAdjective('ingens, ingentis');
ok('ingens has one termination', ingens.terminations === 1);
ok('ingens n. nom. sg. is ingens', ingens.table.neuter.singular.nominative === 'ingens', ingens.table.neuter.singular.nominative);
ok('ingens n. nom. pl. is ingentia', ingens.table.neuter.plural.nominative === 'ingentia');

// --- building one form, which is what the translator needs -----------------
ok('formOf gives the nominative of canis', formOf('canis', 'canis', 'common', 'nominative') === 'canis');
ok('formOf gives the genitive of puella', formOf('puella', 'puellae', 'feminine', 'genitive') === 'puellae');
ok('formOf gives the nominative plural of canis', formOf('canis', 'canis', 'common', 'nominative', 'plural') === 'canes');

// === CONJUGATIONS ==========================================================

// --- the five models --------------------------------------------------------
verb('amo, amare, amavi, amatus', 'indicativus.praesens', ['amo', 'amas', 'amat', 'amamus', 'amatis', 'amant']);
verb('amo, amare, amavi, amatus', 'indicativus.imperfectum', ['amabam', 'amabas', 'amabat', 'amabamus', 'amabatis', 'amabant']);
verb('amo, amare, amavi, amatus', 'indicativus.futurum', ['amabo', 'amabis', 'amabit', 'amabimus', 'amabitis', 'amabunt']);
verb('amo, amare, amavi, amatus', 'indicativus.perfectum', ['amavi', 'amavisti', 'amavit', 'amavimus', 'amavistis', 'amaverunt']);
verb('amo, amare, amavi, amatus', 'indicativus.plusquamperfectum', ['amaveram', 'amaveras', 'amaverat', 'amaveramus', 'amaveratis', 'amaverant']);
verb('amo, amare, amavi, amatus', 'coniunctivus.praesens', ['amem', 'ames', 'amet', 'amemus', 'ametis', 'ament']);
verb('amo, amare, amavi, amatus', 'coniunctivus.imperfectum', ['amarem', 'amares', 'amaret', 'amaremus', 'amaretis', 'amarent']);
verb('amo, amare, amavi, amatus', 'indicativus.praesensPassivum', ['amor', 'amaris', 'amatur', 'amamur', 'amamini', 'amantur']);
verb('amo, amare, amavi, amatus', 'imperativus.praesens.tu', 'ama');
verb('amo, amare, amavi, amatus', 'imperativus.praesens.vos', 'amate');
verb('amo, amare, amavi, amatus', 'formae.participiumPraesens', 'amans');
verb('amo, amare, amavi, amatus', 'formae.gerundivum', 'amandus');

// The second conjugation is spelled like the third without macrons, so the
// first principal part is what separates monēre from regere.
verb('moneo, monere, monui, monitus', 'indicativus.praesens', ['moneo', 'mones', 'monet', 'monemus', 'monetis', 'monent']);
verb('moneo, monere, monui, monitus', 'indicativus.futurum', ['monebo', 'monebis', 'monebit', 'monebimus', 'monebitis', 'monebunt']);
verb('moneo, monere, monui, monitus', 'coniunctivus.praesens', ['moneam', 'moneas', 'moneat', 'moneamus', 'moneatis', 'moneant']);
verb('moneo, monere, monui, monitus', 'formae.participiumPraesens', 'monens');
ok('monere is second conjugation', classify(parseParts('moneo, monere, monui, monitus')).conjugation === '2nd');
ok('regere is third conjugation', classify(parseParts('rego, regere, rexi, rectus')).conjugation === '3rd');

verb('rego, regere, rexi, rectus', 'indicativus.praesens', ['rego', 'regis', 'regit', 'regimus', 'regitis', 'regunt']);
verb('rego, regere, rexi, rectus', 'indicativus.imperfectum', ['regebam', 'regebas', 'regebat', 'regebamus', 'regebatis', 'regebant']);
verb('rego, regere, rexi, rectus', 'indicativus.futurum', ['regam', 'reges', 'reget', 'regemus', 'regetis', 'regent']);
verb('rego, regere, rexi, rectus', 'indicativus.praesensPassivum', ['regor', 'regeris', 'regitur', 'regimur', 'regimini', 'reguntur']);
verb('rego, regere, rexi, rectus', 'imperativus.praesens.tu', 'rege');
verb('rego, regere, rexi, rectus', 'formae.infinitivusPraesensPassivus', 'regi');
verb('rego, regere, rexi, rectus', 'formae.gerundivum', 'regendus');

verb('capio, capere, cepi, captus', 'indicativus.praesens', ['capio', 'capis', 'capit', 'capimus', 'capitis', 'capiunt']);
verb('capio, capere, cepi, captus', 'indicativus.imperfectum', ['capiebam', 'capiebas', 'capiebat', 'capiebamus', 'capiebatis', 'capiebant']);
verb('capio, capere, cepi, captus', 'indicativus.futurum', ['capiam', 'capies', 'capiet', 'capiemus', 'capietis', 'capient']);
verb('capio, capere, cepi, captus', 'formae.participiumPraesens', 'capiens');
verb('capio, capere, cepi, captus', 'formae.gerundivum', 'capiendus');

verb('audio, audire, audivi, auditus', 'indicativus.praesens', ['audio', 'audis', 'audit', 'audimus', 'auditis', 'audiunt']);
verb('audio, audire, audivi, auditus', 'indicativus.futurum', ['audiam', 'audies', 'audiet', 'audiemus', 'audietis', 'audient']);
verb('audio, audire, audivi, auditus', 'coniunctivus.praesens', ['audiam', 'audias', 'audiat', 'audiamus', 'audiatis', 'audiant']);
verb('audio, audire, audivi, auditus', 'formae.participiumPraesens', 'audiens');

// --- irregulars -------------------------------------------------------------
verb('sum', 'indicativus.praesens', ['sum', 'es', 'est', 'sumus', 'estis', 'sunt']);
verb('sum', 'indicativus.imperfectum', ['eram', 'eras', 'erat', 'eramus', 'eratis', 'erant']);
verb('sum', 'indicativus.futurum', ['ero', 'eris', 'erit', 'erimus', 'eritis', 'erunt']);
verb('sum', 'indicativus.perfectum', ['fui', 'fuisti', 'fuit', 'fuimus', 'fuistis', 'fuerunt']);
verb('sum', 'coniunctivus.praesens', ['sim', 'sis', 'sit', 'simus', 'sitis', 'sint']);
verb('sum', 'coniunctivus.imperfectum', ['essem', 'esses', 'esset', 'essemus', 'essetis', 'essent']);
verb('possum', 'indicativus.praesens', ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt']);
verb('possum', 'coniunctivus.praesens', ['possim', 'possis', 'possit', 'possimus', 'possitis', 'possint']);
verb('eo', 'indicativus.praesens', ['eo', 'is', 'it', 'imus', 'itis', 'eunt']);
verb('eo', 'indicativus.imperfectum', ['ibam', 'ibas', 'ibat', 'ibamus', 'ibatis', 'ibant']);
verb('fero', 'indicativus.praesens', ['fero', 'fers', 'fert', 'ferimus', 'fertis', 'ferunt']);
verb('fero', 'imperativus.praesens.tu', 'fer');
verb('volo', 'indicativus.praesens', ['volo', 'vis', 'vult', 'volumus', 'vultis', 'volunt']);
verb('nolo', 'imperativus.praesens.tu', 'noli');
verb('fio', 'indicativus.praesens', ['fio', 'fis', 'fit', 'fimus', 'fitis', 'fiunt']);
verb('fio', 'indicativus.perfectum', ['factus sum', 'factus es', 'factus est', 'factus sumus', 'factus estis', 'factus sunt']);
verb('do, dare, dedi, datus', 'indicativus.praesens', ['do', 'das', 'dat', 'damus', 'datis', 'dant']);

// Compounds inherit, but only across a real Latin prefix — otherwise *moneo*
// reads as mon- plus eo and conjugates as "monis, monit, moneunt".
verb('adsum', 'indicativus.praesens', ['adsum', 'ades', 'adest', 'adsumus', 'adestis', 'adsunt']);
verb('abeo', 'indicativus.praesens', ['abeo', 'abis', 'abit', 'abimus', 'abitis', 'abeunt']);
verb('redeo', 'coniunctivus.praesens', ['redeam', 'redeas', 'redeat', 'redeamus', 'redeatis', 'redeant']);
verb('refero', 'indicativus.praesens', ['refero', 'refers', 'refert', 'referimus', 'refertis', 'referunt']);
ok('moneo is not a compound of eo', conjugate('moneo, monere, monui, monitus').flags.derivedFrom === null);
ok('video is not a compound of eo', conjugate('video, videre, vidi, visus').table.indicativus.praesens.s2 === 'vides');
ok('sedeo is not a compound of eo', conjugate('sedeo, sedere, sedi, sessus').table.indicativus.praesens.s3 === 'sedet');

// --- deponents: passive in form, active in meaning -------------------------
verb('sequor, sequi, secutus', 'indicativus.praesens', ['sequor', 'sequeris', 'sequitur', 'sequimur', 'sequimini', 'sequuntur']);
verb('sequor, sequi, secutus', 'indicativus.perfectum', ['secutus sum', 'secutus es', 'secutus est', 'secutus sumus', 'secutus estis', 'secutus sunt']);
verb('sequor, sequi, secutus', 'coniunctivus.praesens', ['sequar', 'sequaris', 'sequatur', 'sequamur', 'sequamini', 'sequantur']);
verb('sequor, sequi, secutus', 'coniunctivus.imperfectum', ['sequerer', 'sequereris', 'sequeretur', 'sequeremur', 'sequeremini', 'sequerentur']);
verb('conor, conari, conatus', 'indicativus.praesens', ['conor', 'conaris', 'conatur', 'conamur', 'conamini', 'conantur']);
verb('morior, mori, mortuus', 'indicativus.praesens', ['morior', 'moreris', 'moritur', 'morimur', 'morimini', 'moriuntur']);
verb('patior, pati, passus', 'indicativus.praesens', ['patior', 'pateris', 'patitur', 'patimur', 'patimini', 'patiuntur']);
ok('a deponent has no separate passive', conjugate('sequor, sequi, secutus').table.indicativus.praesensPassivum.s1 === null);
ok('and sum has no passive at all', conjugate('sum').table.indicativus.praesensPassivum.s1 === null);

// --- the regular passive subjunctive, which is built on the stem -----------
verb('rego, regere, rexi, rectus', 'coniunctivus.praesensPassivum', ['regar', 'regaris', 'regatur', 'regamur', 'regamini', 'regantur']);
verb('rego, regere, rexi, rectus', 'coniunctivus.imperfectumPassivum', ['regerer', 'regereris', 'regeretur', 'regeremur', 'regeremini', 'regerentur']);

// --- rejection --------------------------------------------------------------
ok('a bare unknown lemma is refused', !conjugate('canis').ok);
ok('and says why', conjugate('canis').error === 'needs-principal-parts', conjugate('canis').error);
ok('a non-verb is refused', !conjugate('puella, puellae').ok);
ok('empty input is refused', !conjugate('').ok);

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} Latin engine checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} Latin engine checks passed`);
