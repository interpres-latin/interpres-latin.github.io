/**
 * Reference forms for the French conjugation engine, checked against the
 * Bescherelle paradigms. Run with `npm test`.
 */
import { conjugate, PERSONS } from '../public/js/lib/conjugator-fr.js';

let checked = 0;
const failures = [];

function expect(verb, path, expected) {
  const result = conjugate(verb);
  if (!result.ok) {
    failures.push(`${verb} ${path}: engine error — ${result.error}`);
    return;
  }
  const actual = path.split('.').reduce((node, key) => node?.[key], result.table);
  const got = Array.isArray(expected)
    ? PERSONS.map((person) => actual?.[person]).join(', ')
    : actual;
  const want = Array.isArray(expected) ? expected.join(', ') : expected;
  checked += 1;
  if (got !== want) failures.push(`${verb} ${path}\n    expected: ${want}\n    actual:   ${got}`);
}

// --- the three regular models ---------------------------------------------
expect('parler', 'indicatif.present', ['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent']);
expect('parler', 'indicatif.imparfait', ['parlais', 'parlais', 'parlait', 'parlions', 'parliez', 'parlaient']);
expect('parler', 'indicatif.passeSimple', ['parlai', 'parlas', 'parla', 'parlâmes', 'parlâtes', 'parlèrent']);
expect('parler', 'indicatif.futur', ['parlerai', 'parleras', 'parlera', 'parlerons', 'parlerez', 'parleront']);
expect('parler', 'indicatif.conditionnel', ['parlerais', 'parlerais', 'parlerait', 'parlerions', 'parleriez', 'parleraient']);
expect('parler', 'indicatif.passeCompose', ['ai parlé', 'as parlé', 'a parlé', 'avons parlé', 'avez parlé', 'ont parlé']);
expect('parler', 'indicatif.plusQueParfait', ['avais parlé', 'avais parlé', 'avait parlé', 'avions parlé', 'aviez parlé', 'avaient parlé']);
expect('parler', 'indicatif.passeAnterieur', ['eus parlé', 'eus parlé', 'eut parlé', 'eûmes parlé', 'eûtes parlé', 'eurent parlé']);
expect('parler', 'indicatif.futurAnterieur', ['aurai parlé', 'auras parlé', 'aura parlé', 'aurons parlé', 'aurez parlé', 'auront parlé']);
expect('parler', 'subjonctif.present', ['parle', 'parles', 'parle', 'parlions', 'parliez', 'parlent']);
expect('parler', 'subjonctif.imparfait', ['parlasse', 'parlasses', 'parlât', 'parlassions', 'parlassiez', 'parlassent']);
expect('parler', 'subjonctif.passe', ['aie parlé', 'aies parlé', 'ait parlé', 'ayons parlé', 'ayez parlé', 'aient parlé']);
expect('parler', 'imperatif.affirmatif.tu', 'parle');
expect('parler', 'imperatif.negatif.tu', 'ne parle pas');
expect('parler', 'formes.participePresent', 'parlant');
expect('parler', 'formes.participePasse', 'parlé');
expect('parler', 'formes.infinitifPasse', 'avoir parlé');

expect('finir', 'indicatif.present', ['finis', 'finis', 'finit', 'finissons', 'finissez', 'finissent']);
expect('finir', 'indicatif.imparfait', ['finissais', 'finissais', 'finissait', 'finissions', 'finissiez', 'finissaient']);
expect('finir', 'indicatif.passeSimple', ['finis', 'finis', 'finit', 'finîmes', 'finîtes', 'finirent']);
expect('finir', 'indicatif.futur', ['finirai', 'finiras', 'finira', 'finirons', 'finirez', 'finiront']);
expect('finir', 'subjonctif.present', ['finisse', 'finisses', 'finisse', 'finissions', 'finissiez', 'finissent']);
expect('finir', 'subjonctif.imparfait', ['finisse', 'finisses', 'finît', 'finissions', 'finissiez', 'finissent']);
expect('finir', 'imperatif.affirmatif.tu', 'finis');
expect('finir', 'formes.participePresent', 'finissant');
expect('finir', 'formes.participePasse', 'fini');

