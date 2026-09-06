/**
 * French conjugation engine.
 *
 * The counterpart to lib/conjugator.js, built the same way — rules first, data
 * only where rules run out — but French divides its work differently:
 *
 *   1. regular endings for the three groups: -er, -ir (with the -iss- infix)
 *      and -re, plus the -oir verbs, which are irregular to a verb.
 *   2. spelling changes that only preserve pronunciation
 *      (commencer → commençons, manger → mangeons, payer → paie)
 *   3. the mute-e stem changes: lever → lève, appeler → appelle,
 *      acheter → achète, préférer → préfère
 *   4. explicit irregular forms and stems, inherited by prefixed derivatives
 *      (prendre → comprendre, couvrir → découvrir)
 *
 * Two things have no Spanish equivalent and shape the code:
 *
 *   The auxiliary. Compound tenses take avoir or être, and the être ones agree
 *   with their subject, so the participle is not one string but two.
 *
 *   The stem splits in two rather than shifting. French changes the stem before
 *   a *mute* ending — je, tu, il, ils of the present and subjunctive — and
 *   leaves it alone before nous and vous, where the ending is heard. Every
 *   verb therefore carries a strong stem and a weak one, and most verbs have
 *   the same string in both.
 */

import {
  ETRE_VERBS, IRREGULARS, PREFIXABLE, SHORT_IR, SPELLING_EXCEPTIONS,
  UIRE_SHORT_PARTICIPLE,
} from '../data/verbs-fr.js';

export const PERSONS = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];

/**
 * French verb forms do not stand alone the way Spanish ones do — *parle* is
 * both je and il — so the pronoun is part of the label rather than optional.
 */
export const PERSON_LABELS = {
  je: "je / j'",
  tu: 'tu',
  il: 'il / elle / on',
  nous: 'nous',
  vous: 'vous',
  ils: 'ils / elles',
};

export const IMPERATIVE_PERSONS = ['tu', 'nous', 'vous'];

/** How this table is laid out, so the views and the tutor can stay generic. */
export const SHAPE = {
  moods: ['indicatif', 'subjonctif'],
  imperative: 'imperatif',
  nonFinite: 'formes',
  imperativeKinds: ['affirmatif', 'negatif'],
};

