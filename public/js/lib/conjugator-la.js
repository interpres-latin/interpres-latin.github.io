/**
 * Latin conjugation engine.
 *
 * Built from the principal parts, because that is what a Latin verb *is* to a
 * reader: three stems quoted together. The second part gives the present stem
 * and the conjugation, the third the perfect stem, the fourth the supine stem.
 *
 *   amo, amare, amavi, amatus       ama-   amav-  amat-
 *   rego, regere, rexi, rectus      reg-   rex-   rect-
 *
 * Everything else is endings on one of those three, which is why a verb whose
 * parts you know is fully conjugable and one whose parts you do not know is not
 * conjugable at all.
 *
 * Voice is folded into the tense list rather than made a third axis, so the
 * table stays mood → tense → person like the Spanish and French ones and the
 * page can render all three with one set of code. The two tables a mood is
 * drawn as are active and passive here, where they are simple and compound
 * in the modern languages.
 */

import { DEPONENTS, IRREGULARS, PREFIXABLE } from '../data/verbs-la.js';

export const PERSONS = ['s1', 's2', 's3', 'p1', 'p2', 'p3'];

export const PERSON_LABELS = {
  s1: 'ego', s2: 'tu', s3: 'is / ea / id', p1: 'nos', p2: 'vos', p3: 'ei / eae / ea',
};

export const IMPERATIVE_PERSONS = ['tu', 'vos'];

export const SHAPE = {
  moods: ['indicativus', 'coniunctivus'],
  imperative: 'imperativus',
  nonFinite: 'formae',
};

// --- endings ---------------------------------------------------------------

const ACTIVE = ['o', 's', 't', 'mus', 'tis', 'nt'];
const ACTIVE_M = ['m', 's', 't', 'mus', 'tis', 'nt'];
const PASSIVE = ['or', 'ris', 'tur', 'mur', 'mini', 'ntur'];
const PASSIVE_R = ['r', 'ris', 'tur', 'mur', 'mini', 'ntur'];

/** The perfect active has endings of its own, shared by every conjugation. */
const PERFECT = ['i', 'isti', 'it', 'imus', 'istis', 'erunt'];
const PLUPERFECT = ['eram', 'eras', 'erat', 'eramus', 'eratis', 'erant'];
const FUTURE_PERFECT = ['ero', 'eris', 'erit', 'erimus', 'eritis', 'erint'];
const SUBJ_PERFECT = ['erim', 'eris', 'erit', 'erimus', 'eritis', 'erint'];
const SUBJ_PLUPERFECT = ['issem', 'isses', 'isset', 'issemus', 'issetis', 'issent'];

/** sum, for the compound passive tenses it forms with the perfect participle. */
const SUM = {
  praesens: ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'],
  imperfectum: ['eram', 'eras', 'erat', 'eramus', 'eratis', 'erant'],
  futurum: ['ero', 'eris', 'erit', 'erimus', 'eritis', 'erunt'],
  coniunctivusPraesens: ['sim', 'sis', 'sit', 'simus', 'sitis', 'sint'],
  coniunctivusImperfectum: ['essem', 'esses', 'esset', 'essemus', 'essetis', 'essent'],
};

const strip = (word) => String(word ?? '').trim().toLowerCase();

function row(forms) {
  return Object.fromEntries(PERSONS.map((person, index) => [person, forms[index] ?? null]));
}

const add = (stem, endings) => endings.map((ending) => (stem == null ? null : stem + ending));

/** Swap an active personal ending for the matching passive one. */
const passiveOf = (activeForms, endings) => activeForms.map((form, index) => {
  if (!form) return null;
  return form.replace(/(?:o|m)$/, '') + endings[index];
});

// --- the parts -------------------------------------------------------------

/** Split "amo, amare, amavi, amatus" into its parts. */
export function parseParts(input) {
  return String(input ?? '')
    .split(',')
    .map((part) => strip(part).replace(/\(.*?\)/g, '').split(/\s+/)[0].replace(/[^a-z]/g, ''))
    .filter(Boolean);
}

/**
 * Which conjugation, and the present stem.
 *
 * The infinitive decides. The only pair that cannot be told apart by it is the
 * third and the third -io, which share *-ere* — so the first principal part
 * breaks the tie, exactly as a textbook tells you to look at *capio* against
 * *rego*.
 */
