/**
 * Latin declension engine.
 *
 * Nouns and adjectives, from their dictionary form. A Latin noun is quoted as
 * nominative plus genitive — *puella, puellae* — and that second word is what
 * says which of the five declensions it belongs to and what its stem is, which
 * is exactly why dictionaries print it. So the engine takes principal parts
 * rather than a bare word, and everything else follows from them.
 *
 *   1st   -ae   puella, puellae      stem puell-
 *   2nd   -i    dominus, domini      stem domin-
 *   3rd   -is   rex, regis           stem reg-
 *   4th   -us   manus, manus         stem man-
 *   5th   -ei   dies, diei           stem di-
 *
 * The third is the awkward one, as it is for a student: its nominative is not
 * predictable from its stem, which is why the genitive has to be given, and it
 * splits into consonant stems and i-stems, which differ in four cells.
 */

export const CASES = ['nominative', 'vocative', 'accusative', 'genitive', 'dative', 'ablative'];
export const NUMBERS = ['singular', 'plural'];
export const GENDERS = ['masculine', 'feminine', 'neuter'];

/** The order a table is read down the page, which is not the order above. */
export const CASE_ORDER = ['nominative', 'vocative', 'accusative', 'genitive', 'dative', 'ablative'];

const ENDINGS = {
  1: {
    singular: { nominative: 'a', vocative: 'a', accusative: 'am', genitive: 'ae', dative: 'ae', ablative: 'a' },
    plural: { nominative: 'ae', vocative: 'ae', accusative: 'as', genitive: 'arum', dative: 'is', ablative: 'is' },
  },
  2: {
    singular: { nominative: 'us', vocative: 'e', accusative: 'um', genitive: 'i', dative: 'o', ablative: 'o' },
    plural: { nominative: 'i', vocative: 'i', accusative: 'os', genitive: 'orum', dative: 'is', ablative: 'is' },
  },
  '2n': {
    singular: { nominative: 'um', vocative: 'um', accusative: 'um', genitive: 'i', dative: 'o', ablative: 'o' },
    plural: { nominative: 'a', vocative: 'a', accusative: 'a', genitive: 'orum', dative: 'is', ablative: 'is' },
  },
  3: {
    singular: { nominative: null, vocative: null, accusative: 'em', genitive: 'is', dative: 'i', ablative: 'e' },
    plural: { nominative: 'es', vocative: 'es', accusative: 'es', genitive: 'um', dative: 'ibus', ablative: 'ibus' },
  },
  '3n': {
    singular: { nominative: null, vocative: null, accusative: null, genitive: 'is', dative: 'i', ablative: 'e' },
    plural: { nominative: 'a', vocative: 'a', accusative: 'a', genitive: 'um', dative: 'ibus', ablative: 'ibus' },
  },
  4: {
    singular: { nominative: 'us', vocative: 'us', accusative: 'um', genitive: 'us', dative: 'ui', ablative: 'u' },
    plural: { nominative: 'us', vocative: 'us', accusative: 'us', genitive: 'uum', dative: 'ibus', ablative: 'ibus' },
  },
  '4n': {
    singular: { nominative: 'u', vocative: 'u', accusative: 'u', genitive: 'us', dative: 'u', ablative: 'u' },
    plural: { nominative: 'ua', vocative: 'ua', accusative: 'ua', genitive: 'uum', dative: 'ibus', ablative: 'ibus' },
  },
  5: {
    singular: { nominative: 'es', vocative: 'es', accusative: 'em', genitive: 'ei', dative: 'ei', ablative: 'e' },
    plural: { nominative: 'es', vocative: 'es', accusative: 'es', genitive: 'erum', dative: 'ebus', ablative: 'ebus' },
  },
};

/** Where an i-stem differs from a plain consonant stem. */
const I_STEM = {
  masculine: { plural: { genitive: 'ium' } },
  neuter: { singular: { ablative: 'i' }, plural: { nominative: 'ia', vocative: 'ia', accusative: 'ia', genitive: 'ium' } },
};

const strip = (word) => String(word ?? '').trim().toLowerCase();

