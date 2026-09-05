/**
 * Verb data for the local conjugation engine.
 *
 * Three kinds of information live here:
 *   STEM_CHANGES  — verbs whose stressed stem vowel shifts (pensar → pienso).
 *   IRREGULARS    — verbs that need explicit forms or irregular stems.
 *   COMMON_VERBS  — the search index for the conjugator page.
 *
 * Orthographic changes (-car → -qué, -ger → -jo, -eer → -eyó …) are rules, not
 * data, and live in lib/conjugator.js.
 */

/** vowel shift applied to the stressed stem: 'e:ie' | 'o:ue' | 'e:i' | 'u:ue' | 'i:ie' | 'o:hue' | 'i:í' | 'u:ú' | 'uir' */
export const STEM_CHANGES = {};

function addStemChange(type, verbs) {
  for (const verb of verbs) STEM_CHANGES[verb] = type;
}

addStemChange('e:ie', [
  'acertar', 'alentar', 'apretar', 'ascender', 'atender', 'atravesar', 'calentar', 'cegar', 'cerrar',
  'comenzar', 'concernir', 'confesar', 'defender', 'descender', 'despertar', 'desterrar', 'empezar',
  'encender', 'encerrar', 'enmendar', 'entender', 'enterrar', 'extender', 'fregar', 'gobernar', 'helar',
  'manifestar', 'merendar', 'negar', 'nevar', 'pensar', 'perder', 'plegar', 'quebrar', 'recomendar',
  'regar', 'remendar', 'reventar', 'segar', 'sembrar', 'sentar', 'sosegar', 'temblar', 'tender',
  'tropezar', 'verter',
  // -ir verbs: these also take the weak e→i change (sentir → sintió, sintiendo)
  'advertir', 'arrepentir', 'consentir', 'convertir', 'diferir', 'digerir', 'discernir', 'divertir',
  'herir', 'hervir', 'invertir', 'mentir', 'preferir', 'presentir', 'referir', 'sentir', 'sugerir',
]);

addStemChange('o:ue', [
  'absolver', 'acordar', 'acostar', 'almorzar', 'apostar', 'aprobar', 'avergonzar', 'cocer', 'colgar',
  'comprobar', 'consolar', 'contar', 'costar', 'demostrar', 'descontar', 'devolver', 'doler', 'encontrar',
  'envolver', 'esforzar', 'forzar', 'llover', 'morder', 'mostrar', 'mover', 'poblar', 'probar', 'recordar',
  'renovar', 'resolver', 'revolver', 'rogar', 'soler', 'soltar', 'sonar', 'soñar', 'torcer', 'tostar',
  'volar', 'volcar', 'volver',
  // -ir verbs: weak o→u (dormir → durmió, durmiendo)
  'dormir', 'morir', 'podrir',
]);

addStemChange('e:i', [
  'ceñir', 'colegir', 'competir', 'conseguir', 'corregir', 'derretir', 'despedir', 'elegir', 'expedir',
  'gemir', 'henchir', 'impedir', 'medir', 'pedir', 'perseguir', 'regir', 'rendir', 'reñir', 'repetir',
  'seguir', 'servir', 'teñir', 'vestir',
]);

addStemChange('u:ue', ['jugar']);
addStemChange('i:ie', ['adquirir', 'inquirir']);
addStemChange('o:hue', ['oler']);

// Accent shift rather than a vowel change: enviar → envío, continuar → continúo.
addStemChange('i:í', [
  'ampliar', 'confiar', 'criar', 'desviar', 'enviar', 'espiar', 'esquiar', 'fiar', 'guiar', 'liar',
  'prohibir', 'resfriar', 'rociar', 'vaciar', 'variar',
]);
addStemChange('u:ú', [
  'acentuar', 'actuar', 'atenuar', 'continuar', 'efectuar', 'evaluar', 'graduar', 'habituar',
  'insinuar', 'perpetuar', 'reunir', 'situar',
]);

// -uir verbs insert a y before o/e/a: construir → construyo, construya, construyendo.
addStemChange('uir', [
  'atribuir', 'concluir', 'constituir', 'construir', 'contribuir', 'destruir', 'disminuir', 'distribuir',
  'excluir', 'huir', 'incluir', 'influir', 'instruir', 'intuir', 'obstruir', 'restituir', 'sustituir',
]);