export function classify(parts) {
  const [first, infinitive] = parts;
  if (!first || !infinitive) return null;

  if (infinitive.endsWith('are')) return { conjugation: '1st', stem: infinitive.slice(0, -2) };
  if (infinitive.endsWith('ire')) return { conjugation: '4th', stem: infinitive.slice(0, -2) };

  // A deponent quotes the passive infinitive, which is where its conjugation
  // shows: conari, vereri, partiri, and a bare -i for the third.
  if (infinitive.endsWith('ari')) return { conjugation: '1st', stem: infinitive.slice(0, -2), deponent: true };
  if (infinitive.endsWith('eri')) return { conjugation: '2nd', stem: infinitive.slice(0, -2), deponent: true };
  if (infinitive.endsWith('iri')) return { conjugation: '4th', stem: infinitive.slice(0, -2), deponent: true };
  if (infinitive.endsWith('i') && first.endsWith('r')) {
    const stem = infinitive.slice(0, -1);
    return { conjugation: /ior$/.test(first) ? '3rd-io' : '3rd', stem, deponent: true };
  }
  if (infinitive.endsWith('ere')) {
    // Without macrons *monēre* and *regere* are spelled alike, so the
    // infinitive cannot tell the second conjugation from the third. The first
    // principal part can: a second conjugation verb ends in -eo and a third
    // -io verb ends in -io, which is the same test a textbook gives.
    if (/eo$/.test(first)) return { conjugation: '2nd', stem: infinitive.slice(0, -2) };
    if (/io$/.test(first)) return { conjugation: '3rd-io', stem: infinitive.slice(0, -3) };
    return { conjugation: '3rd', stem: infinitive.slice(0, -3) };
  }
  // esse, posse, velle, nolle, malle, ferre, fieri — the infinitives that do
  // not end in -re at all, or end in it without belonging to a conjugation.
  // Everything they need comes from their entry in data/verbs-la.js; the stem
  // here only feeds the gerund, which several of them do not have either.
  if (/(?:re|se|le|ri)$/.test(infinitive)) {
    return { conjugation: 'irregular', stem: infinitive.replace(/(?:re|sse|lle|ri)$/, '') };
  }
  return null;
}

/**
 * The prefixes Latin actually builds compound verbs with.
 *
 * Without this list any verb ending in the letters of a base counts as a
 * compound of it, and *moneo* becomes *mon-* plus *eo* — inheriting the
 * irregular forms of "to go" and conjugating as *monis, monit, moneunt*.
 * A real compound takes a real preposition.
 */
const PREFIXES = new Set([
  'ab', 'abs', 'ad', 'ante', 'circum', 'co', 'con', 'com', 'de', 'dis', 'di',
  'e', 'ex', 'in', 'inter', 'intro', 'ob', 'per', 'prae', 'praeter', 'pro',
  'prod', 'red', 're', 'retro', 'se', 'sub', 'subter', 'super', 'trans', 'tra',
  'af', 'ag', 'al', 'ap', 'ar', 'as', 'at', 'ac', 'il', 'im', 'ir', 'col', 'cor',
  'of', 'op', 'suc', 'suf', 'sug', 'sup', 'sus', 'ne', 'non', 've',
]);

/** Look up explicit irregularity, following compounds to their base. */
function findIrregular(lemma) {
  if (IRREGULARS[lemma]) return { data: IRREGULARS[lemma], prefix: '', base: lemma };
  let best = null;
  for (const base of PREFIXABLE) {
    if (!IRREGULARS[base]) continue;
    if (lemma.length <= base.length || !lemma.endsWith(base)) continue;
    const prefix = lemma.slice(0, lemma.length - base.length);
    if (!PREFIXES.has(prefix)) continue;
    if (!best || base.length > best.base.length) best = { data: IRREGULARS[base], prefix, base };
  }
  return best;
}

const withPrefix = (value, prefix) => {
  if (!prefix || value == null) return value;
  if (Array.isArray(value)) return value.map((item) => (item == null ? null : prefix + item));
  return prefix + item(value, prefix);
};
const item = (value, prefix) => prefix + value;

// --- the paradigm ----------------------------------------------------------