/** Split "puella, puellae (f.)" into its parts. */
export function parseParts(input) {
  const cleaned = String(input ?? '').replace(/\((.*?)\)/g, ' $1 ').trim();
  const parts = cleaned.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.map((part) => part.split(/\s+/)[0].replace(/[^a-zāēīōūăĕĭŏŭ-]/gi, ''));
}

/**
 * Which declension a noun belongs to, and the stem to build it on.
 *
 * The genitive decides both. Where it is ambiguous — *-us* is both a fourth
 * declension genitive singular and a second declension nominative — the
 * nominative breaks the tie.
 */
export function classifyNoun(nominative, genitive, gender = '') {
  const nom = strip(nominative);
  const gen = strip(genitive);
  if (!nom || !gen) return null;

  const neuter = gender === 'neuter';

  if (gen.endsWith('ae')) return { declension: 1, stem: gen.slice(0, -2), key: 1 };

  if (gen.endsWith('ei') && gen.length > 2) return { declension: 5, stem: gen.slice(0, -2), key: 5 };

  // Fourth declension: the genitive singular repeats the nominative (manus,
  // manus) or the noun is a neuter in -u (cornu, cornus).
  if (gen.endsWith('us') && (nom.endsWith('us') || nom.endsWith('u')) && gen === nom.replace(/u$/, 'us')) {
    return { declension: 4, stem: gen.slice(0, -2), key: neuter ? '4n' : 4 };
  }
  if (gen.endsWith('us') && nom === gen) return { declension: 4, stem: gen.slice(0, -2), key: neuter ? '4n' : 4 };

  if (gen.endsWith('is')) {
    const stem = gen.slice(0, -2);
    return { declension: 3, stem, key: neuter ? '3n' : 3, iStem: isIStem(nom, stem, gender) };
  }

  if (gen.endsWith('i')) {
    const stem = gen.slice(0, -1);
    return { declension: 2, stem, key: neuter ? '2n' : 2 };
  }

  return null;
}

/**
 * Whether a third declension noun is an i-stem.
 *
 * Three rules, all of which a student is taught as a list:
 *   parisyllabic — the nominative and genitive have the same syllable count
 *                  (civis, civis; nubes, nubis)
 *   two consonants closing the stem (urbs, urbis; mons, montis)
 *   neuters in -al, -ar and -e (animal, mare)
 *
 * The third is gated on the gender rather than the ending alone, because
 * *Caesar* and *consul* end that way too and decline as consonant stems.
 */
export function isIStem(nominative, stem, gender = '') {
  const nom = strip(nominative);
  const syllables = (word) => (word.match(/[aeiouāēīōū]+/g) || []).length;

  if (gender === 'neuter' && /(?:al|ar|e)$/.test(nom) && nom.length > 2) return true;
  if (/[bcdfgklmnprstvxz]{2}$/.test(stem)) return true;
  if (/(?:is|es)$/.test(nom) && syllables(nom) === syllables(`${stem}is`)) return true;
  return false;
}

function endingsFor(key, iStem, gender) {
  const base = structuredClone(ENDINGS[key]);
  if (!iStem) return base;
  const patch = gender === 'neuter' ? I_STEM.neuter : I_STEM.masculine;
  for (const [number, cells] of Object.entries(patch)) {
    for (const [name, ending] of Object.entries(cells)) base[number][name] = ending;
  }
  return base;
}

/**
 * Decline a noun.
 * @param {string} nominative  the dictionary nominative, e.g. "puella"
 * @param {string} genitive    the dictionary genitive, e.g. "puellae"
 * @returns {{ok: boolean, table?: object, declension?: number, error?: string}}
 */
