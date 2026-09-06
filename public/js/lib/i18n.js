/**
 * Interface language.
 *
 * The site is Spanish by default. Switching it to English is gated behind a
 * passcode, and getting the passcode wrong seals the whole page until the right
 * one is entered — see views/shell.js.
 *
 * Content the site is *about* stays in Spanish: verb forms, dictionary
 * headwords, person pronouns. Only the chrome around them changes.
 */

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

let current = read(LANG_KEY) === 'en' ? 'en' : 'es';

export function lang() {
  return current;
}

export function setLang(next) {
  current = next === 'en' ? 'en' : 'es';
  write(LANG_KEY, current);
  document.documentElement.lang = current;
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: current } }));
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
  const entry = key.split('.').reduce((node, part) => node?.[part], STRINGS);
  let text = entry?.[current] ?? entry?.es ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Pick the right half of an object that already carries both languages. */
export function pick(pair) {
  return pair?.[current] ?? pair?.es ?? '';
}

const two = (es, en) => ({ es, en });

export const STRINGS = {
  nav: {
    translator: two('Traductor', 'Translator'),
    conjugation: two('Conjugación', 'Conjugation'),
    dictionary: two('Diccionario', 'Dictionary'),
    chat: two('Chat', 'Chat'),
    theme: two('Cambiar de tema', 'Switch theme'),
    menu: two('Abrir menú', 'Open menu'),
    langLabel: two('Idioma de la web', 'Site language'),
  },

  meta: {
    home: two('ProfeGPT — español, sin fricción', 'ProfeGPT — Spanish, without the friction'),
    skip: two('Saltar al contenido', 'Skip to content'),
    footer: two('definiciones del', 'definitions from the'),
    copyright: two('© Yuzhe (Julian) Chen 2026', '© Yuzhe (Julian) Chen 2026'),
    footerDict: two('Diccionario de la lengua española', 'Diccionario de la lengua española'),
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
    placeholderEs: two('Escribe algo en español…', 'Escribe algo en español…'),
    placeholderEn: two('Type something in English…', 'Type something in English…'),
    outEs: two('La traducción aparecerá aquí.', 'La traducción aparecerá aquí.'),
    outEn: two('The translation will appear here.', 'The translation will appear here.'),
    engine: two('traducido con {engine}', 'translated with {engine}'),
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
    seeOnRae: two('ver en dle.rae.es ↗', 'view on dle.rae.es ↗'),
    synonyms: two('Sinónimos', 'Synonyms'),
    antonyms: two('Antónimos', 'Antonyms'),
    locutions: two('Locuciones y expresiones', 'Phrases and expressions'),
    inUse: two('En uso', 'In use'),
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
    enterHint: two('Enter para enviar · Shift + Enter para un salto de línea', 'Enter to send · Shift + Enter for a new line'),
    groundedOnly: two(
      'Respuestas del conjugador, la RAE y las fichas de gramática — sin conexión a ninguna IA',
      'Answers from the conjugator, the RAE and the grammar notes — no AI involved',
    ),
    withModel: two('Preguntas de español, ilimitadas · ', 'Spanish questions, unlimited · '),
    otherTopics: two('otros temas: ', 'other topics: '),
    perWindow: two(' cada {minutes} min', ' every {minutes} min'),
    failed: two('No pude responder: {error}', "I couldn't answer: {error}"),
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
};
