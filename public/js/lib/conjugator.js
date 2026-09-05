/**
 * Spanish conjugation engine.
 *
 * Builds the full paradigm for a verb: every simple and compound tense of the
 * indicative and subjunctive, both imperatives, and the non-finite forms.
 *
 * Coverage, in the order the rules are applied:
 *   1. regular -ar / -er / -ir endings
 *   2. orthographic changes that only preserve pronunciation
 *      (buscar → busqué, llegar → llegué, coger → cojo, conocer → conozco,
 *       leer → leyó, construir → construyo, gruñir → gruñó, seguir → sigo)
 *   3. stressed-stem vowel changes (pensar → pienso, dormir → durmió)
 *   4. explicit irregular forms and stems, inherited by prefixed derivatives
 *      (tener → obtener, poner → proponer)
 */

import { IRREGULARS, PREFIXABLE, STEM_CHANGES } from '../data/verbs.js';

export const PERSONS = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'];

export const PERSON_LABELS = {
  yo: 'yo',
  tu: 'tú',
  el: 'él / ella / usted',
  nosotros: 'nosotros / nosotras',
  vosotros: 'vosotros / vosotras',
  ellos: 'ellos / ellas / ustedes',
};

const VOWELS = 'aeiouáéíóú';
const ACCENTS = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };
const PLAIN = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };

const ENDINGS = {
  ar: {
    presente: ['o', 'as', 'a', 'amos', 'áis', 'an'],
    imperfecto: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
    preterito: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
    subjuntivo: ['e', 'es', 'e', 'emos', 'éis', 'en'],
    gerundio: 'ando',
    participio: 'ado',
  },
  er: {
    presente: ['o', 'es', 'e', 'emos', 'éis', 'en'],
    imperfecto: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    preterito: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    subjuntivo: ['a', 'as', 'a', 'amos', 'áis', 'an'],
    gerundio: 'iendo',
    participio: 'ido',
  },
  ir: {
    presente: ['o', 'es', 'e', 'imos', 'ís', 'en'],
    imperfecto: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    preterito: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    subjuntivo: ['a', 'as', 'a', 'amos', 'áis', 'an'],
    gerundio: 'iendo',
    participio: 'ido',
  },
};

const FUTURO = ['é', 'ás', 'á', 'emos', 'éis', 'án'];
const CONDICIONAL = ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'];
const STRONG_PRETERITE = ['e', 'iste', 'o', 'imos', 'isteis', 'ieron'];
const IMPERFECTO_SUBJ_RA = ['ra', 'ras', 'ra', 'ramos', 'rais', 'ran'];
const IMPERFECTO_SUBJ_SE = ['se', 'ses', 'se', 'semos', 'seis', 'sen'];
const FUTURO_SUBJ = ['re', 'res', 're', 'remos', 'reis', 'ren'];

const HABER = {
  presente: ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
  imperfecto: ['había', 'habías', 'había', 'habíamos', 'habíais', 'habían'],
  preterito: ['hube', 'hubiste', 'hubo', 'hubimos', 'hubisteis', 'hubieron'],
  futuro: ['habré', 'habrás', 'habrá', 'habremos', 'habréis', 'habrán'],
  condicional: ['habría', 'habrías', 'habría', 'habríamos', 'habríais', 'habrían'],
  subjuntivo: ['haya', 'hayas', 'haya', 'hayamos', 'hayáis', 'hayan'],
  imperfectoRa: ['hubiera', 'hubieras', 'hubiera', 'hubiéramos', 'hubierais', 'hubieran'],
  imperfectoSe: ['hubiese', 'hubieses', 'hubiese', 'hubiésemos', 'hubieseis', 'hubiesen'],
  futuroSubj: ['hubiere', 'hubieres', 'hubiere', 'hubiéremos', 'hubiereis', 'hubieren'],
};

/** Verbs whose -cer/-cir looks inchoative but is not: cocer → cuezo, not cuezco. */
const NOT_INCHOATIVE = new Set(['cocer', 'escocer', 'mecer', 'remecer']);

const STRONG_TO_WEAK = { 'e:ie': 'e:i', 'e:i': 'e:i', 'o:ue': 'o:u' };

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