/**
 * Explicit irregularities. Every field is optional:
 *   presente        full six-person present indicative
 *   presenteYo      irregular yo only; the rest is built from the stem
 *   presenteSubj    full present subjunctive (otherwise derived from presenteYo)
 *   imperfecto      full imperfect indicative (only ser, ir, ver)
 *   preterito       full preterite
 *   preteritoStem   strong preterite stem (tuv- → tuve, tuviste, …)
 *   preteritoOverrides  per-person patches on top of the generated preterite
 *   futuroStem      irregular future/conditional stem (tendr- → tendré, tendría)
 *   participio / gerundio / imperativoTu
 *   defectivo       persons that do not exist (weather verbs)
 */
export const IRREGULARS = {
  ser: {
    presente: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
    imperfecto: ['era', 'eras', 'era', 'éramos', 'erais', 'eran'],
    preterito: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    presenteSubj: ['sea', 'seas', 'sea', 'seamos', 'seáis', 'sean'],
    imperativoTu: 'sé',
  },
  estar: {
    presente: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
    preteritoStem: 'estuv',
    presenteSubj: ['esté', 'estés', 'esté', 'estemos', 'estéis', 'estén'],
    imperativoTu: 'está',
  },
  haber: {
    presente: ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
    preteritoStem: 'hub',
    futuroStem: 'habr',
    presenteSubj: ['haya', 'hayas', 'haya', 'hayamos', 'hayáis', 'hayan'],
    imperativoTu: 'he',
  },
  ir: {
    presente: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
    imperfecto: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
    preterito: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    presenteSubj: ['vaya', 'vayas', 'vaya', 'vayamos', 'vayáis', 'vayan'],
    gerundio: 'yendo',
    imperativoTu: 've',
  },
  ver: {
    presente: ['veo', 'ves', 've', 'vemos', 'veis', 'ven'],
    imperfecto: ['veía', 'veías', 'veía', 'veíamos', 'veíais', 'veían'],
    preterito: ['vi', 'viste', 'vio', 'vimos', 'visteis', 'vieron'],
    presenteSubj: ['vea', 'veas', 'vea', 'veamos', 'veáis', 'vean'],
    participio: 'visto',
  },
  dar: {
    presente: ['doy', 'das', 'da', 'damos', 'dais', 'dan'],
    preterito: ['di', 'diste', 'dio', 'dimos', 'disteis', 'dieron'],
    presenteSubj: ['dé', 'des', 'dé', 'demos', 'deis', 'den'],
  },
  tener: {
    presenteYo: 'tengo',
    stemChange: 'e:ie',
    preteritoStem: 'tuv',
    futuroStem: 'tendr',
    imperativoTu: 'ten',
  },
  venir: {
    presenteYo: 'vengo',
    stemChange: 'e:ie',
    preteritoStem: 'vin',
    futuroStem: 'vendr',
    gerundio: 'viniendo',
    imperativoTu: 'ven',
  },
  poner: {
    presenteYo: 'pongo',
    preteritoStem: 'pus',
    futuroStem: 'pondr',
    participio: 'puesto',
    imperativoTu: 'pon',
  },
  hacer: {
    presenteYo: 'hago',
    preteritoStem: 'hic',
    preteritoOverrides: { el: 'hizo' },
    futuroStem: 'har',
    participio: 'hecho',
    imperativoTu: 'haz',
  },
  decir: {
    presenteYo: 'digo',
    stemChange: 'e:i',
    preteritoStem: 'dij',
    futuroStem: 'dir',
    participio: 'dicho',
    gerundio: 'diciendo',
    imperativoTu: 'di',
  },
  poder: {
    stemChange: 'o:ue',
    preteritoStem: 'pud',
    futuroStem: 'podr',
    gerundio: 'pudiendo',
  },
  querer: { stemChange: 'e:ie', preteritoStem: 'quis', futuroStem: 'querr' },
  saber: {
    presenteYo: 'sé',
    preteritoStem: 'sup',
    futuroStem: 'sabr',
    presenteSubj: ['sepa', 'sepas', 'sepa', 'sepamos', 'sepáis', 'sepan'],
  },
  caber: { presenteYo: 'quepo', preteritoStem: 'cup', futuroStem: 'cabr' },
  salir: { presenteYo: 'salgo', futuroStem: 'saldr', imperativoTu: 'sal' },
  valer: { presenteYo: 'valgo', futuroStem: 'valdr' },
  traer: { presenteYo: 'traigo', preteritoStem: 'traj', gerundio: 'trayendo', participio: 'traído' },
  caer: { presenteYo: 'caigo' },
  oír: {
    presente: ['oigo', 'oyes', 'oye', 'oímos', 'oís', 'oyen'],
    presenteYo: 'oigo', // also seeds the subjunctive stem: oiga, oigamos
    imperativoTu: 'oye',
  },
  andar: { preteritoStem: 'anduv' },
  reír: {
    presente: ['río', 'ríes', 'ríe', 'reímos', 'reís', 'ríen'],
    preterito: ['reí', 'reíste', 'rio', 'reímos', 'reísteis', 'rieron'],
    presenteSubj: ['ría', 'rías', 'ría', 'riamos', 'riais', 'rían'],
    gerundio: 'riendo',
    participio: 'reído',
    imperativoTu: 'ríe',
  },
  freír: {
    presente: ['frío', 'fríes', 'fríe', 'freímos', 'freís', 'fríen'],
    preterito: ['freí', 'freíste', 'frio', 'freímos', 'freísteis', 'frieron'],
    presenteSubj: ['fría', 'frías', 'fría', 'friamos', 'friais', 'frían'],
    gerundio: 'friendo',
    participio: 'frito',
    imperativoTu: 'fríe',
  },
  erguir: {
    presente: ['yergo', 'yergues', 'yergue', 'erguimos', 'erguís', 'yerguen'],
    presenteSubj: ['yerga', 'yergas', 'yerga', 'irgamos', 'irgáis', 'yergan'],
    preterito: ['erguí', 'erguiste', 'irguió', 'erguimos', 'erguisteis', 'irguieron'],
    gerundio: 'irguiendo',
    imperativoTu: 'yergue',
  },
  errar: {
    presente: ['yerro', 'yerras', 'yerra', 'erramos', 'erráis', 'yerran'],
    presenteSubj: ['yerre', 'yerres', 'yerre', 'erremos', 'erréis', 'yerren'],
    imperativoTu: 'yerra',
  },
  bendecir: {
    presenteYo: 'bendigo',
    stemChange: 'e:i',
    preteritoStem: 'bendij',
    gerundio: 'bendiciendo',
    participio: 'bendecido',
    imperativoTu: 'bendice',
  },
  maldecir: {
    presenteYo: 'maldigo',
    stemChange: 'e:i',
    preteritoStem: 'maldij',
    gerundio: 'maldiciendo',
    participio: 'maldecido',
    imperativoTu: 'maldice',
  },
  satisfacer: {
    presenteYo: 'satisfago',
    preteritoStem: 'satisfic',
    preteritoOverrides: { el: 'satisfizo' },
    futuroStem: 'satisfar',
    participio: 'satisfecho',
    imperativoTu: 'satisfaz',
  },
  escribir: { participio: 'escrito' },
  abrir: { participio: 'abierto' },
  cubrir: { participio: 'cubierto' },
  romper: { participio: 'roto' },
  imprimir: { participio: 'impreso' },
  morir: { stemChange: 'o:ue', participio: 'muerto' },
  volver: { stemChange: 'o:ue', participio: 'vuelto' },
  resolver: { stemChange: 'o:ue', participio: 'resuelto' },
  absolver: { stemChange: 'o:ue', participio: 'absuelto' },
  llover: { stemChange: 'o:ue', defectivo: ['yo', 'tu', 'nosotros', 'vosotros'] },
  nevar: { stemChange: 'e:ie', defectivo: ['yo', 'tu', 'nosotros', 'vosotros'] },
  helar: { stemChange: 'e:ie', defectivo: ['yo', 'tu', 'nosotros', 'vosotros'] },
};