expect('vendre', 'indicatif.present', ['vends', 'vends', 'vend', 'vendons', 'vendez', 'vendent']);
expect('vendre', 'indicatif.imparfait', ['vendais', 'vendais', 'vendait', 'vendions', 'vendiez', 'vendaient']);
expect('vendre', 'indicatif.passeSimple', ['vendis', 'vendis', 'vendit', 'vendîmes', 'vendîtes', 'vendirent']);
expect('vendre', 'indicatif.futur', ['vendrai', 'vendras', 'vendra', 'vendrons', 'vendrez', 'vendront']);
expect('vendre', 'subjonctif.present', ['vende', 'vendes', 'vende', 'vendions', 'vendiez', 'vendent']);
expect('vendre', 'imperatif.affirmatif.tu', 'vends');
expect('vendre', 'formes.participePasse', 'vendu');

// A stem already ending in d or t carries the third person alone; rompre adds a t.
expect('rompre', 'indicatif.present', ['romps', 'romps', 'rompt', 'rompons', 'rompez', 'rompent']);

// --- spelling that only preserves the sound --------------------------------
expect('manger', 'indicatif.present', ['mange', 'manges', 'mange', 'mangeons', 'mangez', 'mangent']);
expect('manger', 'indicatif.imparfait', ['mangeais', 'mangeais', 'mangeait', 'mangions', 'mangiez', 'mangeaient']);
expect('manger', 'indicatif.passeSimple', ['mangeai', 'mangeas', 'mangea', 'mangeâmes', 'mangeâtes', 'mangèrent']);
expect('manger', 'formes.participePresent', 'mangeant');
expect('commencer', 'indicatif.present', ['commence', 'commences', 'commence', 'commençons', 'commencez', 'commencent']);
expect('commencer', 'indicatif.imparfait', ['commençais', 'commençais', 'commençait', 'commencions', 'commenciez', 'commençaient']);
expect('commencer', 'indicatif.passeSimple', ['commençai', 'commenças', 'commença', 'commençâmes', 'commençâtes', 'commencèrent']);
expect('commencer', 'formes.participePresent', 'commençant');

// --- the mute-e stem changes ----------------------------------------------
expect('lever', 'indicatif.present', ['lève', 'lèves', 'lève', 'levons', 'levez', 'lèvent']);
expect('lever', 'indicatif.futur', ['lèverai', 'lèveras', 'lèvera', 'lèverons', 'lèverez', 'lèveront']);
expect('acheter', 'indicatif.present', ['achète', 'achètes', 'achète', 'achetons', 'achetez', 'achètent']);
expect('acheter', 'indicatif.futur', ['achèterai', 'achèteras', 'achètera', 'achèterons', 'achèterez', 'achèteront']);
expect('appeler', 'indicatif.present', ['appelle', 'appelles', 'appelle', 'appelons', 'appelez', 'appellent']);
expect('appeler', 'indicatif.futur', ['appellerai', 'appelleras', 'appellera', 'appellerons', 'appellerez', 'appelleront']);
expect('appeler', 'subjonctif.present', ['appelle', 'appelles', 'appelle', 'appelions', 'appeliez', 'appellent']);
expect('jeter', 'indicatif.present', ['jette', 'jettes', 'jette', 'jetons', 'jetez', 'jettent']);
expect('geler', 'indicatif.present', ['gèle', 'gèles', 'gèle', 'gelons', 'gelez', 'gèlent']);
// é keeps its accent right through the future, where e does not: préférerai.
expect('préférer', 'indicatif.present', ['préfère', 'préfères', 'préfère', 'préférons', 'préférez', 'préfèrent']);
expect('préférer', 'indicatif.futur', ['préférerai', 'préféreras', 'préférera', 'préférerons', 'préférerez', 'préféreront']);
expect('régler', 'indicatif.present', ['règle', 'règles', 'règle', 'réglons', 'réglez', 'règlent']);
// Two consonants after the e means no change at all — this is not "je rèste".
expect('rester', 'indicatif.present', ['reste', 'restes', 'reste', 'restons', 'restez', 'restent']);
expect('fermer', 'indicatif.present', ['ferme', 'fermes', 'ferme', 'fermons', 'fermez', 'ferment']);
expect('payer', 'indicatif.present', ['paie', 'paies', 'paie', 'payons', 'payez', 'paient']);
expect('payer', 'indicatif.futur', ['paierai', 'paieras', 'paiera', 'paierons', 'paierez', 'paieront']);
expect('employer', 'indicatif.present', ['emploie', 'emploies', 'emploie', 'employons', 'employez', 'emploient']);
expect('envoyer', 'indicatif.futur', ['enverrai', 'enverras', 'enverra', 'enverrons', 'enverrez', 'enverront']);

