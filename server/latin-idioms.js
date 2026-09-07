/**
 * English phrases that Latin says differently, and how Latin says them.
 *
 * Word-by-word is the wrong tool for these. "How much does this cost" is five
 * English words and two Latin ones — *quanti constat* — because Latin puts the
 * price in the genitive and needs no word for "how much" at all. Glossed one
 * word at a time it comes out "quomodo multus magis hic consto", which is not
 * a sentence in any language.
 *
 * This is a hand-written table, and deliberately so: an idiom is by definition
 * the thing a general rule gets wrong, and the site already keeps one of these
 * for Spanish and French (server/idioms.js). It is checked before the rules
 * translator, because a rule applied to an idiom produces confident nonsense.
 *
 * Kept short and kept honest — only phrases a first- or second-year class would
 * actually write, and only where the Latin is standard rather than clever.
 */

const IDIOMS = [
  { en: /^how much (?:does |do )?(?:this |it )?cost\??$/i, la: 'quanti constat' },
  { en: /^how much (?:more )?can (?:this|it) cost\??$/i, la: 'quanti tandem constat' },
  { en: /^(?:it )?is not worth it$/i, la: 'non tanti est' },
  { en: /^(?:it )?is worth it$/i, la: 'tanti est' },
  { en: /^i can(?:no|')?t take it anymore$/i, la: 'non iam ferre possum' },
  { en: /^i don'?t know$/i, la: 'nescio' },
  { en: /^i don'?t care$/i, la: 'non curo' },
  { en: /^what is your name\??$/i, la: 'quod est nomen tibi' },
  { en: /^my name is ([\p{L}]+)$/iu, la: 'nomen mihi est $1' },
  { en: /^how are you\??$/i, la: 'quid agis' },
  { en: /^i am well$/i, la: 'valeo' },
  { en: /^thank you$/i, la: 'gratias tibi ago' },
  { en: /^please$/i, la: 'quaeso' },
  { en: /^good morning$/i, la: 'salve' },
  { en: /^goodbye$/i, la: 'vale' },
  { en: /^what time is it\??$/i, la: 'quota hora est' },
  { en: /^how old are you\??$/i, la: 'quot annos natus es' },
  { en: /^where are you (?:going|from)\??$/i, la: 'quo is' },
  { en: /^it does not matter$/i, la: 'nihil refert' },
  { en: /^as soon as possible$/i, la: 'quam primum' },
  { en: /^by the way$/i, la: 'obiter' },
  { en: /^for example$/i, la: 'exempli gratia' },
  { en: /^and so on$/i, la: 'et cetera' },
  { en: /^in other words$/i, la: 'id est' },
  { en: /^of course$/i, la: 'scilicet' },
  { en: /^once upon a time$/i, la: 'olim' },
  { en: /^i love you$/i, la: 'te amo' },
  { en: /^i miss you$/i, la: 'te desidero' },
  { en: /^help me$/i, la: 'me adiuva' },
  { en: /^i am sorry$/i, la: 'me paenitet' },
];

/** The idiomatic Latin for an English phrase, if this is one of them. */
export function latinIdiom(text) {
  const clean = String(text ?? '').trim().replace(/[.!]+$/, '');
  for (const idiom of IDIOMS) {
    const match = idiom.en.exec(clean);
    if (match) return idiom.la.replace(/\$(\d)/g, (_whole, group) => match[Number(group)] ?? '');
  }
  return null;
}

export const LATIN_IDIOM_COUNT = IDIOMS.length;