const VOWELS = 'aeiouâàéèêëîïôûùü';
const CIRCUMFLEX = { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û' };

// --- endings ---------------------------------------------------------------

const PRESENT = {
  er: ['e', 'es', 'e', 'ons', 'ez', 'ent'],
  ir: ['is', 'is', 'it', 'issons', 'issez', 'issent'],
  re: ['s', 's', null, 'ons', 'ez', 'ent'],   // the 3sg is worked out below
  shortIr: ['s', 's', 't', 'ons', 'ez', 'ent'],
};

const IMPARFAIT = ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'];
const FUTUR = ['ai', 'as', 'a', 'ons', 'ez', 'ont'];
const CONDITIONNEL = IMPARFAIT;
const SUBJONCTIF = ['e', 'es', 'e', 'ions', 'iez', 'ent'];
const SUBJ_IMPARFAIT = ['sse', 'sses', null, 'ssions', 'ssiez', 'ssent'];

/** Passé simple, by the vowel that carries it. */
const PASSE_SIMPLE = {
  er: ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'],
  i: ['is', 'is', 'it', 'îmes', 'îtes', 'irent'],
  u: ['us', 'us', 'ut', 'ûmes', 'ûtes', 'urent'],
  in: ['ins', 'ins', 'int', 'înmes', 'întes', 'inrent'],
};

const AUX = {
  avoir: {
    present: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
    imparfait: ['avais', 'avais', 'avait', 'avions', 'aviez', 'avaient'],
    passeSimple: ['eus', 'eus', 'eut', 'eûmes', 'eûtes', 'eurent'],
    futur: ['aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront'],
    conditionnel: ['aurais', 'aurais', 'aurait', 'aurions', 'auriez', 'auraient'],
    subjPresent: ['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient'],
    subjImparfait: ['eusse', 'eusses', 'eût', 'eussions', 'eussiez', 'eussent'],
    infinitif: 'avoir',
    participePresent: 'ayant',
  },
  être: {
    present: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
    imparfait: ['étais', 'étais', 'était', 'étions', 'étiez', 'étaient'],
    passeSimple: ['fus', 'fus', 'fut', 'fûmes', 'fûtes', 'furent'],
    futur: ['serai', 'seras', 'sera', 'serons', 'serez', 'seront'],
    conditionnel: ['serais', 'serais', 'serait', 'serions', 'seriez', 'seraient'],
    subjPresent: ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient'],
    subjImparfait: ['fusse', 'fusses', 'fût', 'fussions', 'fussiez', 'fussent'],
    infinitif: 'être',
    participePresent: 'étant',
  },
};

// --- small helpers ---------------------------------------------------------

export function normalizeVerb(input) {
  return String(input ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Strip a reflexive pronoun: "se lever" and "s'appeler" are both pronominal. */
export function stripPronoun(verb) {
  const match = /^(?:se\s+|s['’]\s*)(.+)$/.exec(verb);
  return match ? { verb: match[1], pronominal: true } : { verb, pronominal: false };
}

function row(forms) {
  return Object.fromEntries(PERSONS.map((person, index) => [person, forms[index] ?? null]));
}

const startsWithVowel = (word) => /^[aeiouâàéèêëîïôûùüh]/i.test(word || '');

/**
 * A c or a g only keeps its soft sound before e and i, so it has to be written
 * differently before the a and o of an ending: nous commençons, nous mangeons.
 */
function soften(stem, ending, kind) {
  if (!kind || !/^[aâoô]/.test(ending)) return stem;
  if (kind === 'c') return `${stem.slice(0, -1)}ç`;
  return `${stem}e`;
}

function join(stem, ending, kind) {
  if (ending == null || stem == null) return null;
  return soften(stem, ending, kind) + ending;
}

/** Put a circumflex on the last plain vowel — how the passé simple builds its subjunctive. */
function circumflexLastVowel(word) {
  for (let i = word.length - 1; i >= 0; i -= 1) {
    const replacement = CIRCUMFLEX[word[i]];
    if (replacement) return word.slice(0, i) + replacement + word.slice(i + 1);
    // A vowel that already carries a diacritic is left alone: il haït, il crût.
    if (VOWELS.includes(word[i])) return word;
  }
  return word;
}

// --- analysis --------------------------------------------------------------

/** Split an infinitive into stem + group, or null if it is not one. */
export function classify(infinitive) {
  if (/oir$/.test(infinitive)) return { stem: infinitive.slice(0, -3), ending: 'oir' };
  if (/re$/.test(infinitive)) return { stem: infinitive.slice(0, -2), ending: 're' };
  if (/er$/.test(infinitive)) return { stem: infinitive.slice(0, -2), ending: 'er' };
  // haïr keeps its tréma, so the group is not spelled with a plain i.
  if (/[iï]r$/.test(infinitive)) return { stem: infinitive.slice(0, -2), ending: 'ir' };
  return null;
}

/** The sound-preserving softening a stem needs, if any. */
function softeningKind(infinitive) {
  if (/cer$/.test(infinitive)) return 'c';
  if (/ger$/.test(infinitive)) return 'g';
  return null;
}

/**
 * How an -er verb's stem changes before a mute ending.
 *
 * Order matters. -eler and -eter are checked first because their stems also
 * satisfy the plainer e_er shape — *appeler* would otherwise come out
 * *j'apèle*. Consonant clusters separate the two vowel rules: a single
 * consonant after e (lever → lève) but one or two after é (régler → règle),
 * which is why *rester* stays *je reste*.
 */
function stemChange(infinitive, stem) {
  if (/(?:eler|eter)$/.test(infinitive) && !SPELLING_EXCEPTIONS.has(infinitive)) {
    return { strong: stem + stem.at(-1), weak: stem, futureFrom: 'strong', kind: 'double' };
  }
  if (/[^aeiouyéèêë]yer$/.test(infinitive) || /[aeiou]yer$/.test(infinitive)) {
    return { strong: `${stem.slice(0, -1)}i`, weak: stem, futureFrom: 'strong', kind: 'y→i' };
  }
  if (/e[^aeiouyâàéèêëîïôûùü]$/.test(stem)) {
    return { strong: `${stem.slice(0, -2)}è${stem.at(-1)}`, weak: stem, futureFrom: 'strong', kind: 'e→è' };
  }
  const accented = /é([^aeiouyâàéèêëîïôûùü]{1,2})$/.exec(stem);
  if (accented) {
    return {
      strong: `${stem.slice(0, -1 - accented[1].length)}è${accented[1]}`,
      weak: stem,
      // Traditional spelling keeps the é right through the future: je préférerai.
      futureFrom: 'weak',
      kind: 'é→è',
    };
  }
  return null;
}

/** Look up explicit irregularity, following prefixed derivatives to their base. */
function findIrregular(verb) {
  if (IRREGULARS[verb]) return { data: IRREGULARS[verb], prefix: '', base: verb };

  let best = null;
  for (const base of PREFIXABLE) {
    if (!IRREGULARS[base]) continue;
    if (verb.length <= base.length || !verb.endsWith(base)) continue;
    if (!best || base.length > best.base.length) {
      best = { data: IRREGULARS[base], prefix: verb.slice(0, verb.length - base.length), base };
    }
  }
  return best?.data ? best : null;
}

/** French prefixes never move an accent, so a derivative is the prefix plus the form. */
function withPrefix(value, prefix) {
  if (!prefix || value == null) return value;
  if (Array.isArray(value)) return value.map((item) => (item == null ? null : prefix + item));
  return prefix + value;
}

// --- the verb --------------------------------------------------------------

class FrenchVerb {
  constructor(infinitive, { plain = false } = {}) {
    const parts = classify(infinitive);
    this.infinitive = infinitive;
    this.stem = parts.stem;
    this.class = parts.ending;
    this.soften = softeningKind(infinitive);

    const found = plain ? null : findIrregular(infinitive);
    this.irr = found?.data ?? {};
    this.prefix = found?.prefix ?? '';
    this.base = found?.base ?? null;

    this.shortIr = this.class === 'ir' && SHORT_IR.has(infinitive);
    // conduire, traduire, construire, cuire … one pattern, so a rule rather
    // than a dozen entries. The s that appears before a sounded ending is the
    // whole of it: je conduis, nous conduisons, j'ai conduit.
    this.uire = !this.base && /uire$/.test(infinitive) ? infinitive.slice(0, -2) : null;
    this.change = this.class === 'er' && !this.irr.present ? stemChange(infinitive, parts.stem) : null;
  }

  /** The stem before a mute ending: je, tu, il, ils of the present and subjunctive. */
  get strongStem() {
    return this.change?.strong ?? this.stem;
  }

  /** The stem before an ending that is heard: nous, vous, and the imperfect. */
  get weakStem() {
    return this.change?.weak ?? this.stem;
  }

  present() {
    if (this.irr.present) return withPrefix(this.irr.present, this.prefix);

    if (this.class === 'er') {
      const endings = PRESENT.er;
      return endings.map((ending, index) => {
        const stem = [0, 1, 2, 5].includes(index) ? this.strongStem : this.weakStem;
        return join(stem, ending, this.soften);
      });
    }
    if (this.shortIr) {
      // The singular drops the last consonant of the stem: partir → je pars.
      const short = this.stem.slice(0, -1);
      return PRESENT.shortIr.map((ending, index) =>
        (index < 3 ? short : this.stem) + ending);
    }
    if (this.uire) {
      return [`${this.uire}s`, `${this.uire}s`, `${this.uire}t`,
        `${this.uire}sons`, `${this.uire}sez`, `${this.uire}sent`];
    }
    if (this.class === 'ir') return PRESENT.ir.map((ending) => this.stem + ending);
    if (this.class === 're') {
      // A stem already ending in d or t carries the third person on its own:
      // il vend, but il rompt.
      const third = /[dt]$/.test(this.stem) ? this.stem : `${this.stem}t`;
      return PRESENT.re.map((ending, index) => (index === 2 ? third : this.stem + ending));
    }
    // -oir has no productive pattern; anything reaching here is a gap in the data.
    return PRESENT.re.map((ending, index) => (index === 2 ? `${this.stem}t` : this.stem + (ending ?? '')));
  }

  /** Almost always the nous-present minus its ending — which is why être is the exception. */
  imparfaitStem() {
    if (this.irr.imparfaitStem) return this.prefix + this.irr.imparfaitStem;
    const nous = this.present()[3];
    if (nous?.endsWith('ons')) {
      const stem = nous.slice(0, -3);
      // Undo the softening: it belongs to the ending, and -ions does not take it.
      if (this.soften === 'g' && stem.endsWith('e')) return stem.slice(0, -1);
      if (this.soften === 'c' && stem.endsWith('ç')) return `${stem.slice(0, -1)}c`;
      return stem;
    }
    return this.weakStem;
  }

  futurStem() {
    if (this.irr.futurStem) return this.prefix + this.irr.futurStem;
    if (this.class === 'er') {
      const stem = this.change?.futureFrom === 'weak' ? this.weakStem : this.strongStem;
      return `${stem}er`;
    }
    if (this.class === 're') return this.infinitive.slice(0, -1);
    return this.infinitive;
  }

  passeSimple() {
    if (this.irr.passeSimple) return withPrefix(this.irr.passeSimple, this.prefix);
    if (this.irr.passeSimpleStem) {
      const stem = this.prefix + this.irr.passeSimpleStem;
      return PASSE_SIMPLE[this.irr.passeSimpleType].map((ending) => stem + ending);
    }
    if (this.uire) return PASSE_SIMPLE.i.map((ending) => `${this.uire}s${ending}`);
    if (this.class === 'er') {
      return PASSE_SIMPLE.er.map((ending) => join(this.weakStem, ending, this.soften));
    }
    return PASSE_SIMPLE.i.map((ending) => this.stem + ending);
  }

  /** [strong, weak] — the subjunctive splits its stem exactly as the present does. */
  subjonctifStems() {
    if (this.irr.subjonctifStem) {
      const stem = this.prefix + this.irr.subjonctifStem;
      return [stem, stem];
    }
    if (this.uire) return [`${this.uire}s`, `${this.uire}s`];
    if (this.class === 'er') return [this.strongStem, this.weakStem];
    if (this.shortIr || this.class === 're') return [this.stem, this.stem];
    if (this.class === 'ir') return [`${this.stem}iss`, `${this.stem}iss`];
    return [this.stem, this.stem];
  }

  subjonctif() {
    if (this.irr.subjonctif) return withPrefix(this.irr.subjonctif, this.prefix);
    const [strong, weak] = this.subjonctifStems();
    return SUBJONCTIF.map((ending, index) =>
      join([0, 1, 2, 5].includes(index) ? strong : weak, ending, this.soften));
  }

  /**
   * Built from the passé simple, which is the only place it comes from: take
   * the second person singular without its s, and the third from the third
   * person with a circumflex.
   */
  subjonctifImparfait() {
    const ps = this.passeSimple();
    if (!ps[1] || !ps[2]) return [null, null, ps[2] ? circumflexLastVowel(ps[2]) : null, null, null, null];
    const stem = ps[1].replace(/s$/, '');
    const third = circumflexLastVowel(ps[2]);
    return SUBJ_IMPARFAIT.map((ending, index) => {
      if (index === 2) return third.endsWith('t') ? third : `${third}t`;
      return stem + ending;
    });
  }

  participePasse() {
    if (this.irr.participePasse) return this.prefix + this.irr.participePasse;
    if (this.uire) return UIRE_SHORT_PARTICIPLE.has(this.infinitive) ? this.uire : `${this.uire}t`;
    if (this.class === 'er') return `${this.weakStem}é`;
    if (this.class === 'ir') return `${this.stem}i`;
    return `${this.stem}u`;
  }

  participePresent() {
    if (this.irr.participePresent !== undefined) {
      return this.irr.participePresent === null ? null : this.prefix + this.irr.participePresent;
    }
    return join(this.imparfaitStem(), 'ant', this.soften);
  }

  auxiliary(pronominal) {
    if (pronominal) return 'être';
    if (this.irr.aux) return this.irr.aux;
    return ETRE_VERBS.has(this.infinitive) ? 'être' : 'avoir';
  }
}

// --- agreement -------------------------------------------------------------

/**
 * A participle after être agrees with its subject, so the table cannot print
 * one string. The bracketed endings are how a French table writes it: *je suis
 * allé(e)*, *nous sommes allé(e)s*.
 */
function agree(participle, plural) {
  const feminine = participle.endsWith('e') ? participle : `${participle}(e)`;
  if (!plural) return feminine;
  return /[sx]$/.test(participle) ? `${participle}(es)` : `${feminine}s`;
}

function compound(auxForms, participle, agreeing) {
  return PERSONS.map((person, index) => {
    if (!auxForms[index]) return null;
    const past = agreeing ? agree(participle, index >= 3) : participle;
    return `${auxForms[index]} ${past}`;
  });
}

function blankDefective(table, persons) {
  if (!persons?.length) return;
  for (const mood of SHAPE.moods) {
    for (const forms of Object.values(table[mood])) {
      for (const person of persons) forms[person] = null;
    }
  }
  for (const forms of Object.values(table.imperatif)) {
    for (const person of Object.keys(forms)) forms[person] = null;
  }
}

// --- the paradigm ----------------------------------------------------------

/**
 * Build the full paradigm for a verb.
 * @returns {{ok: boolean, verb?: string, table?: object, error?: string}}
 */
export function conjugate(input, { plain = false } = {}) {
  const raw = normalizeVerb(input);
  if (!raw) return { ok: false, error: 'empty' };

  const { verb: bare, pronominal } = stripPronoun(raw);
  if (!classify(bare)) return { ok: false, error: 'not-an-infinitive', input: raw };

  const verb = new FrenchVerb(bare, { plain });

  const present = verb.present();
  const imparfaitStem = verb.imparfaitStem();
  const futurStem = verb.futurStem();
  const participePasse = verb.participePasse();
  const auxName = verb.auxiliary(pronominal);
  const aux = AUX[auxName];
  const agreeing = auxName === 'être';

  const indicatif = {
    present: row(present),
    imparfait: row(IMPARFAIT.map((ending) => join(imparfaitStem, ending, verb.soften))),
    passeSimple: row(verb.passeSimple()),
    futur: row(FUTUR.map((ending) => futurStem + ending)),
    conditionnel: row(CONDITIONNEL.map((ending) => futurStem + ending)),
    passeCompose: row(compound(aux.present, participePasse, agreeing)),
    plusQueParfait: row(compound(aux.imparfait, participePasse, agreeing)),
    passeAnterieur: row(compound(aux.passeSimple, participePasse, agreeing)),
    futurAnterieur: row(compound(aux.futur, participePasse, agreeing)),
    conditionnelPasse: row(compound(aux.conditionnel, participePasse, agreeing)),
  };

  const subjonctif = {
    present: row(verb.subjonctif()),
    imparfait: row(verb.subjonctifImparfait()),
    passe: row(compound(aux.subjPresent, participePasse, agreeing)),
    plusQueParfait: row(compound(aux.subjImparfait, participePasse, agreeing)),
  };

  // The tu imperative loses the s it only had before a written vowel:
  // tu parles but parle, tu ouvres but ouvre. -ir and -re verbs keep theirs.
  const explicit = verb.irr.imperatif ? withPrefix(verb.irr.imperatif, verb.prefix) : null;
  const tuForm = explicit
    ? explicit[0]
    : (present[1]?.endsWith('es') ? present[1].slice(0, -1) : present[1]);
  const affirmative = {
    tu: tuForm,
    nous: explicit ? explicit[1] : present[3],
    vous: explicit ? explicit[2] : present[4],
  };

  const negate = (form) => (form ? `${startsWithVowel(form) ? "n'" : 'ne '}${form} pas` : null);

  const imperatif = {
    affirmatif: pronominal
      ? {
        tu: affirmative.tu ? `${affirmative.tu}-toi` : null,
        nous: affirmative.nous ? `${affirmative.nous}-nous` : null,
        vous: affirmative.vous ? `${affirmative.vous}-vous` : null,
      }
      : affirmative,
    negatif: pronominal
      ? {
        tu: affirmative.tu ? `ne te ${affirmative.tu} pas` : null,
        nous: affirmative.nous ? `ne nous ${affirmative.nous} pas` : null,
        vous: affirmative.vous ? `ne vous ${affirmative.vous} pas` : null,
      }
      : {
        tu: negate(affirmative.tu),
        nous: negate(affirmative.nous),
        vous: negate(affirmative.vous),
      },
  };

  const table = {
    formes: {
      infinitif: raw,
      participePresent: verb.participePresent(),
      participePasse,
      infinitifPasse: `${aux.infinitif} ${participePasse}`,
      participeCompose: `${aux.participePresent} ${participePasse}`,
    },
    indicatif,
    subjonctif,
    imperatif,
  };

  blankDefective(table, verb.irr.defectivo ?? verb.irr.defective);

  return {
    ok: true,
    verb: bare,
    input: raw,
    class: verb.class,
    stem: verb.stem,
    source: 'local',
    pronominal,
    auxiliary: auxName,
    flags: {
      irregular: Boolean(verb.base),
      stemChange: verb.change?.kind ?? null,
      ortho: verb.soften ? (verb.soften === 'c' ? 'c → ç' : 'g → ge') : null,
      derivedFrom: verb.prefix ? verb.base : null,
      auxiliary: auxName,
      group: verb.class === 'er' ? 1 : (verb.class === 'ir' && !verb.shortIr && !verb.base) ? 2 : 3,
    },
    table,
  };
}

/**
 * Cells where a table differs from the naive regular conjugation — the forms a
 * learner actually has to remember.
 */
export function irregularCells(infinitive, table = null) {
  const shown = table ?? conjugate(infinitive).table;
  const plain = conjugate(infinitive, { plain: true });
  const marks = new Set();
  if (!shown || !plain.ok) return marks;

  for (const mood of SHAPE.moods) {
    for (const [tense, forms] of Object.entries(shown[mood] ?? {})) {
      const reference = plain.table[mood][tense];
      if (!reference) continue;
      for (const person of PERSONS) {
        if (forms[person] && forms[person] !== reference[person]) marks.add(`${mood}.${tense}.${person}`);
      }
    }
  }
  for (const [kind, forms] of Object.entries(shown.imperatif ?? {})) {
    for (const [person, form] of Object.entries(forms)) {
      if (form && form !== plain.table.imperatif[kind]?.[person]) marks.add(`imperatif.${kind}.${person}`);
    }
  }
  for (const [name, form] of Object.entries(shown.formes ?? {})) {
    if (form && form !== plain.table.formes[name]) marks.add(`formes.${name}`);
  }
  return marks;
}
