/**
 * Interface language.
 *
 * Two axes meet here and they are not the same thing:
 *
 *   lib/study.js  — the language the site is *about*: Spanish, or French.
 *   this file     — the language of the *chrome*: the study language, or English.
 *
 * So the header switch reads ES | EN on the Spanish side and FR | EN on the
 * French one, and English is gated behind a passcode on both. Getting the
 * passcode wrong seals the whole page until the right one is entered.
 *
 * Switching subject takes the interface with it: the site speaks whatever it is
 * about. Latin included — turning the site Latin turns the chrome Latin, and
 * the reader can put it back to English from the same menu.
 *
 * Latin is still the exception on the passcode: neither side is gated. English
 * is the working language of a Latin classroom rather than a way round the
 * lesson, so there is nothing there to protect.
 *
 * Content the site is about never changes language: verb forms, dictionary
 * headwords, the subject pronouns in the tables. Only the chrome moves.
 *
 * There is one string table per study language rather than one table with a
 * third column, because the English half differs too — "Spanish questions are
 * free" and "French questions are free" are different sentences, and so is
 * every mention of the dictionary behind each side.
 */

import { studyLang } from './study.js';

const LANG_KEY = 'profegpt:lang';
const LOCK_KEY = 'profegpt:locked';

export const PASSCODE = '1206';

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked — the choice still applies for this visit.
  }
}

/** Whether the half that is not the study language costs a passcode. */
const GATED = { es: true, fr: true, la: false };

/** A subject's own language is the one its side of the site starts in. */
function defaultFor(study) {
  return study;
}

/** A stored choice only counts if it is one of the two on offer now. */
function settle(value) {
  const study = studyLang();
  return value === 'en' || value === study ? value : defaultFor(study);
}

let current = settle(read(LANG_KEY));

export function lang() {
  return current;
}

/** The two options the switch offers right now. */
export function languageOptions() {
  return [studyLang(), 'en'];
}

/** Whether switching away from the default needs the passcode. */
export function passcodeRequired() {
  return GATED[studyLang()] ?? true;
}

export function setLang(next) {
  current = settle(next === 'en' ? 'en' : studyLang());
  write(LANG_KEY, current);
  document.documentElement.lang = current;
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } }));
  return current;
}

/**
 * Follow a change of study language.
 *
 * The interface goes with the subject, unconditionally — switching to Latin
 * turns the site Latin. An earlier version kept English across the switch on
 * the grounds that the reader had paid a passcode for it, which meant choosing
 * a language and then not getting it. English is one click away in the menu.
 */
export function followStudyLanguage() {
  current = defaultFor(studyLang());
  write(LANG_KEY, current);
  document.documentElement.lang = current;
  return current;
}

export function isLocked() {
  return read(LOCK_KEY) === '1';
}

export function setLocked(locked) {
  write(LOCK_KEY, locked ? '1' : null);
}

export function checkPasscode(value) {
  return String(value ?? '').trim() === PASSCODE;
}