/**
 * Bases whose irregularity is inherited by prefixed derivatives
 * (obtener, componer, deshacer, describir …). Deliberately excludes ser, ir,
 * estar, haber and dar, whose "derivatives" are unrelated verbs.
 */
export const PREFIXABLE = [
  'tener', 'poner', 'venir', 'hacer', 'decir', 'traer', 'salir', 'valer', 'caer', 'poder',
  'querer', 'saber', 'caber', 'volver', 'escribir', 'cubrir', 'abrir', 'seguir', 'sentir', 'dormir',
  'morir', 'pedir', 'vestir', 'reír',
];

/** Model verbs shown on the conjugator's -ar / -er / -ir tabs. */
export const MODEL_VERBS = {
  ar: { verb: 'hablar', gloss: 'to speak' },
  er: { verb: 'comer', gloss: 'to eat' },
  ir: { verb: 'vivir', gloss: 'to live' },
};

/** Search index: [infinitive, English gloss]. */
export const COMMON_VERBS = [
  ['abrir', 'to open'], ['acabar', 'to finish'], ['aceptar', 'to accept'], ['acercar', 'to bring closer'],
  ['acompañar', 'to accompany'], ['aconsejar', 'to advise'], ['acordar', 'to agree'], ['acostar', 'to put to bed'],
  ['actuar', 'to act'], ['adivinar', 'to guess'], ['admitir', 'to admit'], ['adquirir', 'to acquire'],
  ['advertir', 'to warn'], ['afirmar', 'to state'], ['agradecer', 'to thank'], ['aguantar', 'to bear'],
  ['ahorrar', 'to save'], ['alcanzar', 'to reach'], ['almorzar', 'to have lunch'], ['alquilar', 'to rent'],
  ['amar', 'to love'], ['andar', 'to walk'], ['anunciar', 'to announce'], ['añadir', 'to add'],
  ['apagar', 'to turn off'], ['aparecer', 'to appear'], ['aprender', 'to learn'], ['apoyar', 'to support'],
  ['aprovechar', 'to make the most of'], ['apurar', 'to hurry'], ['arreglar', 'to fix'], ['asistir', 'to attend'],
  ['atender', 'to attend to'], ['atravesar', 'to cross'], ['aumentar', 'to increase'], ['avisar', 'to notify'],
  ['ayudar', 'to help'], ['bailar', 'to dance'], ['bajar', 'to go down'], ['bastar', 'to be enough'],
  ['beber', 'to drink'], ['bendecir', 'to bless'], ['besar', 'to kiss'], ['borrar', 'to erase'],
  ['brillar', 'to shine'], ['buscar', 'to look for'], ['caber', 'to fit'], ['caer', 'to fall'],
  ['calentar', 'to heat'], ['callar', 'to be quiet'], ['cambiar', 'to change'], ['caminar', 'to walk'],
  ['cansar', 'to tire'], ['cantar', 'to sing'], ['casar', 'to marry'], ['celebrar', 'to celebrate'],
  ['cenar', 'to have dinner'], ['cerrar', 'to close'], ['charlar', 'to chat'], ['cocinar', 'to cook'],
  ['coger', 'to take, to grab'], ['colgar', 'to hang'], ['comenzar', 'to begin'], ['comer', 'to eat'],
  ['compartir', 'to share'], ['competir', 'to compete'], ['comprar', 'to buy'], ['comprender', 'to understand'],
  ['comprobar', 'to check'], ['conducir', 'to drive'], ['confiar', 'to trust'], ['conocer', 'to know'],
  ['conseguir', 'to get'], ['considerar', 'to consider'], ['construir', 'to build'], ['contar', 'to count, to tell'],
  ['contestar', 'to answer'], ['continuar', 'to continue'], ['contribuir', 'to contribute'], ['convencer', 'to convince'],
  ['convertir', 'to convert'], ['corregir', 'to correct'], ['correr', 'to run'], ['cortar', 'to cut'],
  ['costar', 'to cost'], ['crear', 'to create'], ['crecer', 'to grow'], ['creer', 'to believe'],
  ['criticar', 'to criticise'], ['cruzar', 'to cross'], ['cuidar', 'to look after'], ['cumplir', 'to fulfil'],
  ['dar', 'to give'], ['deber', 'must, to owe'], ['decidir', 'to decide'], ['decir', 'to say'],
  ['dedicar', 'to dedicate'], ['defender', 'to defend'], ['dejar', 'to leave, to let'], ['depender', 'to depend'],
  ['descansar', 'to rest'], ['describir', 'to describe'], ['descubrir', 'to discover'], ['desear', 'to wish'],
  ['despedir', 'to say goodbye, to fire'], ['despertar', 'to wake up'], ['destruir', 'to destroy'], ['detener', 'to stop'],
  ['devolver', 'to give back'], ['dibujar', 'to draw'], ['dirigir', 'to direct'], ['discutir', 'to argue'],
  ['disfrutar', 'to enjoy'], ['distinguir', 'to distinguish'], ['divertir', 'to amuse'], ['doler', 'to hurt'],
  ['dormir', 'to sleep'], ['dudar', 'to doubt'], ['durar', 'to last'], ['echar', 'to throw'],
  ['elegir', 'to choose'], ['empezar', 'to begin'], ['emplear', 'to employ'], ['encantar', 'to delight'],
  ['encender', 'to light, to turn on'], ['encontrar', 'to find'], ['enseñar', 'to teach'], ['entender', 'to understand'],
  ['entrar', 'to enter'], ['entregar', 'to hand in'], ['enviar', 'to send'], ['equivocar', 'to mistake'],
  ['escoger', 'to choose'], ['esconder', 'to hide'], ['escribir', 'to write'], ['escuchar', 'to listen'],
  ['esperar', 'to wait, to hope'], ['establecer', 'to establish'], ['estar', 'to be'], ['estudiar', 'to study'],
  ['evitar', 'to avoid'], ['exigir', 'to demand'], ['existir', 'to exist'], ['explicar', 'to explain'],
  ['expresar', 'to express'], ['faltar', 'to be missing'], ['felicitar', 'to congratulate'], ['fijar', 'to fix'],
  ['firmar', 'to sign'], ['formar', 'to form'], ['freír', 'to fry'], ['fumar', 'to smoke'],
  ['funcionar', 'to work, to function'], ['ganar', 'to win, to earn'], ['gastar', 'to spend'], ['golpear', 'to hit'],
  ['gritar', 'to shout'], ['guardar', 'to keep'], ['gustar', 'to please'], ['haber', 'to have (auxiliary)'],
  ['hablar', 'to speak'], ['hacer', 'to do, to make'], ['hallar', 'to find'], ['huir', 'to flee'],
  ['imaginar', 'to imagine'], ['impedir', 'to prevent'], ['importar', 'to matter'], ['imprimir', 'to print'],
  ['incluir', 'to include'], ['indicar', 'to indicate'], ['informar', 'to inform'], ['insistir', 'to insist'],
  ['intentar', 'to try'], ['interesar', 'to interest'], ['introducir', 'to introduce'], ['invitar', 'to invite'],
  ['ir', 'to go'], ['jugar', 'to play'], ['juntar', 'to gather'], ['jurar', 'to swear'],
  ['lanzar', 'to throw'], ['lavar', 'to wash'], ['leer', 'to read'], ['levantar', 'to raise'],
  ['limpiar', 'to clean'], ['llamar', 'to call'], ['llegar', 'to arrive'], ['llenar', 'to fill'],
  ['llevar', 'to carry, to wear'], ['llorar', 'to cry'], ['llover', 'to rain'], ['lograr', 'to manage to'],
  ['luchar', 'to fight'], ['mandar', 'to send, to order'], ['manejar', 'to handle, to drive'], ['mantener', 'to keep'],
  ['marcar', 'to mark'], ['matar', 'to kill'], ['medir', 'to measure'], ['mejorar', 'to improve'],
  ['mentir', 'to lie'], ['merecer', 'to deserve'], ['meter', 'to put in'], ['mirar', 'to look at'],
  ['molestar', 'to bother'], ['montar', 'to ride, to assemble'], ['morir', 'to die'], ['mostrar', 'to show'],
  ['mover', 'to move'], ['nacer', 'to be born'], ['nadar', 'to swim'], ['navegar', 'to sail, to browse'],
  ['necesitar', 'to need'], ['negar', 'to deny'], ['nevar', 'to snow'], ['obligar', 'to force'],
  ['obtener', 'to obtain'], ['ocurrir', 'to happen'], ['ofrecer', 'to offer'], ['oír', 'to hear'],
  ['oler', 'to smell'], ['olvidar', 'to forget'], ['organizar', 'to organise'], ['pagar', 'to pay'],
  ['parar', 'to stop'], ['parecer', 'to seem'], ['participar', 'to take part'], ['pasar', 'to pass, to happen'],
  ['pedir', 'to ask for'], ['pegar', 'to stick, to hit'], ['peinar', 'to comb'], ['pensar', 'to think'],
  ['perder', 'to lose'], ['perdonar', 'to forgive'], ['permitir', 'to allow'], ['pertenecer', 'to belong'],
  ['pesar', 'to weigh'], ['pintar', 'to paint'], ['pisar', 'to step on'], ['planear', 'to plan'],
  ['poder', 'to be able to'], ['poner', 'to put'], ['practicar', 'to practise'], ['preferir', 'to prefer'],
  ['preguntar', 'to ask'], ['preocupar', 'to worry'], ['preparar', 'to prepare'], ['presentar', 'to present'],
  ['prestar', 'to lend'], ['probar', 'to try, to taste'], ['producir', 'to produce'], ['prohibir', 'to forbid'],
  ['prometer', 'to promise'], ['proponer', 'to propose'], ['proteger', 'to protect'], ['quebrar', 'to break'],
  ['quedar', 'to stay, to remain'], ['quejar', 'to complain'], ['quemar', 'to burn'], ['querer', 'to want, to love'],
  ['quitar', 'to remove'], ['realizar', 'to carry out'], ['recibir', 'to receive'], ['recoger', 'to pick up'],
  ['recomendar', 'to recommend'], ['reconocer', 'to recognise'], ['recordar', 'to remember'], ['reducir', 'to reduce'],
  ['regalar', 'to give as a gift'], ['regresar', 'to return'], ['reír', 'to laugh'], ['relajar', 'to relax'],
  ['repetir', 'to repeat'], ['resolver', 'to solve'], ['responder', 'to answer'], ['resultar', 'to turn out'],
  ['reunir', 'to gather'], ['revisar', 'to review'], ['robar', 'to steal'], ['rogar', 'to beg'],
  ['romper', 'to break'], ['saber', 'to know'], ['sacar', 'to take out'], ['salir', 'to leave, to go out'],
  ['saltar', 'to jump'], ['saludar', 'to greet'], ['satisfacer', 'to satisfy'], ['secar', 'to dry'],
  ['seguir', 'to follow, to continue'], ['sentar', 'to seat'], ['sentir', 'to feel'], ['señalar', 'to point out'],
  ['separar', 'to separate'], ['ser', 'to be'], ['servir', 'to serve'], ['significar', 'to mean'],
  ['soler', 'to usually do'], ['soltar', 'to let go'], ['sonar', 'to sound, to ring'], ['soñar', 'to dream'],
  ['sonreír', 'to smile'], ['soportar', 'to put up with'], ['subir', 'to go up'], ['suceder', 'to happen'],
  ['sufrir', 'to suffer'], ['sugerir', 'to suggest'], ['suponer', 'to suppose'], ['sustituir', 'to replace'],
  ['tardar', 'to take time'], ['temer', 'to fear'], ['tener', 'to have'], ['terminar', 'to finish'],
  ['tirar', 'to throw'], ['tocar', 'to touch, to play'], ['tomar', 'to take, to drink'], ['torcer', 'to twist'],
  ['trabajar', 'to work'], ['traducir', 'to translate'], ['traer', 'to bring'], ['tratar', 'to treat, to try'],
  ['unir', 'to join'], ['usar', 'to use'], ['utilizar', 'to use'], ['vaciar', 'to empty'],
  ['valer', 'to be worth'], ['vencer', 'to defeat'], ['vender', 'to sell'], ['venir', 'to come'],
  ['ver', 'to see'], ['vestir', 'to dress'], ['viajar', 'to travel'], ['vigilar', 'to watch over'],
  ['visitar', 'to visit'], ['vivir', 'to live'], ['volar', 'to fly'], ['volver', 'to return'],
];
