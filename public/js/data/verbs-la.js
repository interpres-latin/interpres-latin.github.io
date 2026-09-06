/**
 * Latin verb data.
 *
 * A Latin verb is quoted by its principal parts, and everything is built from
 * them — which is why this file stores the parts rather than a stem:
 *
 *   amo, amare, amavi, amatus     1st   present stem ama-   perfect amav-
 *   moneo, monere, monui, monitus 2nd                mone-          monu-
 *   rego, regere, rexi, rectus    3rd                reg-           rex-
 *   capio, capere, cepi, captus   3rd -io            cap-           cep-
 *   audio, audire, audivi, auditus 4th               audi-          audiv-
 *
 * The second part gives the conjugation and the present stem, the third gives
 * the perfect stem, the fourth gives the supine stem that the passive and the
 * future participle are built on. A verb whose parts are known is fully
 * conjugable; one whose parts are not is not conjugable at all, which is
 * exactly why a Latin student learns them by heart.
 */

/**
 * The five tabs on the conjugation page.
 *
 * Keyed by name rather than by number because a JavaScript object puts
 * integer-like keys first whatever order they were written in, which would
 * have shuffled the third-io conjugation to the end of the row.
 */
export const MODEL_VERBS = {
  '1st': { verb: 'amo', parts: 'amo, amare, amavi, amatus', gloss: 'to love' },
  '2nd': { verb: 'moneo', parts: 'moneo, monere, monui, monitus', gloss: 'to warn, advise' },
  '3rd': { verb: 'rego', parts: 'rego, regere, rexi, rectus', gloss: 'to rule' },
  '3rd-io': { verb: 'capio', parts: 'capio, capere, cepi, captus', gloss: 'to take, capture' },
  '4th': { verb: 'audio', parts: 'audio, audire, audivi, auditus', gloss: 'to hear' },
};

/**
 * Verbs whose forms cannot be built from their parts.
 *
 * Every field is optional; anything absent is generated in the ordinary way.
 * The present system is where the irregularity almost always lives, so most
 * entries give only that and let the perfect and supine stems do their usual
 * work — *possum* has a perfectly regular *potui*.
 */