/**
 * Build the full paradigm for a verb.
 * @param {string} input  principal parts, or a bare lemma if it is a known irregular
 * @returns {{ok: boolean, table?: object, error?: string}}
 */
export function conjugate(input, { plain = false } = {}) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: false, error: 'empty' };

  let parts = parseParts(raw);
  const lemma = parts[0];
  if (!lemma) return { ok: false, error: 'empty' };

  const found = plain ? null : findIrregular(lemma);
  // A bare lemma is enough when it is a verb we hold parts for.
  if (parts.length < 2 && found?.data?.parts) {
    parts = parseParts(found.data.parts).map((part, index) => (index === 0 ? lemma : found.prefix + part));
  }
  if (parts.length < 2) return { ok: false, error: 'needs-principal-parts' };

  const shape = classify(parts);
  if (!shape) return { ok: false, error: 'not-a-verb' };

  const irr = found?.data ?? {};
  const prefix = found?.prefix ?? '';
  // A deponent is passive in form and active in meaning, so its perfect system
  // is a participle plus sum. Semi-deponents do that for the perfect only.
  const deponent = DEPONENTS.has(lemma) || Boolean(irr.semiDeponent) || Boolean(shape.deponent)
    || (parts.length === 3 && /(?:or|r)$/.test(lemma));
  // A deponent is passive in form throughout the present system, so the forms
  // that carry its active meaning are the passive ones. Everything is built
  // both ways and the right set is chosen at the end.
  const passiveMeansActive = deponent && !irr.semiDeponent;

  const present = shape.stem;
  const perfectStem = parts[2] ? parts[2].replace(/i$/, '') : null;
  // The fourth part is quoted as a participle (amatus) or as a supine (amatum);
  // either way the stem is what is left when the ending goes.
  const supineStem = parts[3] ? parts[3].replace(/(?:us|um|a)$/, '') : (deponent && parts[2] ? parts[2].replace(/(?:us|um)$/, '') : null);

  const conj = shape.conjugation;
  const io = conj === '3rd-io' || conj === '4th';
  const third = conj === '3rd' || conj === '3rd-io';

  // --- present system, active ---
  const praesens = irr.praesens ? withPrefix(irr.praesens, prefix) : (() => {
    if (conj === '1st') return [`${present.slice(0, -1)}o`, ...add(present, ACTIVE.slice(1))];
    if (conj === '2nd') return add(present, ACTIVE);
    if (conj === '3rd') return [`${present}o`, `${present}is`, `${present}it`, `${present}imus`, `${present}itis`, `${present}unt`];
    if (conj === '3rd-io') return [`${present}io`, `${present}is`, `${present}it`, `${present}imus`, `${present}itis`, `${present}iunt`];
    return [`${present}o`, ...add(present, ACTIVE.slice(1, 5)), `${present}unt`];
  })();

  const imperfectStem = present + ({
    '1st': 'ba', '2nd': 'ba', '3rd': 'eba', '3rd-io': 'ieba', '4th': 'eba',
  }[conj] ?? 'ba');
  const imperfectum = irr.imperfectum ? withPrefix(irr.imperfectum, prefix) : add(imperfectStem, ACTIVE_M);

  const futurum = irr.futurum ? withPrefix(irr.futurum, prefix) : (() => {
    if (conj === '1st' || conj === '2nd') return [`${present}bo`, `${present}bis`, `${present}bit`, `${present}bimus`, `${present}bitis`, `${present}bunt`];
    const stem = conj === '3rd-io' ? `${present}i` : present;
    return [`${stem}am`, `${stem}es`, `${stem}et`, `${stem}emus`, `${stem}etis`, `${stem}ent`];
  })();

  // --- perfect system, active ---
  const perfectum = perfectStem ? add(perfectStem, PERFECT) : row([]);
  const plusquamperfectum = perfectStem ? add(perfectStem, PLUPERFECT) : [];
  const futurumExactum = perfectStem ? add(perfectStem, FUTURE_PERFECT) : [];

  // --- subjunctive, active ---
  // amo -> amem, moneo -> moneam, rego -> regam, capio -> capiam, audio -> audiam.
  const subjStem = conj === '1st' ? `${present.slice(0, -1)}e`
    : conj === '3rd-io' ? `${present}ia`
      : `${present}a`;
  const coniunctivusPraesens = irr.coniunctivusPraesens
    ? withPrefix(irr.coniunctivusPraesens, prefix)
    : add(subjStem, ACTIVE_M);

  const infinitive = parts[1];
  // A deponent quotes only the passive infinitive, but the imperfect
  // subjunctive is built on the active one in both voices — sequerer comes
  // from *sequere*, which is never printed in a dictionary.
  const activeInfinitive = passiveMeansActive
    ? `${present}${third ? 'ere' : 're'}`
    : infinitive;
  const coniunctivusImperfectum = irr.coniunctivusImperfectum
    ? withPrefix(irr.coniunctivusImperfectum, prefix)
    : add(activeInfinitive, ACTIVE_M);

  const coniunctivusPraesensPassivum = irr.coniunctivusPraesens
    ? passiveOf(withPrefix(irr.coniunctivusPraesens, prefix), PASSIVE_R)
    : add(subjStem, PASSIVE_R);
  const coniunctivusImperfectumPassivum = add(activeInfinitive, PASSIVE_R);

  const coniunctivusPerfectum = perfectStem ? add(perfectStem, SUBJ_PERFECT) : [];
  const coniunctivusPlusquamperfectum = perfectStem ? add(perfectStem, SUBJ_PLUPERFECT) : [];

  // --- passive ---
  const noPassive = Boolean(irr.noPassive);
  const participle = supineStem ? `${supineStem}us` : null;

  const praesensPassivum = noPassive ? [] : (irr.praesensPassivum ? withPrefix(irr.praesensPassivum, prefix) : (() => {
    if (conj === '1st') return [`${present.slice(0, -1)}or`, `${present}ris`, `${present}tur`, `${present}mur`, `${present}mini`, `${present}ntur`];
    if (conj === '2nd') return add(present, PASSIVE);
    if (conj === '3rd') return [`${present}or`, `${present}eris`, `${present}itur`, `${present}imur`, `${present}imini`, `${present}untur`];
    if (conj === '3rd-io') return [`${present}ior`, `${present}eris`, `${present}itur`, `${present}imur`, `${present}imini`, `${present}iuntur`];
    return [`${present}or`, `${present}ris`, `${present}tur`, `${present}mur`, `${present}mini`, `${present}untur`];
  })());

  const imperfectumPassivum = noPassive ? [] : add(imperfectStem, PASSIVE_R);
  const futurumPassivum = noPassive ? [] : (() => {
    if (conj === '1st' || conj === '2nd') return [`${present}bor`, `${present}beris`, `${present}bitur`, `${present}bimur`, `${present}bimini`, `${present}buntur`];
    const stem = conj === '3rd-io' ? `${present}i` : present;
    return [`${stem}ar`, `${stem}eris`, `${stem}etur`, `${stem}emur`, `${stem}emini`, `${stem}entur`];
  })();

  // Gated on having a participle alone: a verb with no passive can still form
  // its own perfect this way, which is what a deponent does.
  const compound = (auxiliary) => (participle
    ? auxiliary.map((aux) => `${participle} ${aux}`)
    : []);

  const indicativus = {
    praesens: row(passiveMeansActive ? praesensPassivum : praesens),
    imperfectum: row(passiveMeansActive ? imperfectumPassivum : imperfectum),
    futurum: row(passiveMeansActive ? futurumPassivum : futurum),
    perfectum: row(deponent ? compound(SUM.praesens) : perfectum),
    plusquamperfectum: row(deponent ? compound(SUM.imperfectum) : plusquamperfectum),
    futurumExactum: row(deponent ? compound(SUM.futurum) : futurumExactum),
    praesensPassivum: row(deponent ? [] : praesensPassivum),
    imperfectumPassivum: row(deponent ? [] : imperfectumPassivum),
    futurumPassivum: row(deponent ? [] : futurumPassivum),
    perfectumPassivum: row(deponent || noPassive ? [] : compound(SUM.praesens)),
    plusquamperfectumPassivum: row(deponent || noPassive ? [] : compound(SUM.imperfectum)),
    futurumExactumPassivum: row(deponent || noPassive ? [] : compound(SUM.futurum)),
  };

  const coniunctivus = {
    praesens: row(passiveMeansActive ? coniunctivusPraesensPassivum : coniunctivusPraesens),
    imperfectum: row(passiveMeansActive ? coniunctivusImperfectumPassivum : coniunctivusImperfectum),
    perfectum: row(deponent ? compound(SUM.coniunctivusPraesens) : coniunctivusPerfectum),
    plusquamperfectum: row(deponent ? compound(SUM.coniunctivusImperfectum) : coniunctivusPlusquamperfectum),
    praesensPassivum: row(deponent || noPassive ? [] : coniunctivusPraesensPassivum),
    imperfectumPassivum: row(deponent || noPassive ? [] : coniunctivusImperfectumPassivum),
    perfectumPassivum: row(deponent || noPassive ? [] : compound(SUM.coniunctivusPraesens)),
    plusquamperfectumPassivum: row(deponent || noPassive ? [] : compound(SUM.coniunctivusImperfectum)),
  };

  // --- imperative ---
  const explicit = irr.imperativus ? withPrefix(irr.imperativus, prefix) : null;
  // A deponent's imperative is passive in form too: sequere, sequimini.
  const singular = explicit ? explicit[0]
    : passiveMeansActive ? `${present}${third ? 'e' : ''}re`
      : (third ? `${present}e` : present);
  const plural = explicit ? explicit[1]
    : passiveMeansActive ? `${present}${third ? 'i' : ''}mini`
      : (third ? `${present}ite` : `${present}te`);

  const imperativus = {
    praesens: { tu: singular, vos: plural },
    negativus: {
      tu: singular ? `noli ${infinitive}` : null,
      vos: plural ? `nolite ${infinitive}` : null,
    },
  };

  // --- non-finite ---
  const presentParticiple = irr.participiumPraesens !== undefined
    ? (irr.participiumPraesens === null ? null : prefix + irr.participiumPraesens)
    : present + ({ '1st': 'ns', '2nd': 'ns', '3rd': 'ens', '3rd-io': 'iens', '4th': 'ens' }[conj] ?? 'ns');

  const missing = new Set(irr.without ?? []);
  const unless = (name, value) => (missing.has(name) ? null : value);

  const formae = {
    infinitivusPraesens: infinitive,
    infinitivusPraesensPassivus: noPassive ? null : (third ? `${present}i` : `${infinitive.slice(0, -1)}i`),
    infinitivusPerfectus: perfectStem ? `${perfectStem}isse` : (deponent && participle ? `${participle} esse` : null),
    infinitivusFuturus: supineStem ? `${supineStem}urus esse` : null,
    participiumPraesens: presentParticiple,
    participiumPerfectum: participle,
    participiumFuturum: unless('participiumFuturum', supineStem ? `${supineStem}urus` : null),
    gerundivum: unless('gerundivum', present + ({ '1st': 'ndus', '2nd': 'ndus', '3rd': 'endus', '3rd-io': 'iendus', '4th': 'endus' }[conj] ?? 'ndus')),
    gerundium: unless('gerundium', present + ({ '1st': 'ndum', '2nd': 'ndum', '3rd': 'endum', '3rd-io': 'iendum', '4th': 'endum' }[conj] ?? 'ndum')),
    supinum: supineStem ? `${supineStem}um` : null,
  };

  return {
    ok: true,
    verb: lemma,
    input: raw,
    parts,
    principalParts: parts.join(', '),
    class: conj,
    stem: present,
    source: 'local',
    deponent,
    flags: {
      irregular: Boolean(found),
      derivedFrom: prefix ? found.base : null,
      deponent,
      conjugation: conj,
      noPassive,
    },
    table: { formae, indicativus, coniunctivus, imperativus },
  };
}

/** Cells that differ from the plain regular paradigm — the forms to remember. */
export function irregularCells(input, table = null) {
  const shown = table ?? conjugate(input).table;
  const plain = conjugate(input, { plain: true });
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
  for (const [kind, forms] of Object.entries(shown.imperativus ?? {})) {
    for (const [person, form] of Object.entries(forms)) {
      if (form && form !== plain.table.imperativus[kind]?.[person]) marks.add(`imperativus.${kind}.${person}`);
    }
  }
  for (const [name, form] of Object.entries(shown.formae ?? {})) {
    if (form && form !== plain.table.formae[name]) marks.add(`formae.${name}`);
  }
  return marks;
}