// --- the -ir verbs that are not second group ------------------------------
expect('partir', 'indicatif.present', ['pars', 'pars', 'part', 'partons', 'partez', 'partent']);
expect('dormir', 'indicatif.present', ['dors', 'dors', 'dort', 'dormons', 'dormez', 'dorment']);
expect('servir', 'indicatif.present', ['sers', 'sers', 'sert', 'servons', 'servez', 'servent']);
expect('sentir', 'subjonctif.present', ['sente', 'sentes', 'sente', 'sentions', 'sentiez', 'sentent']);
expect('ouvrir', 'indicatif.present', ['ouvre', 'ouvres', 'ouvre', 'ouvrons', 'ouvrez', 'ouvrent']);
expect('ouvrir', 'formes.participePasse', 'ouvert');
expect('ouvrir', 'imperatif.affirmatif.tu', 'ouvre');
expect('ouvrir', 'imperatif.negatif.tu', "n'ouvre pas");
expect('offrir', 'formes.participePasse', 'offert');
expect('cueillir', 'indicatif.futur', ['cueillerai', 'cueilleras', 'cueillera', 'cueillerons', 'cueillerez', 'cueilleront']);
expect('haïr', 'indicatif.present', ['hais', 'hais', 'hait', 'haïssons', 'haïssez', 'haïssent']);
expect('haïr', 'subjonctif.imparfait', ['haïsse', 'haïsses', 'haït', 'haïssions', 'haïssiez', 'haïssent']);