/** Look a string up, with {placeholders}. */
export function t(key, vars = null) {
  const table = STRINGS[studyLang()] ?? STRINGS.es;
  const entry = key.split('.').reduce((node, part) => node?.[part], table);
  let text = entry?.[current] ?? entry?.[studyLang()] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Pick the right half of an object that already carries both languages. */
export function pick(pair) {
  return pair?.[current] ?? pair?.[studyLang()] ?? pair?.en ?? '';
}

const two = (es, en) => ({ es, en });
const deux = (fr, en) => ({ fr, en });

const SPANISH = {
  nav: {
    translator: two('Traductor', 'Translator'),
    conjugation: two('Conjugación', 'Conjugation'),
    dictionary: two('Diccionario', 'Dictionary'),
    chat: two('Chat', 'Chat'),
    theme: two('Cambiar de tema', 'Switch theme'),
    menu: two('Abrir menú', 'Open menu'),
    langLabel: two('Idioma de la web', 'Site language'),
    subjectLabel: two('Idioma del sitio', 'Site subject'),
  },

  meta: {
    home: two('ProfeGPT', 'ProfeGPT'),
    skip: two('Saltar al contenido', 'Skip to content'),
    footer: two('definiciones del', 'definitions from the'),
    copyright: two('© Yuzhe (Julian) Chen 2026', '© Yuzhe (Julian) Chen 2026'),
    footerDict: two('Diccionario de la lengua española', 'Diccionario de la lengua española'),
    footerHref: two('https://dle.rae.es', 'https://dle.rae.es'),
    footerCredit: two(' (RAE)', ' (RAE)'),
  },

  hero: {
    badge: two('Español ↔ Inglés', 'Spanish ↔ English'),
    sub: two(
      'Traduce en los dos sentidos, conjuga cualquier verbo en todos los tiempos, consulta la RAE y pregunta lo que quieras. Todo en una página.',
      'Translate both ways, conjugate any verb in every tense, look words up in the RAE dictionary, and ask whatever you like. All on one page.',
    ),
    ctaTranslate: two('Probar el traductor', 'Try the translator'),
    ctaChat: two('Hablar con ProfeGPT', 'Talk to ProfeGPT'),
  },

  translator: {
    eyebrow: two('Traductor', 'Translator'),
    title: two('Los dos sentidos, un botón', 'Both directions, one button'),
    lead: two(
      'Escribe y traduce al instante. El botón central cambia de idioma y se lleva el texto consigo.',
      'Type and translate instantly. The centre button swaps the languages and carries the text across with it.',
    ),
    button: two('Traducir', 'Translate'),
    clear: two('Limpiar', 'Clear'),
    copy: two('Copiar', 'Copy'),
    copied: two('¡Copiado!', 'Copied'),
    copyFailed: two('No se pudo', 'Could not copy'),
    ready: two('Listo', 'Ready'),
    working: two('traduciendo…', 'translating…'),
    done: two('Traducido', 'Translated'),
    sourceLabel: two('Texto original', 'Source text'),
    swap: two('Intercambiar español e inglés', 'Swap Spanish and English'),
    swapTitle: two('Cambiar de idioma', 'Swap languages'),
    studyName: two('Español', 'Español'),
    englishName: two('English', 'English'),
    placeholderStudy: two('Escribe algo en español…', 'Escribe algo en español…'),
    placeholderEn: two('Type something in English…', 'Type something in English…'),
    outStudy: two('La traducción aparecerá aquí.', 'La traducción aparecerá aquí.'),
    outEn: two('The translation will appear here.', 'The translation will appear here.'),
    engine: two('traducido con {engine}', 'translated with {engine}'),
    uncertain: two(
      'El traductor no está seguro de esta frase: sus versiones guardadas no coinciden. Compruébala.',
      'The translator is unsure of this one: its stored versions disagree. Check it.'),
    unsureWord: two(
      'El traductor no conocía esta palabra y la dejó como estaba.',
      'The translator did not know this word and left it as it was.'),
    wordByWord: two(
      'Esto no es una frase: es el texto palabra por palabra, con la función de cada una. La gramática queda fuera del traductor — móntala tú.',
      'This is not a sentence — it is the text word by word, with what each one is doing. The grammar is beyond the translator; you assemble it.'),
    uncertainLatin: two(
      'Ningún motor traduce latín con fiabilidad. Esto viene de una memoria de traducción, no de la gramática del sitio: compruébalo palabra por palabra.',
      'No engine translates Latin reliably. This came from a translation memory rather than from the site’s own grammar — check it word by word.'),
  },

  finder: {
    eyebrow: two('Diccionario', 'Dictionary'),
    title: two('Busca una palabra', 'Look up a word'),
    lead: two(
      'Definiciones del Diccionario de la lengua española, acepción por acepción, con sinónimos y una frase de ejemplo.',
      'Definitions from the Diccionario de la lengua española, sense by sense, with synonyms and an example sentence.',
    ),
    button: two('Buscar', 'Search'),
    tryWith: two('Prueba con', 'Try'),
    note: two('Pulsa Enter para abrir la página del diccionario.', 'Press Enter to open the dictionary page.'),
    label: two('Buscar una palabra en el diccionario', 'Search for a word in the dictionary'),
    samples: two('sobremesa,madrugar,entrañable,friolero,estrenar', 'sobremesa,madrugar,entrañable,friolero,estrenar'),
  },

  features: {
    conjugation: two('Conjugación', 'Conjugation'),
    conjugationBody: two(
      'Todos los tiempos del indicativo, el subjuntivo y el imperativo, con los tres modelos -ar, -er e -ir y buscador de verbos.',
      'Every tense of the indicative, subjunctive and imperative, with the three -ar, -er and -ir models plus a verb search.',
    ),
    dictionary: two('Diccionario', 'Dictionary'),
    dictionaryBody: two(
      'Definiciones del Diccionario de la lengua española, con sinónimos y una frase de ejemplo por acepción.',
      'Definitions from the Diccionario de la lengua española, with synonyms and an example sentence per sense.',
    ),
    chat: two('Chat', 'Chat'),
    chatBody: two(
      'Un asistente para dudas de gramática, matices de vocabulario o cualquier otra cosa.',
      'An assistant for grammar questions, shades of vocabulary, or anything else.',
    ),
  },

  conjugator: {
    eyebrow: two('Conjugación', 'Conjugation'),
    title: two('Todos los tiempos, todos los verbos', 'Every tense, every verb'),
    lead: two(
      'Empieza por uno de los tres modelos regulares o busca el verbo que necesites. Las formas irregulares aparecen resaltadas.',
      'Start from one of the three regular models, or search for the verb you need. Irregular forms are highlighted.',
    ),
    tab: two('verbos -{ending}', '-{ending} verbs'),
    search: two('Buscar un verbo', 'Search a verb'),
    searchLabel: two('Buscar un verbo', 'Search for a verb'),
    highlight: two('Resaltar irregulares', 'Highlight irregulars'),
    notAVerb: two('No reconozco ese verbo', "I don't recognise that verb"),
    indicative: two('Indicativo', 'Indicative'),
    subjunctive: two('Subjuntivo', 'Subjunctive'),
    imperative: two('Imperativo', 'Imperative'),
    simple: two('Tiempos simples', 'Simple tenses'),
    compound: two('Tiempos compuestos', 'Compound tenses'),
    affirmative: two('Afirmativo', 'Affirmative'),
    negative: two('Negativo', 'Negative'),
    gerund: two('gerundio', 'gerund'),
    participle: two('participio', 'participle'),
    compoundInf: two('inf. compuesto', 'perfect inf.'),
    compoundGer: two('ger. compuesto', 'perfect ger.'),
    fullTable: two('Conjugación completa', 'Full conjugation'),
    verbClass: two('verbo -{ending}', '-{ending} verb'),
    irregular: two('irregular', 'irregular'),
    stemChange: two('cambio de raíz {change}', 'stem change {change}'),
    spelling: two('ortografía {change}', 'spelling {change}'),
    likeVerb: two('se conjuga como {verb}', 'conjugated like {verb}'),
    pronominal: two('pronominal · me / te / se', 'pronominal · me / te / se'),
    voseo: two('voseo {form}', 'voseo {form}'),
    fromRae: two('formas de la RAE', 'forms from the RAE'),
    generated: two('formas generadas', 'generated forms'),
    auxiliary: two('auxiliar {aux}', 'auxiliary {aux}'),
  },

  dictionary: {
    eyebrow: two('Diccionario', 'Dictionary'),
    title: two('Qué dice la RAE', 'What the RAE says'),
    lead: two(
      'Definiciones del Diccionario de la lengua española, con sus acepciones, sinónimos y una frase de ejemplo para cada sentido.',
      'Definitions from the Diccionario de la lengua española, with every sense, its synonyms, and an example sentence for each.',
    ),
    search: two('Buscar una palabra', 'Search a word'),
    button: two('Buscar', 'Search'),
    emptyTitle: two('Escribe una palabra', 'Type a word'),
    emptyBody: two(
      'Prueba con sobremesa, entrañable, madrugar o cualquier palabra que te haya llamado la atención.',
      'Try sobremesa, entrañable, madrugar, or any word that has caught your eye.',
    ),
    looking: two('Consultando el diccionario…', 'Looking it up…'),
    noResults: two('Sin resultados', 'No results'),
    didYouMean: two('¿Quisiste decir?', 'Did you mean?'),
    corrected: two('Buscando «{to}» — «{from}» no lleva tilde.', 'Showing “{to}” — “{from}” is missing its accent.'),
    seeOnRae: two('ver en dle.rae.es ↗', 'view on dle.rae.es ↗'),
    synonyms: two('Sinónimos', 'Synonyms'),
    antonyms: two('Antónimos', 'Antonyms'),
    locutions: two('Locuciones y expresiones', 'Phrases and expressions'),
    inUse: two('En uso', 'In use'),
    notRae: two(
      'El diccionario de la RAE no está disponible ahora mismo, así que estas definiciones vienen de Wiktionary, no de la RAE.',
      'The RAE dictionary is unavailable right now, so these definitions come from Wiktionary, not the RAE.',
    ),
    notAcademie: two('', ''),
    seeAuthority: two('', ''),
    speak: two('Escuchar la palabra', 'Hear the word'),
    speakFailed: two('No se pudo pronunciar.', 'Could not pronounce that.'),
    speakSpent: two('Se acabaron las pronunciaciones de este mes.', 'This month’s pronunciations are used up.'),
    templateNote: two(
      'Ejemplo de plantilla — configura una clave gratuita para generar frases reales.',
      'Template example — add a free API key to generate real sentences.',
    ),
  },

  chat: {
    title: two('Pregúntale a ProfeGPT', 'Ask ProfeGPT'),
    lead: two(
      'Conjugaciones, definiciones de la RAE, traducciones y explicaciones de gramática.',
      'Conjugations, RAE definitions, translations and grammar explanations.',
    ),
    placeholder: two('Pregunta lo que quieras…', 'Ask whatever you like…'),
    messageLabel: two('Mensaje', 'Message'),
    send: two('Enviar', 'Send'),
    you: two('TÚ', 'YOU'),
    enterHint: two('Enter para enviar · Shift + Enter para un salto de línea', 'Enter to send · Shift + Enter for a new line'),
    groundedOnly: two(
      'Respuestas del conjugador, la RAE y las fichas de gramática — sin conexión a ninguna IA',
      'Answers from the conjugator, the RAE and the grammar notes — no AI involved',
    ),
    withModel: two('Preguntas de español, ilimitadas · ', 'Spanish questions, unlimited · '),
    otherTopics: two('otros temas: ', 'other topics: '),
    perWindow: two(' cada {minutes} min', ' every {minutes} min'),
    failed: two('No pude responder: {error}', "I couldn't answer: {error}"),
    starters: two(
      'ser y estar|conjuga tener en subjuntivo|qué significa sobremesa|qué es «dijeron»|cómo se dice "I am tired" en español',
      'ser y estar|conjuga tener en subjuntivo|qué significa sobremesa|qué es «dijeron»|cómo se dice "I am tired" en español',
    ),
    needsKey: two(
      'Para las preguntas de otros temas hace falta un modelo. Añade una clave gratuita de Google AI Studio como `GEMINI_API_KEY` en tu archivo `.env` y reinicia el servidor; tendrás {limit} preguntas libres cada {minutes} minutos.',
      'Questions on other topics need a model. Add a free Google AI Studio key as `GEMINI_API_KEY` to your `.env` and restart the server; that gives you {limit} free questions every {minutes} minutes.',
    ),
  },

  tape: {
    quotaDetail: two(
      'Se acabaron las preguntas libres sobre otros temas. Vuelven dentro de unos {minutes} minutos.',
      'The free questions on other topics are used up. They come back in about {minutes} minutes.',
    ),
    quotaNote: two(
      'Las preguntas de español no gastan nada: conjugaciones, definiciones, traducciones y gramática siguen abiertas en el resto del sitio.',
      'Spanish questions cost nothing: conjugations, definitions, translations and grammar are still open across the rest of the site.',
    ),
    lockedTitle: two('Código incorrecto', 'Wrong passcode'),
    lockedDetail: two(
      'La versión en inglés está protegida. Introduce el código para continuar.',
      'The English version is protected. Enter the passcode to carry on.',
    ),
    lockedNote: two('Pregúntale a tu profe.', 'Ask your profe.'),
    passcodePlaceholder: two('Código', 'Passcode'),
    unlock: two('Desbloquear', 'Unlock'),
    wrongAgain: two('Sigue sin ser correcto.', 'Still not right.'),
  },

  lock: {
    title: two('Bloquear la web', 'Lock the site'),
    detail: two(
      'Con el código, la web queda bloqueada para todo el mundo hasta que alguien la desbloquee.',
      'With the passcode, the site is locked for everyone until someone unlocks it.',
    ),
    passcode: two('Código del profe', 'Teacher passcode'),
    lockNow: two('Bloquear', 'Lock'),
    wrong: two('Código incorrecto.', 'Wrong passcode.'),
    lockLabel: two('Bloquear la web', 'Lock the site'),
    unlockLabel: two('Desbloquear la web', 'Unlock the site'),
    sealedTitle: two('Clase en marcha', 'Class in session'),
    sealedDetail: two(
      'Un profe ha bloqueado la web. Introduce el código para desbloquearla.',
      'A teacher has locked the site. Enter the passcode to unlock it.',
    ),
    sealedNote: two('Se desbloquea para todos a la vez.', 'It unlocks for everyone at once.'),
  },

  quota: {
    understand: two('Lo entiendo', 'I understand'),
    spent: two('No te quedan preguntas', 'No questions left'),
    spentShort: two('Sin preguntas', 'No usage left'),
    stillFree: two('El español sigue siendo gratis', 'Spanish is still free'),
  },

  passcode: {
    title: two('Versión en inglés', 'English version'),
    detail: two(
      'Cambiar la web al inglés requiere un código.',
      'Switching the site to English requires a passcode.',
    ),
    cancel: two('Cancelar', 'Cancel'),
  },

  mode: {
    restricted: two('Tu profe ha dejado solo el español por ahora.', 'Your teacher has left only Spanish available for now.'),
  },
};

const FRENCH = {
  nav: {
    translator: deux('Traducteur', 'Translator'),
    conjugation: deux('Conjugaison', 'Conjugation'),
    dictionary: deux('Dictionnaire', 'Dictionary'),
    chat: deux('Chat', 'Chat'),
    theme: deux('Changer de thème', 'Switch theme'),
    menu: deux('Ouvrir le menu', 'Open menu'),
    langLabel: deux('Langue du site', 'Site language'),
    subjectLabel: deux('Sujet du site', 'Site subject'),
  },

  meta: {
    home: deux('ProfeGPT', 'ProfeGPT'),
    skip: deux('Aller au contenu', 'Skip to content'),
    footer: deux('définitions du', 'definitions from the'),
    copyright: deux('© Yuzhe (Julian) Chen 2026', '© Yuzhe (Julian) Chen 2026'),
    footerDict: deux('Wiktionnaire', 'Wiktionnaire'),
    footerHref: deux('https://fr.wiktionary.org', 'https://fr.wiktionary.org'),
    footerCredit: deux(' (CC BY-SA)', ' (CC BY-SA)'),
  },

  hero: {
    badge: deux('Français ↔ Anglais', 'French ↔ English'),
    sub: deux(
      'Traduisez dans les deux sens, conjuguez n’importe quel verbe à tous les temps, cherchez un mot et posez la question que vous voulez. Le tout sur une page.',
      'Translate both ways, conjugate any verb in every tense, look words up in the dictionary, and ask whatever you like. All on one page.',
    ),
    ctaTranslate: deux('Essayer le traducteur', 'Try the translator'),
    ctaChat: deux('Parler à ProfeGPT', 'Talk to ProfeGPT'),
  },

  translator: {
    eyebrow: deux('Traducteur', 'Translator'),
    title: deux('Les deux sens, un bouton', 'Both directions, one button'),
    lead: deux(
      'Écrivez et traduisez aussitôt. Le bouton central change de langue et emporte le texte avec lui.',
      'Type and translate instantly. The centre button swaps the languages and carries the text across with it.',
    ),
    button: deux('Traduire', 'Translate'),
    clear: deux('Effacer', 'Clear'),
    copy: deux('Copier', 'Copy'),
    copied: deux('Copié !', 'Copied'),
    copyFailed: deux('Échec', 'Could not copy'),
    ready: deux('Prêt', 'Ready'),
    working: deux('traduction…', 'translating…'),
    done: deux('Traduit', 'Translated'),
    sourceLabel: deux('Texte d’origine', 'Source text'),
    swap: deux('Intervertir le français et l’anglais', 'Swap French and English'),
    swapTitle: deux('Changer de langue', 'Swap languages'),
    studyName: deux('Français', 'Français'),
    englishName: deux('English', 'English'),
    placeholderStudy: deux('Écrivez quelque chose en français…', 'Écrivez quelque chose en français…'),
    placeholderEn: deux('Type something in English…', 'Type something in English…'),
    outStudy: deux('La traduction apparaîtra ici.', 'La traduction apparaîtra ici.'),
    outEn: deux('The translation will appear here.', 'The translation will appear here.'),
    engine: deux('traduit avec {engine}', 'translated with {engine}'),
    uncertain: deux(
      'Le traducteur hésite sur cette phrase : ses versions enregistrées se contredisent. À vérifier.',
      'The translator is unsure of this one: its stored versions disagree. Check it.'),
    unsureWord: deux(
      'Le traducteur ne connaissait pas ce mot et l’a laissé tel quel.',
      'The translator did not know this word and left it as it was.'),
    wordByWord: deux(
      'Ceci n’est pas une phrase : c’est le texte mot à mot, avec la fonction de chacun. La grammaire dépasse le traducteur — à vous de l’assembler.',
      'This is not a sentence — it is the text word by word, with what each one is doing. The grammar is beyond the translator; you assemble it.'),
    uncertainLatin: deux(
      'Aucun moteur ne traduit le latin de façon fiable. Ceci vient d’une mémoire de traduction, pas de la grammaire du site : vérifiez mot à mot.',
      'No engine translates Latin reliably. This came from a translation memory rather than from the site’s own grammar — check it word by word.'),
  },

  finder: {
    eyebrow: deux('Dictionnaire', 'Dictionary'),
    title: deux('Cherchez un mot', 'Look up a word'),
    lead: deux(
      'Définitions du Wiktionnaire, sens par sens, avec les synonymes et une phrase d’exemple.',
      'Definitions from the Wiktionnaire, sense by sense, with synonyms and an example sentence.',
    ),
    button: deux('Chercher', 'Search'),
    tryWith: deux('Essayez', 'Try'),
    note: deux('Appuyez sur Entrée pour ouvrir la page du dictionnaire.', 'Press Enter to open the dictionary page.'),
    label: deux('Chercher un mot dans le dictionnaire', 'Search for a word in the dictionary'),
    samples: deux('flâner,dépaysement,râler,chaleureux,bricoler', 'flâner,dépaysement,râler,chaleureux,bricoler'),
  },

  features: {
    conjugation: deux('Conjugaison', 'Conjugation'),
    conjugationBody: deux(
      'Tous les temps de l’indicatif, du subjonctif et de l’impératif, avec les trois modèles -er, -ir et -re et un moteur de recherche de verbes.',
      'Every tense of the indicative, subjunctive and imperative, with the three -er, -ir and -re models plus a verb search.',
    ),
    dictionary: deux('Dictionnaire', 'Dictionary'),
    dictionaryBody: deux(
      'Définitions du Wiktionnaire, avec les synonymes et une phrase d’exemple par sens.',
      'Definitions from the Wiktionnaire, with synonyms and an example sentence per sense.',
    ),
    chat: deux('Chat', 'Chat'),
    chatBody: deux(
      'Un assistant pour les questions de grammaire, les nuances de vocabulaire ou tout le reste.',
      'An assistant for grammar questions, shades of vocabulary, or anything else.',
    ),
  },

  conjugator: {
    eyebrow: deux('Conjugaison', 'Conjugation'),
    title: deux('Tous les temps, tous les verbes', 'Every tense, every verb'),
    lead: deux(
      'Commencez par l’un des trois modèles réguliers, ou cherchez le verbe dont vous avez besoin. Les formes irrégulières sont mises en évidence.',
      'Start from one of the three regular models, or search for the verb you need. Irregular forms are highlighted.',
    ),
    tab: deux('verbes en -{ending}', '-{ending} verbs'),
    search: deux('Chercher un verbe', 'Search a verb'),
    searchLabel: deux('Chercher un verbe', 'Search for a verb'),
    highlight: deux('Mettre en évidence les irrégularités', 'Highlight irregulars'),
    notAVerb: deux('Je ne reconnais pas ce verbe', "I don't recognise that verb"),
    indicative: deux('Indicatif', 'Indicative'),
    subjunctive: deux('Subjonctif', 'Subjunctive'),
    imperative: deux('Impératif', 'Imperative'),
    simple: deux('Temps simples', 'Simple tenses'),
    compound: deux('Temps composés', 'Compound tenses'),
    affirmative: deux('Affirmatif', 'Affirmative'),
    negative: deux('Négatif', 'Negative'),
    gerund: deux('participe présent', 'present participle'),
    participle: deux('participe passé', 'past participle'),
    compoundInf: deux('infinitif passé', 'perfect infinitive'),
    compoundGer: deux('participe composé', 'perfect participle'),
    fullTable: deux('Conjugaison complète', 'Full conjugation'),
    verbClass: deux('verbe en -{ending}', '-{ending} verb'),
    irregular: deux('irrégulier', 'irregular'),
    stemChange: deux('changement de radical {change}', 'stem change {change}'),
    spelling: deux('orthographe {change}', 'spelling {change}'),
    likeVerb: deux('se conjugue comme {verb}', 'conjugated like {verb}'),
    pronominal: deux('pronominal · me / te / se', 'pronominal · me / te / se'),
    voseo: deux('{form}', '{form}'),
    fromRae: deux('formes du dictionnaire', 'forms from the dictionary'),
    generated: deux('formes générées', 'generated forms'),
    auxiliary: deux('auxiliaire {aux}', 'auxiliary {aux}'),
  },

  dictionary: {
    eyebrow: deux('Dictionnaire', 'Dictionary'),
    title: deux('Ce que dit le dictionnaire', 'What the dictionary says'),
    lead: deux(
      'Définitions du Wiktionnaire, avec tous les sens, leurs synonymes et une phrase d’exemple pour chacun.',
      'Definitions from the Wiktionnaire, with every sense, its synonyms, and an example sentence for each.',
    ),
    search: deux('Chercher un mot', 'Search a word'),
    button: deux('Chercher', 'Search'),
    emptyTitle: deux('Écrivez un mot', 'Type a word'),
    emptyBody: deux(
      'Essayez flâner, dépaysement, râler, ou n’importe quel mot qui vous a intrigué.',
      'Try flâner, dépaysement, râler, or any word that has caught your eye.',
    ),
    looking: deux('Consultation du dictionnaire…', 'Looking it up…'),
    noResults: deux('Aucun résultat', 'No results'),
    didYouMean: deux('Vouliez-vous dire ?', 'Did you mean?'),
    corrected: deux('Résultat pour « {to} » — « {from} » manque son accent.', 'Showing “{to}” — “{from}” is missing its accent.'),
    seeOnRae: deux('voir sur fr.wiktionary.org ↗', 'view on fr.wiktionary.org ↗'),
    synonyms: deux('Synonymes', 'Synonyms'),
    antonyms: deux('Antonymes', 'Antonyms'),
    locutions: deux('Locutions et expressions', 'Phrases and expressions'),
    inUse: deux('En usage', 'In use'),
    notRae: deux(
      'Le Wiktionnaire n’est pas joignable pour le moment.',
      'The Wiktionnaire is unavailable right now.',
    ),
    // The Académie française publishes no API, so this side says where its
    // definitions really come from rather than implying an authority it has not got.
    notAcademie: deux(
      'L’Académie française ne publie pas d’interface de consultation, donc ces définitions viennent du Wiktionnaire. L’article de l’Académie est à un clic.',
      'The Académie française publishes no API, so these definitions come from the Wiktionnaire. The Académie’s own entry is one click away.',
    ),
    seeAuthority: deux('voir à l’Académie française ↗', 'view at the Académie française ↗'),
    speak: deux('Écouter le mot', 'Hear the word'),
    speakFailed: deux('Impossible de prononcer.', 'Could not pronounce that.'),
    speakSpent: deux('Les prononciations de ce mois-ci sont épuisées.', 'This month’s pronunciations are used up.'),
    templateNote: deux(
      'Exemple type — ajoutez une clé gratuite pour générer de vraies phrases.',
      'Template example — add a free API key to generate real sentences.',
    ),
  },

  chat: {
    title: deux('Demandez à ProfeGPT', 'Ask ProfeGPT'),
    lead: deux(
      'Conjugaisons, définitions, traductions et explications de grammaire.',
      'Conjugations, definitions, translations and grammar explanations.',
    ),
    placeholder: deux('Posez la question que vous voulez…', 'Ask whatever you like…'),
    messageLabel: deux('Message', 'Message'),
    send: deux('Envoyer', 'Send'),
    you: deux('VOUS', 'YOU'),
    enterHint: deux('Entrée pour envoyer · Maj + Entrée pour un retour à la ligne', 'Enter to send · Shift + Enter for a new line'),
    groundedOnly: deux(
      'Réponses du conjugueur, du dictionnaire et des fiches de grammaire — sans aucune IA',
      'Answers from the conjugator, the dictionary and the grammar notes — no AI involved',
    ),
    withModel: deux('Questions de français, illimitées · ', 'French questions, unlimited · '),
    otherTopics: deux('autres sujets : ', 'other topics: '),
    perWindow: deux(' toutes les {minutes} min', ' every {minutes} min'),
    failed: deux('Je n’ai pas pu répondre : {error}', "I couldn't answer: {error}"),
    starters: deux(
      'être et avoir|conjugue prendre au subjonctif|que veut dire flâner|c’est quoi « vinrent »|comment dit-on "I am tired" en français',
      'être et avoir|conjugue prendre au subjonctif|que veut dire flâner|c’est quoi « vinrent »|comment dit-on "I am tired" en français',
    ),
    needsKey: deux(
      'Les questions sur d’autres sujets ont besoin d’un modèle. Ajoutez une clé gratuite de Google AI Studio sous le nom `GEMINI_API_KEY` dans votre fichier `.env` et redémarrez le serveur ; vous aurez {limit} questions libres toutes les {minutes} minutes.',
      'Questions on other topics need a model. Add a free Google AI Studio key as `GEMINI_API_KEY` to your `.env` and restart the server; that gives you {limit} free questions every {minutes} minutes.',
    ),
  },

  tape: {
    quotaDetail: deux(
      'Les questions libres sur d’autres sujets sont épuisées. Elles reviennent dans une vingtaine de minutes — {minutes} pour être exact.',
      'The free questions on other topics are used up. They come back in about {minutes} minutes.',
    ),
    quotaNote: deux(
      'Les questions de français ne coûtent rien : conjugaisons, définitions, traductions et grammaire restent ouvertes partout ailleurs sur le site.',
      'French questions cost nothing: conjugations, definitions, translations and grammar are still open across the rest of the site.',
    ),
    lockedTitle: deux('Code incorrect', 'Wrong passcode'),
    lockedDetail: deux(
      'La version anglaise est protégée. Entrez le code pour continuer.',
      'The English version is protected. Enter the passcode to carry on.',
    ),
    lockedNote: deux('Demandez à votre professeur.', 'Ask your profe.'),
    passcodePlaceholder: deux('Code', 'Passcode'),
    unlock: deux('Débloquer', 'Unlock'),
    wrongAgain: deux('Toujours pas.', 'Still not right.'),
  },

  lock: {
    title: deux('Verrouiller le site', 'Lock the site'),
    detail: deux(
      'Avec le code, le site est verrouillé pour tout le monde jusqu’à ce que quelqu’un le déverrouille.',
      'With the passcode, the site is locked for everyone until someone unlocks it.',
    ),
    passcode: deux('Code du professeur', 'Teacher passcode'),
    lockNow: deux('Verrouiller', 'Lock'),
    wrong: deux('Code incorrect.', 'Wrong passcode.'),
    lockLabel: deux('Verrouiller le site', 'Lock the site'),
    unlockLabel: deux('Déverrouiller le site', 'Unlock the site'),
    sealedTitle: deux('Cours en cours', 'Class in session'),
    sealedDetail: deux(
      'Un professeur a verrouillé le site. Entrez le code pour le déverrouiller.',
      'A teacher has locked the site. Enter the passcode to unlock it.',
    ),
    sealedNote: deux('Il se déverrouille pour tout le monde à la fois.', 'It unlocks for everyone at once.'),
  },

  quota: {
    understand: deux('J’ai compris', 'I understand'),
    spent: deux('Plus de questions', 'No questions left'),
    spentShort: deux('Plus rien', 'No usage left'),
    stillFree: deux('Le français reste gratuit', 'French is still free'),
  },

  passcode: {
    title: deux('Version anglaise', 'English version'),
    detail: deux(
      'Passer le site en anglais demande un code.',
      'Switching the site to English requires a passcode.',
    ),
    cancel: deux('Annuler', 'Cancel'),
  },

  mode: {
    restricted: deux('Votre professeur n’a laissé que l’espagnol pour le moment.', 'Your teacher has left only Spanish available for now.'),
  },
};

const latine = (la, en) => ({ la, en });

/**
 * The Latin pack.
 *
 * The Latin is real Latin where Latin has a word for the thing, and a
 * respectable coinage where it does not — *colloquium* for the chat, *stadia*
 * for the course's stages. It is a curiosity to opt into rather than the
 * default, which is why nothing important depends on reading it.
 *
 * Two sections here have no counterpart in the other packs, because two pages
 * do not exist elsewhere: the declension tables and the stage vocabulary.
 */
const LATIN = {
  nav: {
    translator: latine('Interpres', 'Translator'),
    conjugation: latine('Coniugatio', 'Conjugation'),
    declension: latine('Declinatio', 'Declension'),
    stages: latine('Stadia', 'Stages'),
    dictionary: latine('Lexicon', 'Dictionary'),
    chat: latine('Colloquium', 'Chat'),
    theme: latine('Mutare speciem', 'Switch theme'),
    menu: latine('Aperire indicem', 'Open menu'),
    langLabel: latine('Lingua paginae', 'Site language'),
    subjectLabel: latine('Materia paginae', 'Site subject'),
  },

  meta: {
    home: latine('ProfeGPT', 'ProfeGPT'),
    skip: latine('Ad contenta', 'Skip to content'),
    footer: latine('significationes ex', 'definitions from'),
    copyright: latine('© Yuzhe (Julian) Chen 2026', '© Yuzhe (Julian) Chen 2026'),
    footerDict: latine('Whitaker’s Words', 'Whitaker’s Words'),
    footerHref: latine('https://mk270.github.io/whitakers-words/', 'https://mk270.github.io/whitakers-words/'),
    footerCredit: latine(' (in publico)', ' (public domain)'),
  },

  hero: {
    badge: latine('Latine ↔ Anglice', 'Latin ↔ English'),
    sub: latine(
      'Verte in utramque partem, coniuga omnia verba, declina omnia nomina, quaere in lexico, et roga quod vis. Omnia in una pagina.',
      'Translate both ways, conjugate every verb, decline every noun, look words up, and ask whatever you like. All on one page.',
    ),
    ctaTranslate: latine('Interpretem probare', 'Try the translator'),
    ctaChat: latine('Cum ProfeGPT loqui', 'Talk to ProfeGPT'),
  },

  translator: {
    eyebrow: latine('Interpres', 'Translator'),
    title: latine('Utraque pars, unus nodus', 'Both directions, one button'),
    lead: latine(
      'Scribe et statim verte. Nodus medius linguas permutat et textum secum fert. Omnia verba Latina per Whitaker’s Words probantur.',
      'Type and translate instantly. The centre button swaps the languages and carries the text across. Every Latin word is checked against Whitaker’s Words.',
    ),
    button: latine('Vertere', 'Translate'),
    clear: latine('Delere', 'Clear'),
    copy: latine('Exscribere', 'Copy'),
    copied: latine('Exscriptum!', 'Copied'),
    copyFailed: latine('Non potuit', 'Could not copy'),
    ready: latine('Paratus', 'Ready'),
    working: latine('vertens…', 'translating…'),
    done: latine('Versum', 'Translated'),
    sourceLabel: latine('Textus originalis', 'Source text'),
    swap: latine('Permutare Latinum et Anglicum', 'Swap Latin and English'),
    swapTitle: latine('Mutare linguam', 'Swap languages'),
    studyName: latine('Latine', 'Latin'),
    englishName: latine('English', 'English'),
    placeholderStudy: latine('Scribe aliquid Latine…', 'Write something in Latin…'),
    placeholderEn: latine('Type something in English…', 'Type something in English…'),
    outStudy: latine('Translatio hic apparebit.', 'The translation will appear here.'),
    outEn: latine('The translation will appear here.', 'The translation will appear here.'),
    engine: latine('versum per {engine}', 'translated with {engine}'),
    uncertain: latine(
      'Interpres dubitat: versiones servatae inter se discrepant. Cave.',
      'The translator is unsure of this one: its stored versions disagree. Check it.'),
    unsureWord: latine(
      'Interpres hoc verbum non novit et intactum reliquit.',
      'The translator did not know this word and left it as it was.'),
    wordByWord: latine(
      'Haec sententia non est: verbum de verbo, cum munere cuiusque. Grammatica interpretem superat — tu compone.',
      'This is not a sentence — it is the text word by word, with what each one is doing. The grammar is beyond the translator; you assemble it.'),
    uncertainLatin: latine(
      'Nulla machina Latine fideliter vertit. Hoc ex memoria versionum venit, non ex grammatica huius situs — verbum de verbo cave.',
      'No engine translates Latin reliably. This came from a translation memory rather than from the site’s own grammar — check it word by word.'),
    parseTitle: latine('Verbum ac verbum', 'Word by word'),
    parseLead: latine(
      'Omne verbum Latinum, ut Whitaker’s Words id legit.',
      'Every Latin word, as Whitaker’s Words reads it.',
    ),
    parseUnknown: latine('non agnitum', 'not recognised'),
    caseFixed: latine('casus correctus', 'case corrected'),
  },

  finder: {
    eyebrow: latine('Lexicon', 'Dictionary'),
    title: latine('Quaere verbum', 'Look up a word'),
    lead: latine(
      'Whitaker’s Words dat verbum principale cum partibus principalibus, et quomodo forma quam quaeris legenda sit.',
      'Whitaker’s Words gives the headword with its principal parts, and how the form you looked up has to be read.',
    ),
    button: latine('Quaerere', 'Search'),
    tryWith: latine('Proba', 'Try'),
    note: latine('Preme Enter ut paginam lexici aperias.', 'Press Enter to open the dictionary page.'),
    label: latine('Quaerere verbum in lexico', 'Search for a word in the dictionary'),
    samples: latine('canem,puellae,rexit,urbium,amavissent', 'canem,puellae,rexit,urbium,amavissent'),
  },

  features: {
    conjugation: latine('Coniugatio', 'Conjugation'),
    conjugationBody: latine(
      'Omnia tempora indicativi, coniunctivi et imperativi, activa et passiva, cum quinque coniugationibus.',
      'Every tense of the indicative, subjunctive and imperative, active and passive, across the five conjugations.',
    ),
    declension: latine('Declinatio', 'Declension'),
    declensionBody: latine(
      'Quinque declinationes nominum et adiectiva, omni casu et numero.',
      'The five noun declensions and the adjectives, in every case and number.',
    ),
    dictionary: latine('Lexicon', 'Dictionary'),
    dictionaryBody: latine(
      'Whitaker’s Words: partes principales, genus, declinatio, et omnis lectio formae.',
      'Whitaker’s Words: principal parts, gender, declension, and every reading of the form.',
    ),
    chat: latine('Colloquium', 'Chat'),
    chatBody: latine(
      'Adiutor grammaticae, vocabulorum, et ceterorum. Anglice respondet.',
      'An assistant for grammar, vocabulary and anything else. It answers in English.',
    ),
    stages: latine('Stadia', 'Stages'),
    stagesBody: latine(
      'Vocabula omnium stadiorum Cambridge Latin Course, libri primi.',
      'The vocabulary of every stage of the Cambridge Latin Course, Book I.',
    ),
  },

  conjugator: {
    eyebrow: latine('Coniugatio', 'Conjugation'),
    title: latine('Omnia tempora, omnia verba', 'Every tense, every verb'),
    lead: latine(
      'Incipe ab una quinque coniugationum, aut quaere verbum. Verbum Latinum partibus principalibus coniugatur — sine iis coniugari non potest.',
      'Start from one of the five conjugations, or search for a verb. A Latin verb is conjugated from its principal parts — without them it cannot be conjugated at all.',
    ),
    tab: latine('coniugatio {ending}', '{ending} conjugation'),
    search: latine('Quaerere verbum', 'Search a verb'),
    searchLabel: latine('Quaerere verbum', 'Search for a verb'),
    highlight: latine('Notare irregularia', 'Highlight irregulars'),
    notAVerb: latine('Hoc verbum non agnosco', "I don't recognise that verb"),
    indicative: latine('Indicativus', 'Indicative'),
    subjunctive: latine('Coniunctivus', 'Subjunctive'),
    imperative: latine('Imperativus', 'Imperative'),
    simple: latine('Activum', 'Active'),
    compound: latine('Passivum', 'Passive'),
    affirmative: latine('Affirmativus', 'Affirmative'),
    negative: latine('Negativus', 'Negative'),
    gerund: latine('participium praesens', 'present participle'),
    participle: latine('participium perfectum', 'perfect participle'),
    compoundInf: latine('gerundivum', 'gerundive'),
    compoundGer: latine('supinum', 'supine'),
    fullTable: latine('Tabula plena', 'Full conjugation'),
    verbClass: latine('coniugatio {ending}', '{ending} conjugation'),
    irregular: latine('irregulare', 'irregular'),
    stemChange: latine('{change}', '{change}'),
    spelling: latine('{change}', '{change}'),
    likeVerb: latine('compositum ex {verb}', 'compound of {verb}'),
    pronominal: latine('deponens', 'deponent'),
    voseo: latine('{form}', '{form}'),
    fromRae: latine('formae probatae', 'checked forms'),
    generated: latine('formae generatae', 'generated forms'),
    auxiliary: latine('{aux}', '{aux}'),
    principalParts: latine('partes principales', 'principal parts'),
    needsParts: latine(
      'Verbum Latinum sine partibus principalibus coniugari non potest. Scribe eas omnes — ut “rego, regere, rexi, rectus”.',
      'A Latin verb cannot be conjugated without its principal parts. Type them all — like “rego, regere, rexi, rectus”.',
    ),
  },

  declension: {
    eyebrow: latine('Declinatio', 'Declension'),
    title: latine('Quinque declinationes', 'The five declensions'),
    lead: latine(
      'Scribe nomen cum genetivo — ut “rex, regis” — aut adiectivum cum omnibus formis. Genetivus declinationem et stirpem dat, ideo lexica eum semper ponunt.',
      'Type a noun with its genitive — like “rex, regis” — or an adjective with all its forms. The genitive is what gives you the declension and the stem, which is why a dictionary always quotes it.',
    ),
    search: latine('rex, regis', 'rex, regis'),
    searchLabel: latine('Quaerere nomen aut adiectivum', 'Search a noun or adjective'),
    button: latine('Declinare', 'Decline'),
    tab: latine('declinatio {n}', '{n} declension'),
    adjectives: latine('Adiectiva', 'Adjectives'),
    singular: latine('singularis', 'singular'),
    plural: latine('pluralis', 'plural'),
    notANoun: latine('Hoc declinare non possum', "I can't decline that"),
    needsGenitive: latine(
      'Scribe etiam genetivum — “puella, puellae”. Sine eo declinatio ignota est.',
      'Give the genitive too — “puella, puellae”. Without it the declension is unknowable.',
    ),
    wrongGenitive: latine(
      'Genetivus verbi “{lemma}” est “{expected}”, non id quod scripsisti.',
      'The genitive of “{lemma}” is “{expected}”, not what you typed.',
    ),
    unknown: latine(
      'Hoc verbum in lexico non est. Scribe et nominativum et genetivum.',
      'The dictionary does not have that word. Give both the nominative and the genitive.',
    ),
    completed: latine(
      'Genetivum ex lexico addidi: {parts}.',
      'Genitive filled in from the dictionary: {parts}.',
    ),
    gendered: latine('masculinum / femininum', 'masculine / feminine'),
    pickGender: latine('Elige genus', 'Choose a gender'),
    iStem: latine('stirps in -i', 'i-stem'),
    stem: latine('stirps', 'stem'),
    cases: latine('Casus', 'Cases'),
    masculine: latine('masculinum', 'masculine'),
    feminine: latine('femininum', 'feminine'),
    neuter: latine('neutrum', 'neuter'),
    nominative: latine('nominativus', 'nominative'),
    vocative: latine('vocativus', 'vocative'),
    accusative: latine('accusativus', 'accusative'),
    genitive: latine('genetivus', 'genitive'),
    dative: latine('dativus', 'dative'),
    ablative: latine('ablativus', 'ablative'),
  },

  stages: {
    eyebrow: latine('Stadia', 'Stages'),
    title: latine('Vocabula per stadia', 'Vocabulary by stage'),
    lead: latine(
      'Scribe numerum stadii ut omnia eius vocabula videas.',
      'Type a stage number to see all of its vocabulary.',
    ),
    search: latine('numerus stadii', 'stage number'),
    searchLabel: latine('Quaerere stadium', 'Search a stage'),
    button: latine('Ostendere', 'Show'),
    notFound: latine('Hoc stadium non habeo', "I don't have that stage"),
    wordCount: latine('{n} vocabula', '{n} words'),
    latinWord: latine('Latine', 'Latin'),
    englishWord: latine('Anglice', 'English'),
    provenance: latine(
      'Manu collecta ex cursu, non ex datis editis — cum libro tuo confer. Omnia verba per Whitaker’s Words probantur.',
      'Hand-compiled from the course, not from published data — check against your book. Every word is verified against Whitaker’s Words.',
    ),
    allStages: latine('Omnia stadia', 'All stages'),
    fromStage: latine('Unde', 'From'),
  },

  dictionary: {
    eyebrow: latine('Lexicon', 'Dictionary'),
    title: latine('Quid Whitaker dicit', 'What Whitaker’s says'),
    lead: latine(
      'Scribe formam quam in textu invenisti. Lexicon verbum principale cum partibus principalibus dat, et omnem modum quo forma legi potest.',
      'Type the form you met in the text. The dictionary gives the headword with its principal parts, and every way the form can be read.',
    ),
    search: latine('Quaerere verbum', 'Search a word'),
    button: latine('Quaerere', 'Search'),
    emptyTitle: latine('Scribe verbum', 'Type a word'),
    emptyBody: latine(
      'Proba canem, puellae, rexit, urbium — quamlibet formam, non solum verbum principale.',
      'Try canem, puellae, rexit, urbium — any form, not just the dictionary headword.',
    ),
    looking: latine('Lexicon consulens…', 'Looking it up…'),
    noResults: latine('Nihil inventum', 'No results'),
    didYouMean: latine('Fortasse?', 'Did you mean?'),
    corrected: latine('“{to}”', 'Showing “{to}” for “{from}”.'),
    seeOnRae: latine('videre apud Whitaker ↗', 'view Whitaker’s Words ↗'),
    synonyms: latine('Synonyma', 'Synonyms'),
    antonyms: latine('Contraria', 'Antonyms'),
    locutions: latine('Locutiones', 'Phrases'),
    inUse: latine('In usu', 'In use'),
    notRae: latine('', ''),
    notAcademie: latine('', ''),
    seeAuthority: latine('', ''),
    speak: latine('Verbum audire', 'Hear the word'),
    speakFailed: latine('Non potest pronuntiari.', 'Could not pronounce that.'),
    speakSpent: latine('Pronuntiationes huius mensis consumptae sunt.', 'This month’s pronunciations are used up.'),
    // Said next to the button, not buried in a footnote: no speech model has
    // Latin, so this is an approximation and closer to ecclesiastical than to
    // the classical pronunciation the course teaches.
    speakLatin: latine(
      'Sonus per machinam fictus est — non est pronuntiatio classica.',
      'Approximated by a machine — closer to church Latin than to the classical pronunciation your course teaches.'),
    templateNote: latine('', ''),
    parses: latine('Formae lectiones', 'How this form reads'),
    principalParts: latine('Partes principales', 'Principal parts'),
  },

  chat: {
    title: latine('Roga ProfeGPT', 'Ask ProfeGPT'),
    lead: latine(
      'Coniugationes, declinationes, lexicon, translationes et grammatica. Anglice respondet.',
      'Conjugations, declensions, the dictionary, translations and grammar. It answers in English.',
    ),
    placeholder: latine('Roga quod vis…', 'Ask whatever you like…'),
    messageLabel: latine('Nuntius', 'Message'),
    send: latine('Mittere', 'Send'),
    you: latine('TU', 'YOU'),
    enterHint: latine('Enter ut mittas · Shift + Enter ad novam lineam', 'Enter to send · Shift + Enter for a new line'),
    groundedOnly: latine(
      'Responsa ex coniugatore, declinatore, Whitaker’s Words et schedis grammaticae — sine ulla IA',
      'Answers from the conjugator, the decliner, Whitaker’s Words and the grammar notes — no AI involved',
    ),
    withModel: latine('Quaestiones Latinae, infinitae · ', 'Latin questions, unlimited · '),
    otherTopics: latine('alia: ', 'other topics: '),
    perWindow: latine(' per {minutes} min', ' every {minutes} min'),
    failed: latine('Respondere non potui: {error}', "I couldn't answer: {error}"),
    starters: latine(
      'decline rex, regis|conjugate capio|parse canem|stage 5|the ablative absolute',
      'decline rex, regis|conjugate capio|parse canem|stage 5|the ablative absolute',
    ),
    needsKey: latine(
      'Quaestiones de aliis rebus modelo egent. Adde clavem gratuitam Google AI Studio ut `GEMINI_API_KEY` in .env et servitorem restitue; tunc {limit} quaestiones liberas per {minutes} minuta habebis.',
      'Questions on other topics need a model. Add a free Google AI Studio key as `GEMINI_API_KEY` to your `.env` and restart the server; that gives you {limit} free questions every {minutes} minutes.',
    ),
  },

  tape: {
    quotaDetail: latine(
      'Quaestiones liberae de aliis rebus consumptae sunt. Post {minutes} minuta redibunt.',
      'The free questions on other topics are used up. They come back in about {minutes} minutes.',
    ),
    quotaNote: latine(
      'Quaestiones Latinae nihil constant: coniugationes, declinationes, lexicon et grammatica per totam paginam patent.',
      'Latin questions cost nothing: conjugations, declensions, the dictionary and grammar are still open across the rest of the site.',
    ),
    lockedTitle: latine('Codex falsus', 'Wrong passcode'),
    lockedDetail: latine('Codicem scribe ut pergas.', 'Enter the passcode to carry on.'),
    lockedNote: latine('Roga magistrum tuum.', 'Ask your teacher.'),
    passcodePlaceholder: latine('Codex', 'Passcode'),
    unlock: latine('Aperire', 'Unlock'),
    wrongAgain: latine('Adhuc falsus.', 'Still not right.'),
  },

  lock: {
    title: latine('Paginam claudere', 'Lock the site'),
    detail: latine(
      'Cum codice pagina omnibus clauditur donec aliquis eam aperiat.',
      'With the passcode, the site is locked for everyone until someone unlocks it.',
    ),
    passcode: latine('Codex magistri', 'Teacher passcode'),
    lockNow: latine('Claudere', 'Lock'),
    wrong: latine('Codex falsus.', 'Wrong passcode.'),
    lockLabel: latine('Paginam claudere', 'Lock the site'),
    unlockLabel: latine('Paginam aperire', 'Unlock the site'),
    sealedTitle: latine('Schola agitur', 'Class in session'),
    sealedDetail: latine('Magister paginam clausit. Codicem scribe ut aperias.', 'A teacher has locked the site. Enter the passcode to unlock it.'),
    sealedNote: latine('Omnibus simul aperitur.', 'It unlocks for everyone at once.'),
  },

  quota: {
    understand: latine('Intellego', 'I understand'),
    spent: latine('Nullae quaestiones restant', 'No questions left'),
    spentShort: latine('Nihil restat', 'No usage left'),
    stillFree: latine('Latina adhuc gratuita', 'Latin is still free'),
  },

  passcode: {
    title: latine('Versio Anglica', 'English version'),
    detail: latine('Codex opus est.', 'A passcode is required.'),
    cancel: latine('Renuntiare', 'Cancel'),
  },

  mode: {
    restricted: latine('Magister solam Hispanicam reliquit.', 'Your teacher has left only Spanish available for now.'),
  },
};

export const STRINGS = { es: SPANISH, fr: FRENCH, la: LATIN };