export const IRREGULARS = {
  sum: {
    without: ['gerundivum', 'gerundium'],
    parts: 'sum, esse, fui, futurus',
    praesens: ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'],
    imperfectum: ['eram', 'eras', 'erat', 'eramus', 'eratis', 'erant'],
    futurum: ['ero', 'eris', 'erit', 'erimus', 'eritis', 'erunt'],
    coniunctivusPraesens: ['sim', 'sis', 'sit', 'simus', 'sitis', 'sint'],
    coniunctivusImperfectum: ['essem', 'esses', 'esset', 'essemus', 'essetis', 'essent'],
    imperativus: ['es', 'este'],
    participiumPraesens: null,
    // sum has no passive at all, and no perfect participle.
    noPassive: true,
  },
  possum: {
    without: ['gerundivum', 'gerundium', 'participiumFuturum'],
    parts: 'possum, posse, potui',
    praesens: ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt'],
    imperfectum: ['poteram', 'poteras', 'poterat', 'poteramus', 'poteratis', 'poterant'],
    futurum: ['potero', 'poteris', 'poterit', 'poterimus', 'poteritis', 'poterunt'],
    coniunctivusPraesens: ['possim', 'possis', 'possit', 'possimus', 'possitis', 'possint'],
    coniunctivusImperfectum: ['possem', 'posses', 'posset', 'possemus', 'possetis', 'possent'],
    imperativus: [null, null],
    participiumPraesens: 'potens',
    noPassive: true,
  },
  eo: {
    parts: 'eo, ire, ivi, itus',
    praesens: ['eo', 'is', 'it', 'imus', 'itis', 'eunt'],
    imperfectum: ['ibam', 'ibas', 'ibat', 'ibamus', 'ibatis', 'ibant'],
    futurum: ['ibo', 'ibis', 'ibit', 'ibimus', 'ibitis', 'ibunt'],
    coniunctivusPraesens: ['eam', 'eas', 'eat', 'eamus', 'eatis', 'eant'],
    imperativus: ['i', 'ite'],
    participiumPraesens: 'iens',
  },
  fero: {
    parts: 'fero, ferre, tuli, latus',
    praesens: ['fero', 'fers', 'fert', 'ferimus', 'fertis', 'ferunt'],
    coniunctivusPraesens: ['feram', 'feras', 'ferat', 'feramus', 'feratis', 'ferant'],
    praesensPassivum: ['feror', 'ferris', 'fertur', 'ferimur', 'ferimini', 'feruntur'],
    // The short imperative is the point of the verb for a beginner: dic, duc, fac, fer.
    imperativus: ['fer', 'ferte'],
  },
  volo: {
    without: ['gerundivum', 'gerundium', 'participiumFuturum'],
    parts: 'volo, velle, volui',
    praesens: ['volo', 'vis', 'vult', 'volumus', 'vultis', 'volunt'],
    coniunctivusPraesens: ['velim', 'velis', 'velit', 'velimus', 'velitis', 'velint'],
    coniunctivusImperfectum: ['vellem', 'velles', 'vellet', 'vellemus', 'velletis', 'vellent'],
    imperativus: [null, null],
    participiumPraesens: 'volens',
    noPassive: true,
  },
  nolo: {
    without: ['gerundivum', 'gerundium', 'participiumFuturum'],
    parts: 'nolo, nolle, nolui',
    praesens: ['nolo', 'non vis', 'non vult', 'nolumus', 'non vultis', 'nolunt'],
    coniunctivusPraesens: ['nolim', 'nolis', 'nolit', 'nolimus', 'nolitis', 'nolint'],
    coniunctivusImperfectum: ['nollem', 'nolles', 'nollet', 'nollemus', 'nolletis', 'nollent'],
    imperativus: ['noli', 'nolite'],
    participiumPraesens: 'nolens',
    noPassive: true,
  },
  malo: {
    without: ['gerundivum', 'gerundium', 'participiumFuturum'],
    parts: 'malo, malle, malui',
    praesens: ['malo', 'mavis', 'mavult', 'malumus', 'mavultis', 'malunt'],
    coniunctivusPraesens: ['malim', 'malis', 'malit', 'malimus', 'malitis', 'malint'],
    coniunctivusImperfectum: ['mallem', 'malles', 'mallet', 'mallemus', 'malletis', 'mallent'],
    imperativus: [null, null],
    noPassive: true,
  },
  fio: {
    // Active in form for the present, but its perfect is *factus sum* — it is
    // the passive of facio doing double duty as a verb of its own.
    semiDeponent: true,
    parts: 'fio, fieri, factus',
    praesens: ['fio', 'fis', 'fit', 'fimus', 'fitis', 'fiunt'],
    coniunctivusPraesens: ['fiam', 'fias', 'fiat', 'fiamus', 'fiatis', 'fiant'],
    coniunctivusImperfectum: ['fierem', 'fieres', 'fieret', 'fieremus', 'fieretis', 'fierent'],
    imperativus: ['fi', 'fite'],
    noPassive: true,
  },
  do: {
    // The a is short throughout, so it conjugates like no other first-conjugation verb.
    parts: 'do, dare, dedi, datus',
    praesens: ['do', 'das', 'dat', 'damus', 'datis', 'dant'],
    coniunctivusImperfectum: ['darem', 'dares', 'daret', 'daremus', 'daretis', 'darent'],
    imperativus: ['da', 'date'],
  },
};

/** Bases whose irregularity is inherited by compounds: abeo, redeo, refero, adsum. */
export const PREFIXABLE = ['sum', 'eo', 'fero', 'volo', 'facio'];

/**
 * Verbs that are passive in form and active in meaning. They have only three
 * principal parts, the third being the perfect participle, and no active forms
 * at all — which is worth saying on the page rather than showing empty cells.
 */
export const DEPONENTS = new Set([
  'sequor', 'loquor', 'conor', 'hortor', 'miror', 'polliceor', 'vereor', 'patior',
  'egredior', 'ingredior', 'progredior', 'regredior', 'morior', 'orior', 'nascor',
  'proficiscor', 'utor', 'fruor', 'fungor', 'potior', 'vescor', 'adipiscor', 'nanciscor',
  'oblitus', 'obliviscor', 'reor', 'fateor', 'confiteor', 'tueor', 'medeor', 'arbitror',
  'imitor', 'moror', 'precor', 'testor', 'venor', 'comitor', 'consolor', 'cunctor',
]);