export function declineNoun(nominative, genitive, gender = '') {
  const found = classifyNoun(nominative, genitive, gender);
  if (!found) return { ok: false, error: 'not-a-noun' };

  const nom = strip(nominative);
  const endings = endingsFor(found.key, found.iStem, gender);
  const table = {};

  for (const number of NUMBERS) {
    table[number] = {};
    for (const name of CASES) {
      const ending = endings[number][name];
      if (ending === null) {
        // The third declension nominative is not built from the stem — it is
        // the reason the genitive has to be quoted at all — so it is copied in,
        // and a neuter carries it into the accusative and vocative too.
        table[number][name] = number === 'singular' ? nom : null;
      } else {
        table[number][name] = found.stem + ending;
      }
    }
  }

  // Second declension nouns in -er keep the nominative in the vocative, and
  // -ius nouns contract it: fili, not filie.
  if (found.declension === 2 && gender !== 'neuter') {
    if (nom.endsWith('er')) { table.singular.nominative = nom; table.singular.vocative = nom; }
    else if (nom.endsWith('ius')) table.singular.vocative = `${found.stem.slice(0, -1)}i`;
    else table.singular.nominative = nom;
  }
  if (found.declension === 1 || found.declension === 4 || found.declension === 5) {
    table.singular.nominative = nom;
  }

  return {
    ok: true,
    lemma: nom,
    genitive: strip(genitive),
    declension: found.declension,
    gender: gender || '',
    stem: found.stem,
    iStem: Boolean(found.iStem),
    table,
  };
}

// ---------------------------------------------------------------------------
// adjectives
// ---------------------------------------------------------------------------

/**
 * Adjectives come in two families, and the dictionary form says which:
 *   first and second declension — bonus, bona, bonum
 *   third declension           — fortis, forte · acer, acris, acre · ingens, ingentis
 */
export function declineAdjective(parts) {
  const forms = (Array.isArray(parts) ? parts : parseParts(parts)).map(strip).filter(Boolean);
  if (!forms.length) return { ok: false, error: 'not-an-adjective' };

  const [first, second, third] = forms;

  // bonus, bona, bonum — and the -er kind, miser, misera, miserum.
  if (second && /a$/.test(second) && (third ? /um$/.test(third) : false)) {
    const stem = second.slice(0, -1);
    return {
      ok: true,
      lemma: first,
      family: '1st/2nd',
      stem,
      table: {
        masculine: declineNoun(first, `${stem}i`, 'masculine').table,
        feminine: declineNoun(`${stem}a`, `${stem}ae`, 'feminine').table,
        neuter: declineNoun(`${stem}um`, `${stem}i`, 'neuter').table,
      },
    };
  }

  // Third declension adjectives come with one, two or three terminations, and
  // the dictionary form says which:
  //   acer, acris, acre   three — a separate form for each gender
  //   fortis, forte       two   — the second is the neuter nominative
  //   ingens, ingentis    one   — the second is the genitive, and every gender
  //                               shares the nominative
  const genitiveQuoted = Boolean(second) && /is$/.test(second) && !third;
  const stem = third ? second.replace(/is$/, '')
    : genitiveQuoted ? second.slice(0, -2)
      : first.replace(/(?:is|s)$/, '');

  const masculine = thirdAdjective(stem, first, false);
  const neuterNominative = third || (genitiveQuoted ? first : second) || `${stem}e`;

  return {
    ok: true,
    lemma: first,
    family: '3rd',
    terminations: third ? 3 : genitiveQuoted ? 1 : 2,
    stem,
    table: {
      masculine,
      feminine: third ? thirdAdjective(stem, second, false) : masculine,
      neuter: thirdAdjective(stem, neuterNominative, true),
    },
  };
}

/** Third declension adjectives are i-stems throughout — abl. sg. -i, gen. pl. -ium. */
function thirdAdjective(stem, nominative, neuter) {
  const nom = strip(nominative);
  return {
    singular: {
      nominative: nom,
      vocative: nom,
      accusative: neuter ? nom : `${stem}em`,
      genitive: `${stem}is`,
      dative: `${stem}i`,
      ablative: `${stem}i`,
    },
    plural: {
      nominative: neuter ? `${stem}ia` : `${stem}es`,
      vocative: neuter ? `${stem}ia` : `${stem}es`,
      accusative: neuter ? `${stem}ia` : `${stem}es`,
      genitive: `${stem}ium`,
      dative: `${stem}ibus`,
      ablative: `${stem}ibus`,
    },
  };
}

/**
 * One form of a noun, built from its dictionary parts.
 *
 * This is what lets the translator put a word right rather than only say it is
 * wrong: given *canem* and the knowledge that the phrase wanted a nominative,
 * the headword *canis, canis* yields *canis*.
 */
export function formOf(nominative, genitive, gender, wantedCase, number = 'singular') {
  const declined = declineNoun(nominative, genitive, gender);
  if (!declined.ok) return null;
  return declined.table[number]?.[wantedCase] ?? null;
}