export function normalizeVerb(input) {
  return String(input ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

function accentLastVowel(word) {
  for (let i = word.length - 1; i >= 0; i -= 1) {
    const replacement = ACCENTS[word[i]];
    if (replacement) return word.slice(0, i) + replacement + word.slice(i + 1);
  }
  return word;
}

function syllableCount(word) {
  return (word.match(/[aeiouáéíóú]+/g) || []).length;
}

/**
 * Replace the last occurrence of `from` in the stem with `to`. A g before the
 * new diphthong needs a diaeresis to stay soft: avergonzar → avergüenzo.
 */
function shiftStem(stem, from, to) {
  const at = stem.lastIndexOf(from);
  if (at === -1) return stem;
  const head = stem.slice(0, at);
  const replacement = to.startsWith('ue') && head.endsWith('g') ? `ü${to.slice(1)}` : to;
  return head + replacement + stem.slice(at + from.length);
}

function row(forms) {
  return Object.fromEntries(PERSONS.map((person, index) => [person, forms[index] ?? null]));
}

// ---------------------------------------------------------------------------
// analysis
// ---------------------------------------------------------------------------

/** Split an infinitive into stem + conjugation class, or null if it is not one. */
export function classify(infinitive) {
  if (/ír$/.test(infinitive)) return { stem: infinitive.slice(0, -2), ending: 'ir', accentedInfinitive: true };
  if (/[aei]r$/.test(infinitive)) return { stem: infinitive.slice(0, -2), ending: infinitive.slice(-2), accentedInfinitive: false };
  return null;
}

/** Sound-preserving spelling change triggered by the vowel that follows the stem. */
function orthoRule(infinitive) {
  if (/guar$/.test(infinitive)) return { before: 'e', from: 'gu', to: 'gü' };
  if (/car$/.test(infinitive)) return { before: 'e', from: 'c', to: 'qu' };
  if (/gar$/.test(infinitive)) return { before: 'e', from: 'g', to: 'gu' };
  if (/zar$/.test(infinitive)) return { before: 'e', from: 'z', to: 'c' };
  if (/guir$/.test(infinitive)) return { before: 'ao', from: 'gu', to: 'g' };
  if (/quir$/.test(infinitive)) return { before: 'ao', from: 'qu', to: 'c' };
  if (/g(er|ir)$/.test(infinitive)) return { before: 'ao', from: 'g', to: 'j' };
  if (/c(er|ir)$/.test(infinitive)) {
    const inchoative = /[aeiouáéíóú]c(er|ir)$/.test(infinitive) && !NOT_INCHOATIVE.has(infinitive);
    return { before: 'ao', from: 'c', to: inchoative ? 'zc' : 'z' };
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
  return best;
}

/**
 * "obtener" inherits "tener" but the tú imperative gains an accent, because a
 * word ending in n / s / vowel is otherwise stressed on the penultimate
 * syllable: ten → obtén, pon → propón.
 */
function prefixImperative(form, prefix, base) {
  if (!prefix) return form;
  if (base === 'decir') return null; // predecir → predice, not "predí"
  if (syllableCount(form) === 1 && /[ns]$|[aeiou]$/.test(form)) return prefix + accentLastVowel(form);
  return prefix + form;
}

/**
 * A monosyllable that carried its stress implicitly needs a written accent once
 * a prefix makes the word longer: reír → rio, but sonreír → sonrió.
 */
function prefixForm(form, prefix) {
  if (!prefix || form == null) return form;
  const unaccented = !/[áéíóú]/.test(form);
  if (unaccented && syllableCount(form) === 1 && VOWELS.includes(form.slice(-1))) {
    return prefix + accentLastVowel(form);
  }
  return prefix + form;
}

function withPrefix(value, prefix) {
  if (!prefix || value == null) return value;
  if (Array.isArray(value)) return value.map((item) => prefixForm(item, prefix));
  if (typeof value === 'string') return prefixForm(value, prefix);
  return value;
}

// ---------------------------------------------------------------------------
// the engine
// ---------------------------------------------------------------------------

class Verb {
  constructor(infinitive, { plain = false } = {}) {
    this.infinitive = infinitive;
    const parts = classify(infinitive);
    this.stem = parts.stem;
    this.class = parts.ending;
    this.accentedInfinitive = parts.accentedInfinitive;
    this.endings = ENDINGS[this.class];
    this.ortho = orthoRule(infinitive);

    const found = plain ? null : findIrregular(infinitive);
    this.prefix = found?.prefix ?? '';
    this.base = found?.base ?? null;
    this.irr = found ? found.data : {};

    this.stemChange = plain ? null : (this.irr.stemChange ?? STEM_CHANGES[infinitive] ?? null);
    if (!this.stemChange && !plain && found?.prefix) {
      this.stemChange = STEM_CHANGES[found.base] ?? null;
    }

    // -ducir verbs take a strong -duj- preterite: conducir → conduje.
    if (!plain && !this.irr.preteritoStem && !this.irr.preterito && /ducir$/.test(infinitive)) {
      this.irr = { ...this.irr, preteritoStem: `${infinitive.slice(0, -5)}duj` };
    }

    this.strongStem = this.buildStrongStem();
    this.weakStem = this.buildWeakStem();
  }

  buildStrongStem() {
    const { stem, stemChange } = this;
    if (!stemChange) return stem;
    switch (stemChange) {
      case 'e:ie': return shiftStem(stem, 'e', 'ie');
      case 'o:ue': return shiftStem(stem, 'o', 'ue');
      case 'e:i': return shiftStem(stem, 'e', 'i');
      case 'u:ue': return shiftStem(stem, 'u', 'ue');
      case 'i:ie': return shiftStem(stem, 'i', 'ie');
      case 'o:hue': return shiftStem(stem, 'o', 'hue');
      case 'i:í': return accentLastVowel(stem);
      case 'u:ú': return accentLastVowel(stem);
      case 'uir': return `${stem}y`;
      default: return stem;
    }
  }

  /** -ir stem changers weaken the vowel outside the stress: dormir → durmió. */
  buildWeakStem() {
    if (this.class !== 'ir' || !this.stemChange) return this.stem;
    const weak = STRONG_TO_WEAK[this.stemChange];
    if (!weak) return this.stem;
    const [from, to] = weak.split(':');
    return shiftStem(this.stem, from, to);
  }

  /**
   * Attach an ending to a stem, applying the spelling rules that depend on the
   * two of them meeting.
   */
  join(stem, ending) {
    let result = stem;
    let suffix = ending;

    const trigger = PLAIN[suffix[0]] ?? suffix[0];
    if (this.ortho && this.ortho.before.includes(trigger) && result.endsWith(this.ortho.from)) {
      result = result.slice(0, -this.ortho.from.length) + this.ortho.to;
    }

    const last = result.slice(-1);
    const digraph = result.endsWith('gu') || result.endsWith('qu');

    // `ir` has an empty stem, so guard before treating `last` as a letter.
    if (last && suffix.startsWith('i') && suffix.length > 1) {
      if ((result.endsWith('ñ') || result.endsWith('ll')) && VOWELS.includes(suffix[1])) {
        suffix = suffix.slice(1); // gruñir → gruñó, bullir → bulló
      } else if (VOWELS.includes(last) && !digraph) {
        if (VOWELS.includes(suffix[1])) {
          suffix = `y${suffix.slice(1)}`; // leer → leyó, construir → construyendo
        } else if ('aeo'.includes(last)) {
          suffix = `í${suffix.slice(1)}`; // leer → leíste, caer → caído
        }
      }
    }

    return result + suffix;
  }

  presentStemFor(index) {
    return [0, 1, 2, 5].includes(index) ? this.strongStem : this.stem;
  }

  presente() {
    if (this.irr.presente) return withPrefix(this.irr.presente, this.prefix);
    return PERSONS.map((_, index) => {
      if (index === 0 && this.irr.presenteYo) return this.prefix + this.irr.presenteYo;
      return this.join(this.presentStemFor(index), this.endings.presente[index]);
    });
  }

  imperfecto() {
    if (this.irr.imperfecto) return withPrefix(this.irr.imperfecto, this.prefix);
    return this.endings.imperfecto.map((ending) => this.join(this.stem, ending));
  }

  preterito() {
    let forms;
    if (this.irr.preterito) {
      forms = withPrefix(this.irr.preterito, this.prefix);
    } else if (this.irr.preteritoStem) {
      const stem = this.prefix + this.irr.preteritoStem;
      forms = STRONG_PRETERITE.map((ending, index) => {
        if (index === 5 && stem.endsWith('j')) return `${stem}eron`; // dijeron, trajeron
        return stem + ending;
      });
    } else {
      forms = this.endings.preterito.map((ending, index) => {
        // -ir stem changers weaken in the third persons: pidió, durmieron
        const stem = [2, 5].includes(index) ? this.weakStem : this.stem;
        return this.join(stem, ending);
      });
    }
    if (this.irr.preteritoOverrides) {
      forms = forms.slice();
      for (const [person, form] of Object.entries(this.irr.preteritoOverrides)) {
        forms[PERSONS.indexOf(person)] = this.prefix + form;
      }
    }
    return forms;
  }

  futureStem() {
    if (this.irr.futuroStem) return this.prefix + this.irr.futuroStem;
    // The stress moves off the infinitive's í: oír → oiré, reír → reiré.
    return this.accentedInfinitive ? `${this.infinitive.slice(0, -2)}ir` : this.infinitive;
  }

  futuro() {
    const stem = this.futureStem();
    return FUTURO.map((ending) => stem + ending);
  }

  condicional() {
    const stem = this.futureStem();
    return CONDICIONAL.map((ending) => stem + ending);
  }

  presenteSubjuntivo() {
    if (this.irr.presenteSubj) return withPrefix(this.irr.presenteSubj, this.prefix);
    if (this.irr.presenteYo) {
      const stem = this.prefix + this.irr.presenteYo.replace(/o$/, '');
      return this.endings.subjuntivo.map((ending) => stem + ending);
    }
    return this.endings.subjuntivo.map((ending, index) => {
      let stem;
      // -uir keeps its y right through the subjunctive: construyamos, construyáis
      if (this.stemChange === 'uir' || [0, 1, 2, 5].includes(index)) stem = this.strongStem;
      else if (this.class === 'ir') stem = this.weakStem; // durmamos, pidáis
      else stem = this.stem;
      return this.join(stem, ending);
    });
  }

  /**
   * The two imperfect subjunctive series and the future subjunctive are all
   * built from the third person plural preterite minus -ron, with the
   * nosotros form taking a written accent (hablaron → habláramos).
   */
  pastSubjunctive(endings) {
    const base = this.preterito()[5].replace(/ron$/, '');
    const accented = accentLastVowel(base);
    return endings.map((ending, index) => (index === 3 ? accented : base) + ending);
  }

  gerundio() {
    if (this.irr.gerundio) return this.prefix + this.irr.gerundio;
    if (this.class === 'ar') return `${this.stem}ando`;
    return this.join(this.weakStem, 'iendo');
  }

  participio() {
    if (this.irr.participio) return this.prefix + this.irr.participio;
    if (this.class === 'ar') return `${this.stem}ado`;
    return this.join(this.stem, 'ido');
  }
}

function compound(auxiliary, participle) {
  return auxiliary.map((form) => `${form} ${participle}`);
}

function blankDefective(table, defective) {
  if (!defective?.length) return;
  for (const mood of ['indicativo', 'subjuntivo']) {
    for (const tense of Object.values(table[mood])) {
      for (const person of defective) tense[person] = null;
    }
  }
  table.imperativo.afirmativo.tu = null;
  table.imperativo.afirmativo.nosotros = null;
  table.imperativo.afirmativo.vosotros = null;
  table.imperativo.negativo.tu = null;
  table.imperativo.negativo.nosotros = null;
  table.imperativo.negativo.vosotros = null;
}

/**
 * Conjugate an infinitive.
 * @param {string} input infinitive, with or without a reflexive -se
 * @param {{plain?: boolean}} options plain:true ignores every irregularity,
 *        which is how the UI works out which cells are irregular.
 */
export function conjugate(input, options = {}) {
  const raw = normalizeVerb(input);
  const pronominal = /(ar|er|ir|ír)se$/.test(raw);
  const infinitive = pronominal ? raw.slice(0, -2) : raw;

  if (!classify(infinitive)) {
    return { ok: false, error: `"${raw}" no parece un infinitivo. Prueba con algo terminado en -ar, -er o -ir.` };
  }

  const verb = new Verb(infinitive, options);
  const participio = verb.participio();

  const indicativo = {
    presente: row(verb.presente()),
    preterito: row(verb.preterito()),
    imperfecto: row(verb.imperfecto()),
    futuro: row(verb.futuro()),
    condicional: row(verb.condicional()),
    preteritoPerfecto: row(compound(HABER.presente, participio)),
    pluscuamperfecto: row(compound(HABER.imperfecto, participio)),
    preteritoAnterior: row(compound(HABER.preterito, participio)),
    futuroPerfecto: row(compound(HABER.futuro, participio)),
    condicionalPerfecto: row(compound(HABER.condicional, participio)),
  };

  const subjuntivo = {
    presente: row(verb.presenteSubjuntivo()),
    imperfectoRa: row(verb.pastSubjunctive(IMPERFECTO_SUBJ_RA)),
    imperfectoSe: row(verb.pastSubjunctive(IMPERFECTO_SUBJ_SE)),
    futuro: row(verb.pastSubjunctive(FUTURO_SUBJ)),
    perfecto: row(compound(HABER.subjuntivo, participio)),
    pluscuamperfectoRa: row(compound(HABER.imperfectoRa, participio)),
    pluscuamperfectoSe: row(compound(HABER.imperfectoSe, participio)),
    futuroPerfecto: row(compound(HABER.futuroSubj, participio)),
  };

  const subjunctivePresent = subjuntivo.presente;
  const tuImperative = verb.irr.imperativoTu
    ? prefixImperative(verb.irr.imperativoTu, verb.prefix, verb.base)
    : null;

  const imperativo = {
    afirmativo: {
      tu: tuImperative ?? indicativo.presente.el,
      usted: subjunctivePresent.el,
      nosotros: subjunctivePresent.nosotros,
      vosotros: `${infinitive.slice(0, -1)}d`,
      ustedes: subjunctivePresent.ellos,
    },
    negativo: {
      tu: `no ${subjunctivePresent.tu}`,
      usted: `no ${subjunctivePresent.el}`,
      nosotros: `no ${subjunctivePresent.nosotros}`,
      vosotros: `no ${subjunctivePresent.vosotros}`,
      ustedes: `no ${subjunctivePresent.ellos}`,
    },
  };

  const table = {
    formas: {
      infinitivo: raw,
      gerundio: verb.gerundio(),
      participio,
      infinitivoCompuesto: `haber ${participio}`,
      gerundioCompuesto: `habiendo ${participio}`,
    },
    indicativo,
    subjuntivo,
    imperativo,
  };

  blankDefective(table, verb.irr.defectivo);

  return {
    ok: true,
    verb: infinitive,
    input: raw,
    class: verb.class,
    stem: verb.stem,
    source: 'local',
    pronominal,
    flags: {
      irregular: Boolean(verb.base),
      stemChange: verb.stemChange,
      ortho: verb.ortho ? `${verb.ortho.from} → ${verb.ortho.to}` : null,
      derivedFrom: verb.prefix ? verb.base : null,
    },
    table,
  };
}

/**
 * Cells where a table differs from the naive regular conjugation — i.e. the
 * forms a learner has to remember. Pass a table to check the one actually on
 * screen (which may carry RAE's forms rather than ours).
 */
export function irregularCells(infinitive, table = null) {
  const shown = table ?? conjugate(infinitive).table;
  const plain = conjugate(infinitive, { plain: true });
  const marks = new Set();
  if (!shown || !plain.ok) return marks;

  for (const mood of ['indicativo', 'subjuntivo']) {
    for (const [tense, forms] of Object.entries(shown[mood] ?? {})) {
      const reference = plain.table[mood][tense];
      if (!reference) continue;
      for (const person of PERSONS) {
        if (forms[person] && forms[person] !== reference[person]) marks.add(`${mood}.${tense}.${person}`);
      }
    }
  }
  for (const [kind, forms] of Object.entries(shown.imperativo ?? {})) {
    for (const [person, form] of Object.entries(forms)) {
      if (form && form !== plain.table.imperativo[kind]?.[person]) marks.add(`imperativo.${kind}.${person}`);
    }
  }
  for (const [name, form] of Object.entries(shown.formas ?? {})) {
    if (form && form !== plain.table.formas[name]) marks.add(`formas.${name}`);
  }
  return marks;
}