/** Search index: [principal parts, English gloss]. */
export const COMMON_VERBS = [
  ['sum, esse, fui, futurus', 'to be'],
  ['possum, posse, potui', 'to be able, can'],
  ['eo, ire, ivi, itus', 'to go'],
  ['fero, ferre, tuli, latus', 'to bring, carry, bear'],
  ['volo, velle, volui', 'to want, wish'],
  ['nolo, nolle, nolui', 'to not want, refuse'],
  ['malo, malle, malui', 'to prefer'],
  ['fio, fieri, factus', 'to become, be made, happen'],
  ['amo, amare, amavi, amatus', 'to love'],
  ['ambulo, ambulare, ambulavi, ambulatus', 'to walk'],
  ['clamo, clamare, clamavi, clamatus', 'to shout'],
  ['do, dare, dedi, datus', 'to give'],
  ['exspecto, exspectare, exspectavi, exspectatus', 'to wait for, expect'],
  ['festino, festinare, festinavi, festinatus', 'to hurry'],
  ['intro, intrare, intravi, intratus', 'to enter'],
  ['iuvo, iuvare, iuvi, iutus', 'to help, please'],
  ['laboro, laborare, laboravi, laboratus', 'to work'],
  ['lacrimo, lacrimare, lacrimavi, lacrimatus', 'to weep, cry'],
  ['laudo, laudare, laudavi, laudatus', 'to praise'],
  ['libero, liberare, liberavi, liberatus', 'to free'],
  ['narro, narrare, narravi, narratus', 'to tell, relate'],
  ['navigo, navigare, navigavi, navigatus', 'to sail'],
  ['neco, necare, necavi, necatus', 'to kill'],
  ['nuntio, nuntiare, nuntiavi, nuntiatus', 'to announce'],
  ['occupo, occupare, occupavi, occupatus', 'to seize'],
  ['oppugno, oppugnare, oppugnavi, oppugnatus', 'to attack'],
  ['paro, parare, paravi, paratus', 'to prepare'],
  ['porto, portare, portavi, portatus', 'to carry'],
  ['pugno, pugnare, pugnavi, pugnatus', 'to fight'],
  ['puto, putare, putavi, putatus', 'to think'],
  ['rogo, rogare, rogavi, rogatus', 'to ask'],
  ['saluto, salutare, salutavi, salutatus', 'to greet'],
  ['servo, servare, servavi, servatus', 'to save, protect'],
  ['specto, spectare, spectavi, spectatus', 'to look at, watch'],
  ['sto, stare, steti, status', 'to stand'],
  ['supero, superare, superavi, superatus', 'to overcome, surpass'],
  ['voco, vocare, vocavi, vocatus', 'to call'],
  ['habito, habitare, habitavi, habitatus', 'to live, dwell'],
  ['moneo, monere, monui, monitus', 'to warn, advise'],
  ['debeo, debere, debui, debitus', 'to owe, ought'],
  ['doceo, docere, docui, doctus', 'to teach'],
  ['taceo, tacere, tacui, tacitus', 'to be silent'],
  ['teneo, tenere, tenui, tentus', 'to hold'],
  ['terreo, terrere, terrui, territus', 'to frighten'],
  ['timeo, timere, timui', 'to fear'],
  ['video, videre, vidi, visus', 'to see'],
  ['moveo, movere, movi, motus', 'to move'],
  ['iubeo, iubere, iussi, iussus', 'to order'],
  ['maneo, manere, mansi, mansus', 'to remain, stay'],
  ['rideo, ridere, risi, risus', 'to laugh, smile'],
  ['respondeo, respondere, respondi, responsus', 'to reply'],
  ['sedeo, sedere, sedi, sessus', 'to sit'],
  ['habeo, habere, habui, habitus', 'to have, hold'],
  ['placeo, placere, placui, placitus', 'to please'],
  ['rego, regere, rexi, rectus', 'to rule'],
  ['ago, agere, egi, actus', 'to do, drive, discuss'],
  ['bibo, bibere, bibi', 'to drink'],
  ['cado, cadere, cecidi, casus', 'to fall'],
  ['canto, cantare, cantavi, cantatus', 'to sing'],
  ['cedo, cedere, cessi, cessus', 'to yield, withdraw'],
  ['claudo, claudere, clausi, clausus', 'to close, shut'],
  ['cognosco, cognoscere, cognovi, cognitus', 'to get to know, learn'],
  ['colo, colere, colui, cultus', 'to cultivate, worship'],
  ['consumo, consumere, consumpsi, consumptus', 'to consume, use up'],
  ['contendo, contendere, contendi, contentus', 'to hurry, strive, contend'],
  ['credo, credere, credidi, creditus', 'to believe, trust'],
  ['curro, currere, cucurri, cursus', 'to run'],
  ['dico, dicere, dixi, dictus', 'to say, speak'],
  ['discedo, discedere, discessi, discessus', 'to depart, leave'],
  ['disco, discere, didici', 'to learn'],
  ['duco, ducere, duxi, ductus', 'to lead'],
  ['emo, emere, emi, emptus', 'to buy'],
  ['gero, gerere, gessi, gestus', 'to carry on, wage, wear'],
  ['lego, legere, legi, lectus', 'to read, choose'],
  ['ludo, ludere, lusi, lusus', 'to play'],
  ['mitto, mittere, misi, missus', 'to send'],
  ['ostendo, ostendere, ostendi, ostentus', 'to show'],
  ['peto, petere, petivi, petitus', 'to seek, ask for, attack'],
  ['pono, ponere, posui, positus', 'to place, put'],
  ['quaero, quaerere, quaesivi, quaesitus', 'to search for, ask'],
  ['reddo, reddere, reddidi, redditus', 'to give back, return'],
  ['relinquo, relinquere, reliqui, relictus', 'to leave behind, abandon'],
  ['scribo, scribere, scripsi, scriptus', 'to write'],
  ['sumo, sumere, sumpsi, sumptus', 'to take up'],
  ['surgo, surgere, surrexi, surrectus', 'to rise, get up'],
  ['trado, tradere, tradidi, traditus', 'to hand over, hand down'],
  ['traho, trahere, traxi, tractus', 'to drag, draw'],
  ['vendo, vendere, vendidi, venditus', 'to sell'],
  ['vinco, vincere, vici, victus', 'to conquer'],
  ['vivo, vivere, vixi, victus', 'to live'],
  ['ago, agere, egi, actus', 'to do, drive'],
  ['capio, capere, cepi, captus', 'to take, capture'],
  ['accipio, accipere, accepi, acceptus', 'to accept, receive'],
  ['conspicio, conspicere, conspexi, conspectus', 'to catch sight of'],
  ['cupio, cupere, cupivi, cupitus', 'to desire, want'],
  ['facio, facere, feci, factus', 'to make, do'],
  ['fugio, fugere, fugi, fugitus', 'to flee'],
  ['iacio, iacere, ieci, iactus', 'to throw'],
  ['incipio, incipere, incepi, inceptus', 'to begin'],
  ['interficio, interficere, interfeci, interfectus', 'to kill'],
  ['rapio, rapere, rapui, raptus', 'to seize, snatch'],
  ['audio, audire, audivi, auditus', 'to hear, listen to'],
  ['advenio, advenire, adveni, adventus', 'to arrive'],
  ['aperio, aperire, aperui, apertus', 'to open'],
  ['convenio, convenire, conveni, conventus', 'to come together, meet'],
  ['custodio, custodire, custodivi, custoditus', 'to guard'],
  ['dormio, dormire, dormivi, dormitus', 'to sleep'],
  ['finio, finire, finivi, finitus', 'to finish, end'],
  ['impedio, impedire, impedivi, impeditus', 'to hinder, obstruct'],
  ['invenio, invenire, inveni, inventus', 'to find'],
  ['munio, munire, munivi, munitus', 'to fortify'],
  ['punio, punire, punivi, punitus', 'to punish'],
  ['scio, scire, scivi, scitus', 'to know'],
  ['sentio, sentire, sensi, sensus', 'to feel, perceive'],
  ['venio, venire, veni, ventus', 'to come'],
  ['abeo, abire, abii, abitus', 'to go away'],
  ['adeo, adire, adii, aditus', 'to approach'],
  ['exeo, exire, exii, exitus', 'to go out'],
  ['redeo, redire, redii, reditus', 'to return, go back'],
  ['adsum, adesse, adfui', 'to be present'],
  ['absum, abesse, afui', 'to be absent'],
  ['refero, referre, rettuli, relatus', 'to bring back, report'],
  ['sequor, sequi, secutus', 'to follow (deponent)'],
  ['loquor, loqui, locutus', 'to speak (deponent)'],
  ['conor, conari, conatus', 'to try (deponent)'],
  ['hortor, hortari, hortatus', 'to encourage, urge (deponent)'],
  ['progredior, progredi, progressus', 'to advance (deponent)'],
  ['egredior, egredi, egressus', 'to go out (deponent)'],
  ['morior, mori, mortuus', 'to die (deponent)'],
  ['nascor, nasci, natus', 'to be born (deponent)'],
  ['proficiscor, proficisci, profectus', 'to set out (deponent)'],
  ['patior, pati, passus', 'to suffer, allow (deponent)'],
  ['utor, uti, usus', 'to use (deponent, + ablative)'],
];
