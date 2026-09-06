/**
 * Idioms, paired with their equivalents rather than paraphrased.
 *
 * A translator renders most idioms well — "it's raining cats and dogs" already
 * comes back as "llueve a cántaros" — but the ones it misses, it renders word
 * for word: "cost an arm and a leg" becomes "un brazo y una pierna".
 *
 * The obvious repair is to flatten the idiom before translating: "it cost a
 * lot" → "costó mucho". That is accurate and teaches the wrong thing, because
 * Spanish has its own idiom for this and a learner should meet it. So each
 * entry pairs the two idioms and carries the plain meaning as a note, which the
 * translator page shows underneath.
 *
 * Hand-written and hand-checked, like the grammar notes. Regional variants are
 * many; where one is clearly the most widely understood, that is the one here.
 */

const IDIOMS = [
  {
    en: ['cost an arm and a leg', 'costs an arm and a leg', 'cost me an arm and a leg'],
    es: 'costar un ojo de la cara',
    say: { en: 'it cost an arm and a leg', es: 'costó un ojo de la cara' },
    meaning: { en: 'to be extremely expensive', es: 'ser carísimo' },
  },
  {
    en: ['break a leg'],
    es: '¡mucha mierda!',
    say: { en: 'break a leg', es: '¡mucha mierda!' },
    meaning: { en: 'good luck (said to a performer)', es: 'buena suerte (a un actor)' },
  },
  {
    en: ['raining cats and dogs', 'rain cats and dogs'],
    es: 'llover a cántaros',
    say: { en: "it's raining cats and dogs", es: 'llueve a cántaros' },
    meaning: { en: 'to rain very heavily', es: 'llover muchísimo' },
  },
  {
    en: ['kick the bucket', 'kicked the bucket'],
    es: 'estirar la pata',
    say: { en: 'to kick the bucket', es: 'estirar la pata' },
    meaning: { en: 'to die', es: 'morirse' },
  },
  {
    en: ['piece of cake'],
    es: 'pan comido',
    say: { en: 'a piece of cake', es: 'pan comido' },
    meaning: { en: 'very easy', es: 'muy fácil' },
  },
  {
    en: ['pull your leg', 'pull my leg', 'pulling my leg', 'pulling your leg', "pull someone's leg"],
    es: 'tomar el pelo',
    say: { en: 'to pull someone’s leg', es: 'tomar el pelo a alguien' },
    meaning: { en: 'to tease someone', es: 'burlarse de alguien en broma' },
  },
  {
    en: ['once in a blue moon'],
    es: 'de higos a brevas',
    say: { en: 'once in a blue moon', es: 'de higos a brevas' },
    meaning: { en: 'very rarely', es: 'muy rara vez' },
  },
  {
    en: ['kill two birds with one stone'],
    es: 'matar dos pájaros de un tiro',
    say: { en: 'kill two birds with one stone', es: 'matar dos pájaros de un tiro' },
    meaning: { en: 'to solve two problems at once', es: 'resolver dos cosas a la vez' },
  },
  {
    en: ['when pigs fly'],
    es: 'cuando las ranas críen pelo',
    say: { en: 'when pigs fly', es: 'cuando las ranas críen pelo' },
    meaning: { en: 'never', es: 'nunca' },
  },
  {
    en: ['speak of the devil'],
    es: 'hablando del rey de Roma',
    say: { en: 'speak of the devil', es: 'hablando del rey de Roma' },
    meaning: { en: 'said when someone appears just as you mention them', es: 'se dice cuando aparece alguien de quien se hablaba' },
  },
  {
    en: ['hit the nail on the head'],
    es: 'dar en el clavo',
    say: { en: 'hit the nail on the head', es: 'dar en el clavo' },
    meaning: { en: 'to be exactly right', es: 'acertar plenamente' },
  },
  {
    en: ['the last straw'],
    es: 'la gota que colma el vaso',
    say: { en: 'the last straw', es: 'la gota que colma el vaso' },
    meaning: { en: 'the final thing that makes a situation unbearable', es: 'lo que colma la paciencia' },
  },
  {
    en: ['throw in the towel'],
    es: 'tirar la toalla',
    say: { en: 'to throw in the towel', es: 'tirar la toalla' },
    meaning: { en: 'to give up', es: 'rendirse' },
  },
  {
    en: ['lend a hand', 'give me a hand', 'give a hand'],
    es: 'echar una mano',
    say: { en: 'to lend a hand', es: 'echar una mano' },
    meaning: { en: 'to help', es: 'ayudar' },
  },
  {
    en: ['put my foot in it', 'put his foot in it', 'put your foot in it'],
    es: 'meter la pata',
    say: { en: 'to put your foot in it', es: 'meter la pata' },
    meaning: { en: 'to say something tactless', es: 'decir algo inoportuno' },
  },
  {
    en: ['head in the clouds'],
    es: 'estar en las nubes',
    say: { en: 'to have your head in the clouds', es: 'estar en las nubes' },
    meaning: { en: 'to be daydreaming', es: 'estar distraído' },
  },
  {
    en: ['better late than never'],
    es: 'más vale tarde que nunca',
    say: { en: 'better late than never', es: 'más vale tarde que nunca' },
    meaning: { en: 'late is preferable to not at all', es: 'mejor tarde que no llegar' },
  },
  {
    en: ['easier said than done'],
    es: 'del dicho al hecho hay mucho trecho',
    say: { en: 'easier said than done', es: 'del dicho al hecho hay mucho trecho' },
    meaning: { en: 'harder to do than to describe', es: 'más difícil de hacer que de decir' },
  },
  {
    en: ['get your act together', 'get my act together'],
    es: 'ponerse las pilas',
    say: { en: 'to get your act together', es: 'ponerse las pilas' },
    meaning: { en: 'to start making a proper effort', es: 'espabilar, esforzarse' },
  },
  {
    en: ['fed up'],
    es: 'estar hasta las narices',
    say: { en: 'to be fed up', es: 'estar hasta las narices' },
    meaning: { en: 'to have had enough of something', es: 'estar harto' },
  },
  {
    en: ['be all ears'],
    es: 'ser todo oídos',
    say: { en: 'to be all ears', es: 'ser todo oídos' },
    meaning: { en: 'to be listening eagerly', es: 'escuchar con toda atención' },
  },
  {
    en: ['thick as thieves', 'inseparable'],
    es: 'ser uña y carne',
    say: { en: 'to be thick as thieves', es: 'ser uña y carne' },
    meaning: { en: 'to be extremely close', es: 'ser inseparables' },
  },
  {
    en: ['not mince words', "doesn't mince words", 'mince words'],
    es: 'no tener pelos en la lengua',
    say: { en: 'to not mince words', es: 'no tener pelos en la lengua' },
    meaning: { en: 'to speak bluntly', es: 'hablar sin rodeos' },
  },
  {
    en: ['a blessing in disguise'],
    es: 'no hay mal que por bien no venga',
    say: { en: 'a blessing in disguise', es: 'no hay mal que por bien no venga' },
    meaning: { en: 'a misfortune that turns out well', es: 'un mal que acaba trayendo algo bueno' },
  },
  {
    en: ['out of the frying pan into the fire'],
    es: 'salir de Guatemala y entrar en Guatepeor',
    say: { en: 'out of the frying pan into the fire', es: 'salir de Guatemala y entrar en Guatepeor' },
    meaning: { en: 'to escape one trouble into a worse one', es: 'salir de un problema y caer en otro peor' },
  },
  {
    en: ['crazy', 'mad as a hatter', 'nuts'],
    es: 'estar como una cabra',
    say: { en: 'to be mad as a hatter', es: 'estar como una cabra' },
    meaning: { en: 'to be quite mad', es: 'estar muy loco' },
  },
];

const fold = (text) => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Longest phrasings first, so "cost me an arm and a leg" beats "cost an arm and a leg". */
const INDEX = IDIOMS.flatMap((entry) => [
  ...entry.en.map((phrase) => ({ phrase, from: 'en', entry })),
  { phrase: entry.es, from: 'es', entry },
  { phrase: entry.say.es, from: 'es', entry },
]).map((item) => ({ ...item, folded: fold(item.phrase) }))
  .sort((a, b) => b.folded.length - a.folded.length);

/**
 * Idioms present in the text, written in `from`.
 * @returns {Array<{phrase: string, say: string, meaning: string}>}
 */
export function findIdioms(text, from, to) {
  const haystack = fold(text);
  const found = [];
  const seen = new Set();

  for (const item of INDEX) {
    if (item.from !== from) continue;
    if (seen.has(item.entry)) continue;
    if (!haystack.includes(item.folded)) continue;

    seen.add(item.entry);
    found.push({
      phrase: item.phrase,
      say: item.entry.say[to],
      meaning: item.entry.meaning,
      source: item.entry.say[from],
    });
    if (found.length >= 2) break;
  }

  return found;
}

export const IDIOM_COUNT = IDIOMS.length;