// --- the auxiliaries -------------------------------------------------------
expect('être', 'indicatif.present', ['suis', 'es', 'est', 'sommes', 'êtes', 'sont']);
expect('être', 'indicatif.imparfait', ['étais', 'étais', 'était', 'étions', 'étiez', 'étaient']);
expect('être', 'indicatif.passeSimple', ['fus', 'fus', 'fut', 'fûmes', 'fûtes', 'furent']);
expect('être', 'indicatif.futur', ['serai', 'seras', 'sera', 'serons', 'serez', 'seront']);
expect('être', 'subjonctif.present', ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient']);
expect('être', 'subjonctif.imparfait', ['fusse', 'fusses', 'fût', 'fussions', 'fussiez', 'fussent']);
expect('être', 'imperatif.affirmatif.tu', 'sois');
expect('être', 'formes.participePasse', 'été');
expect('avoir', 'indicatif.present', ['ai', 'as', 'a', 'avons', 'avez', 'ont']);
expect('avoir', 'indicatif.passeSimple', ['eus', 'eus', 'eut', 'eûmes', 'eûtes', 'eurent']);
expect('avoir', 'indicatif.futur', ['aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront']);
expect('avoir', 'subjonctif.present', ['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient']);
expect('avoir', 'subjonctif.imparfait', ['eusse', 'eusses', 'eût', 'eussions', 'eussiez', 'eussent']);
expect('avoir', 'imperatif.affirmatif.tu', 'aie');
expect('avoir', 'imperatif.negatif.tu', "n'aie pas");
expect('avoir', 'formes.participePresent', 'ayant');

// --- irregulars ------------------------------------------------------------
expect('aller', 'indicatif.present', ['vais', 'vas', 'va', 'allons', 'allez', 'vont']);
expect('aller', 'indicatif.futur', ['irai', 'iras', 'ira', 'irons', 'irez', 'iront']);
expect('aller', 'subjonctif.present', ['aille', 'ailles', 'aille', 'allions', 'alliez', 'aillent']);
expect('aller', 'imperatif.affirmatif.tu', 'va');
expect('faire', 'indicatif.present', ['fais', 'fais', 'fait', 'faisons', 'faites', 'font']);
expect('faire', 'indicatif.futur', ['ferai', 'feras', 'fera', 'ferons', 'ferez', 'feront']);
expect('faire', 'subjonctif.present', ['fasse', 'fasses', 'fasse', 'fassions', 'fassiez', 'fassent']);
expect('faire', 'indicatif.imparfait', ['faisais', 'faisais', 'faisait', 'faisions', 'faisiez', 'faisaient']);
expect('dire', 'indicatif.present', ['dis', 'dis', 'dit', 'disons', 'dites', 'disent']);
expect('pouvoir', 'indicatif.present', ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent']);
expect('pouvoir', 'subjonctif.present', ['puisse', 'puisses', 'puisse', 'puissions', 'puissiez', 'puissent']);
expect('pouvoir', 'imperatif.affirmatif.tu', null);
expect('vouloir', 'subjonctif.present', ['veuille', 'veuilles', 'veuille', 'voulions', 'vouliez', 'veuillent']);
expect('vouloir', 'imperatif.affirmatif.vous', 'veuillez');
expect('savoir', 'subjonctif.present', ['sache', 'saches', 'sache', 'sachions', 'sachiez', 'sachent']);
expect('savoir', 'imperatif.affirmatif.nous', 'sachons');
expect('savoir', 'formes.participePresent', 'sachant');
expect('voir', 'indicatif.futur', ['verrai', 'verras', 'verra', 'verrons', 'verrez', 'verront']);
expect('voir', 'subjonctif.present', ['voie', 'voies', 'voie', 'voyions', 'voyiez', 'voient']);
expect('venir', 'indicatif.passeSimple', ['vins', 'vins', 'vint', 'vînmes', 'vîntes', 'vinrent']);
expect('venir', 'subjonctif.imparfait', ['vinsse', 'vinsses', 'vînt', 'vinssions', 'vinssiez', 'vinssent']);
expect('prendre', 'indicatif.present', ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent']);
expect('prendre', 'formes.participePasse', 'pris');
expect('boire', 'indicatif.present', ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent']);
expect('boire', 'subjonctif.present', ['boive', 'boives', 'boive', 'buvions', 'buviez', 'boivent']);
expect('connaître', 'indicatif.present', ['connais', 'connais', 'connaît', 'connaissons', 'connaissez', 'connaissent']);
expect('mourir', 'indicatif.futur', ['mourrai', 'mourras', 'mourra', 'mourrons', 'mourrez', 'mourront']);
expect('courir', 'indicatif.futur', ['courrai', 'courras', 'courra', 'courrons', 'courrez', 'courront']);
expect('vivre', 'indicatif.passeSimple', ['vécus', 'vécus', 'vécut', 'vécûmes', 'vécûtes', 'vécurent']);
expect('croître', 'indicatif.passeSimple', ['crûs', 'crûs', 'crût', 'crûmes', 'crûtes', 'crûrent']);
expect('naître', 'indicatif.passeSimple', ['naquis', 'naquis', 'naquit', 'naquîmes', 'naquîtes', 'naquirent']);
expect('craindre', 'indicatif.present', ['crains', 'crains', 'craint', 'craignons', 'craignez', 'craignent']);
expect('vaincre', 'indicatif.present', ['vaincs', 'vaincs', 'vainc', 'vainquons', 'vainquez', 'vainquent']);
expect('recevoir', 'indicatif.present', ['reçois', 'reçois', 'reçoit', 'recevons', 'recevez', 'reçoivent']);
expect('valoir', 'subjonctif.present', ['vaille', 'vailles', 'vaille', 'valions', 'valiez', 'vaillent']);
expect('mouvoir', 'formes.participePasse', 'mû');

// --- the -uire family, which is a rule rather than a dozen entries ---------
expect('conduire', 'indicatif.present', ['conduis', 'conduis', 'conduit', 'conduisons', 'conduisez', 'conduisent']);
expect('traduire', 'indicatif.passeSimple', ['traduisis', 'traduisis', 'traduisit', 'traduisîmes', 'traduisîtes', 'traduisirent']);
expect('construire', 'formes.participePasse', 'construit');
expect('nuire', 'formes.participePasse', 'nui');
expect('cuire', 'subjonctif.present', ['cuise', 'cuises', 'cuise', 'cuisions', 'cuisiez', 'cuisent']);

// --- irregularity inherited by prefixed derivatives ------------------------
expect('comprendre', 'indicatif.present', ['comprends', 'comprends', 'comprend', 'comprenons', 'comprenez', 'comprennent']);
expect('comprendre', 'formes.participePasse', 'compris');
expect('permettre', 'formes.participePasse', 'permis');
expect('devenir', 'indicatif.futur', ['deviendrai', 'deviendras', 'deviendra', 'deviendrons', 'deviendrez', 'deviendront']);
expect('obtenir', 'indicatif.present', ['obtiens', 'obtiens', 'obtient', 'obtenons', 'obtenez', 'obtiennent']);
expect('découvrir', 'formes.participePasse', 'découvert');
expect('convaincre', 'indicatif.present', ['convaincs', 'convaincs', 'convainc', 'convainquons', 'convainquez', 'convainquent']);
expect('conquérir', 'indicatif.futur', ['conquerrai', 'conquerras', 'conquerra', 'conquerrons', 'conquerrez', 'conquerront']);
expect('conquérir', 'formes.participePasse', 'conquis');
// percevoir must not fall through to voir and come back as "je percevois".
expect('percevoir', 'indicatif.present', ['perçois', 'perçois', 'perçoit', 'percevons', 'percevez', 'perçoivent']);
expect('émouvoir', 'formes.participePasse', 'ému');
expect('repartir', 'indicatif.present', ['repars', 'repars', 'repart', 'repartons', 'repartez', 'repartent']);
expect('disparaître', 'formes.participePasse', 'disparu');

// --- the auxiliary, and agreement after être -------------------------------
expect('aller', 'indicatif.passeCompose', ['suis allé(e)', 'es allé(e)', 'est allé(e)', 'sommes allé(e)s', 'êtes allé(e)s', 'sont allé(e)s']);
expect('mourir', 'indicatif.passeCompose', ['suis mort(e)', 'es mort(e)', 'est mort(e)', 'sommes mort(e)s', 'êtes mort(e)s', 'sont mort(e)s']);
expect('finir', 'indicatif.passeCompose', ['ai fini', 'as fini', 'a fini', 'avons fini', 'avez fini', 'ont fini']);

const aux = (verb) => conjugate(verb).auxiliary;
for (const [verb, expected] of [['parler', 'avoir'], ['aller', 'être'], ['venir', 'être'], ['naître', 'être'],
  ['descendre', 'être'], ['finir', 'avoir'], ['être', 'avoir'], ['avoir', 'avoir'], ['se laver', 'être']]) {
  checked += 1;
  if (aux(verb) !== expected) failures.push(`${verb}: auxiliary should be ${expected}, got ${aux(verb)}`);
}

// --- impersonal verbs have only the third person singular ------------------
expect('pleuvoir', 'indicatif.present', [null, null, 'pleut', null, null, null]);
expect('falloir', 'indicatif.futur', [null, null, 'faudra', null, null, null]);
expect('falloir', 'imperatif.affirmatif.tu', null);

// --- pronominal input ------------------------------------------------------
const pronominal = conjugate('se lever');
checked += 1;
if (!pronominal.ok || !pronominal.pronominal || pronominal.table.indicatif.present.je !== 'lève') {
  failures.push(`se lever: expected the pronominal flag and "lève", got ${JSON.stringify(pronominal.table?.indicatif?.present?.je)}`);
}
expect('se lever', 'imperatif.affirmatif.tu', 'lève-toi');
expect('se lever', 'imperatif.negatif.vous', 'ne vous levez pas');
expect("s'appeler", 'indicatif.present', ['appelle', 'appelles', 'appelle', 'appelons', 'appelez', 'appellent']);

// --- rejection -------------------------------------------------------------
checked += 1;
if (conjugate('chien').ok) failures.push('chien: should be rejected, it is not an infinitive');
checked += 1;
if (conjugate('').ok) failures.push('empty input: should be rejected');

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} French conjugation checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} French conjugation checks passed`);
