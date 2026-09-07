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
 *
 * One table per language the site can be about. They are separate rather than
 * one table with an extra column because the sets barely overlap: the idioms a
 * translator fumbles going into Spanish are not the ones it fumbles going into
 * French, and half of each list has no counterpart in the other.
 */

const ES_IDIOMS = [
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

const FR_IDIOMS = [
  {
    en: ['cost an arm and a leg', 'costs an arm and a leg', 'cost me an arm and a leg'],
    fr: 'coûter les yeux de la tête',
    say: { en: 'it cost an arm and a leg', fr: 'ça a coûté les yeux de la tête' },
    meaning: { en: 'to be extremely expensive', fr: 'être très cher' },
  },
  {
    en: ['break a leg'],
    fr: 'merde !',
    say: { en: 'break a leg', fr: 'merde !' },
    meaning: { en: 'good luck (said to a performer)', fr: 'bonne chance (à un artiste)' },
  },
  {
    en: ['raining cats and dogs', 'rain cats and dogs'],
    fr: 'pleuvoir des cordes',
    say: { en: "it's raining cats and dogs", fr: 'il pleut des cordes' },
    meaning: { en: 'to rain very heavily', fr: 'pleuvoir très fort' },
  },
  {
    en: ['kick the bucket', 'kicked the bucket'],
    fr: 'casser sa pipe',
    say: { en: 'to kick the bucket', fr: 'casser sa pipe' },
    meaning: { en: 'to die', fr: 'mourir' },
  },
  {
    en: ['piece of cake', 'as easy as pie'],
    fr: 'les doigts dans le nez',
    say: { en: 'a piece of cake', fr: 'les doigts dans le nez' },
    meaning: { en: 'very easy', fr: 'très facile' },
  },
  {
    en: ['pull your leg', 'pull my leg', 'pulling my leg', 'pulling your leg', "pull someone's leg"],
    fr: 'faire marcher quelqu’un',
    say: { en: 'to pull someone’s leg', fr: 'faire marcher quelqu’un' },
    meaning: { en: 'to tease someone', fr: 'se moquer gentiment de quelqu’un' },
  },
  {
    en: ['once in a blue moon'],
    fr: 'tous les trente-six du mois',
    say: { en: 'once in a blue moon', fr: 'tous les trente-six du mois' },
    meaning: { en: 'very rarely', fr: 'très rarement' },
  },
  {
    en: ['kill two birds with one stone'],
    fr: 'faire d’une pierre deux coups',
    say: { en: 'kill two birds with one stone', fr: 'faire d’une pierre deux coups' },
    meaning: { en: 'to solve two problems at once', fr: 'régler deux choses à la fois' },
  },
  {
    en: ['when pigs fly'],
    fr: 'quand les poules auront des dents',
    say: { en: 'when pigs fly', fr: 'quand les poules auront des dents' },
    meaning: { en: 'never', fr: 'jamais' },
  },
  {
    en: ['speak of the devil'],
    fr: 'quand on parle du loup',
    say: { en: 'speak of the devil', fr: 'quand on parle du loup' },
    meaning: { en: 'said when someone appears just as you mention them', fr: 'se dit quand la personne dont on parle arrive' },
  },
  {
    en: ['the last straw', 'the final straw'],
    fr: 'la goutte d’eau qui fait déborder le vase',
    say: { en: 'the last straw', fr: 'la goutte d’eau qui fait déborder le vase' },
    meaning: { en: 'the small thing that finally makes it unbearable', fr: 'le détail de trop' },
  },
  {
    en: ['have a frog in my throat', 'a frog in my throat', 'frog in his throat'],
    fr: 'avoir un chat dans la gorge',
    say: { en: 'to have a frog in one’s throat', fr: 'avoir un chat dans la gorge' },
    meaning: { en: 'to be hoarse', fr: 'être enroué' },
  },
  {
    en: ['let the cat out of the bag', 'spill the beans'],
    fr: 'vendre la mèche',
    say: { en: 'to let the cat out of the bag', fr: 'vendre la mèche' },
    meaning: { en: 'to give away a secret', fr: 'révéler un secret' },
  },
  {
    en: ['in the same boat'],
    fr: 'être logé à la même enseigne',
    say: { en: 'to be in the same boat', fr: 'être logé à la même enseigne' },
    meaning: { en: 'to be in the same difficult position', fr: 'être dans la même situation' },
  },
  {
    en: ['other fish to fry', 'bigger fish to fry'],
    fr: 'avoir d’autres chats à fouetter',
    say: { en: 'to have other fish to fry', fr: 'avoir d’autres chats à fouetter' },
    meaning: { en: 'to have more important things to do', fr: 'avoir mieux à faire' },
  },
  {
    en: ['bite off more than you can chew', 'eyes bigger than your stomach'],
    fr: 'avoir les yeux plus gros que le ventre',
    say: { en: 'to bite off more than you can chew', fr: 'avoir les yeux plus gros que le ventre' },
    meaning: { en: 'to take on more than you can manage', fr: 'en prendre plus qu’on ne peut' },
  },
  {
    en: ['under the weather'],
    fr: 'ne pas être dans son assiette',
    say: { en: 'to be under the weather', fr: 'ne pas être dans son assiette' },
    meaning: { en: 'to feel slightly unwell', fr: 'ne pas se sentir bien' },
  },
  {
    en: ['throw in the towel', 'give up'],
    fr: 'jeter l’éponge',
    say: { en: 'to throw in the towel', fr: 'jeter l’éponge' },
    meaning: { en: 'to give up', fr: 'abandonner' },
  },
  {
    en: ['turn a blind eye'],
    fr: 'fermer les yeux',
    say: { en: 'to turn a blind eye', fr: 'fermer les yeux sur quelque chose' },
    meaning: { en: 'to pretend not to notice', fr: 'faire comme si on n’avait rien vu' },
  },
  {
    en: ["it's all greek to me", 'all greek to me'],
    fr: 'c’est du chinois',
    say: { en: "it's all Greek to me", fr: 'c’est du chinois' },
    meaning: { en: 'I cannot understand a word of it', fr: 'je n’y comprends rien' },
  },
  {
    en: ['walking on eggshells', 'walk on eggshells'],
    fr: 'marcher sur des œufs',
    say: { en: 'to walk on eggshells', fr: 'marcher sur des œufs' },
    meaning: { en: 'to proceed very cautiously', fr: 'avancer avec beaucoup de précaution' },
  },
  {
    en: ['green thumb', 'green fingers'],
    fr: 'avoir la main verte',
    say: { en: 'to have a green thumb', fr: 'avoir la main verte' },
    meaning: { en: 'to be good with plants', fr: 'savoir s’occuper des plantes' },
  },
  {
    en: ['sleep like a log', 'slept like a log'],
    fr: 'dormir comme une marmotte',
    say: { en: 'to sleep like a log', fr: 'dormir comme une marmotte' },
    meaning: { en: 'to sleep very deeply', fr: 'dormir profondément' },
  },
  {
    en: ['make a mountain out of a molehill'],
    fr: 'en faire tout un fromage',
    say: { en: 'to make a mountain out of a molehill', fr: 'en faire tout un fromage' },
    meaning: { en: 'to make far too much of something small', fr: 'exagérer une chose sans importance' },
  },
  {
    en: ['long time no see'],
    fr: 'ça fait un bail',
    say: { en: 'long time no see', fr: 'ça fait un bail' },
    meaning: { en: "it's been a long time", fr: 'cela fait longtemps' },
  },
  {
    en: ['fed up', 'sick of it', 'had enough'],
    fr: 'en avoir marre',
    say: { en: 'to be fed up', fr: 'en avoir marre' },
    meaning: { en: 'to have had enough', fr: 'être excédé' },
  },
  {
    en: ['out of the frying pan into the fire'],
    fr: 'tomber de Charybde en Scylla',
    say: { en: 'out of the frying pan into the fire', fr: 'tomber de Charybde en Scylla' },
    meaning: { en: 'to escape one trouble into a worse one', fr: 'sortir d’un ennui pour tomber dans un pire' },
  },
  {
    en: ['crazy', 'mad as a hatter', 'nuts'],
    fr: 'avoir une araignée au plafond',
    say: { en: 'to be mad as a hatter', fr: 'avoir une araignée au plafond' },
    meaning: { en: 'to be quite mad', fr: 'être un peu fou' },
  },
];

const TABLES = { es: ES_IDIOMS, fr: FR_IDIOMS };

const fold = (text) => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/['’]/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Longest phrasings first, so "cost me an arm and a leg" beats "cost an arm and a leg". */
function buildIndex(table, study) {
  return table.flatMap((entry) => [
    ...entry.en.map((phrase) => ({ phrase, from: 'en', entry })),
    { phrase: entry[study], from: study, entry },
    { phrase: entry.say[study], from: study, entry },
  ]).map((item) => ({ ...item, folded: fold(item.phrase) }))
    .sort((a, b) => b.folded.length - a.folded.length);
}

const INDEXES = Object.fromEntries(
  Object.entries(TABLES).map(([study, table]) => [study, buildIndex(table, study)]),
);

/**
 * Idioms present in the text, written in `from`.
 *
 * The table is chosen by whichever end of the pair is not English — the site is
 * always translating between English and the language it is about.
 * @returns {Array<{phrase: string, say: string, meaning: object, source: string}>}
 */
export function findIdioms(text, from, to) {
  const study = from === 'en' ? to : from;
  const index = INDEXES[study];
  if (!index) return [];

  const haystack = fold(text);
  const found = [];
  const seen = new Set();

  for (const item of index) {
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

/**
 * The part of an idiom that does not inflect — its giveaway.
 *
 * The stored form is a citation: *llueve a cántaros*, third person present. A
 * translator that renders the idiom correctly in some other form — *está
 * lloviendo a cántaros* — has got it right, and swapping the citation form in
 * would produce "está llueve a cántaros". So what is compared is everything
 * after the verb, which is the half that stays put.
 *
 * Two-word idioms keep both words, since dropping the first would leave
 * something far too common to match on: *pan comido* would become *comido*.
 */
export function idiomSignature(phrase) {
  const words = fold(phrase).split(' ').filter(Boolean);
  if (words.length < 3) return [words.join(' ')].filter(Boolean);

  // Two readings of "the part that does not inflect", because one is not
  // enough. Dropping the first word suits Spanish, whose citation form starts
  // with the verb; the French ones start with a subject pronoun, so the verb
  // survives that cut and the tail is what to match on instead. Either hit
  // counts.
  return [words.slice(1).join(' '), words.slice(-2).join(' ')];
}

/**
 * Whether a translation already contains the idiom, in whatever form.
 *
 * Deliberately generous. A false yes means the idiom is left as the engine
 * wrote it and only the note is shown; a false no means the citation form is
 * pasted over a correctly inflected one and the grammar breaks. The first
 * costs nothing, so the doubt goes that way.
 */
export function alreadyIdiomatic(text, say) {
  const haystack = fold(text);
  return idiomSignature(say).some((signature) => signature && haystack.includes(signature));
}

export const IDIOM_COUNT = ES_IDIOMS.length + FR_IDIOMS.length;

/** Per language, for the tests and the README. */
export const IDIOM_COUNTS = { es: ES_IDIOMS.length, fr: FR_IDIOMS.length };
