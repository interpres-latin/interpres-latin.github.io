import { Router } from 'express';
import { fetchRae } from './dictionary.js';

export const router = Router();

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24;

const PERSONS = {
  yo: 'singular_first_person',
  tu: 'singular_second_person',
  el: 'singular_third_person',
  nosotros: 'plural_first_person',
  vosotros: 'plural_second_person',
  ellos: 'plural_third_person',
};

const INDICATIVE = {
  presente: 'present',
  preterito: 'preterite',
  imperfecto: 'imperfect',
  futuro: 'future',
  condicional: 'conditional',
  preteritoPerfecto: 'present_perfect',
  pluscuamperfecto: 'past_perfect',
  preteritoAnterior: 'past_anterior',
  futuroPerfecto: 'future_perfect',
  condicionalPerfecto: 'conditional_perfect',
};

const SUBJUNCTIVE = {
  presente: 'present',
  futuro: 'future',
  perfecto: 'present_perfect',
  futuroPerfecto: 'future_perfect',
};

/**
 * RAE packs both imperfect subjunctive series into one string:
 * "hablara o hablase" — and "obtuviera u obtuviese" before an o.
 */
function splitVariants(value) {
  const match = /^(\S+)\s+[ou]\s+(\S+)(.*)$/.exec(value || '');
  if (!match) return [value, value];
  const [, first, second, tail] = match;
  return [(first + tail).trim(), (second + tail).trim()];
}

/** "hablas / hablás" -> tuteo form first, voseo form second. */
function splitVoseo(value) {
  const parts = String(value || '').split(' / ');
  return { form: parts[0].trim(), voseo: parts[1]?.trim() || null };
}

function readRow(tense, { variant = null, voseo = false } = {}) {
  if (!tense) return null;
  const row = {};
  const voseoRow = {};
  for (const [person, key] of Object.entries(PERSONS)) {
    let value = tense[key];
    if (value === undefined || value === null) return null;
    if (voseo) {
      const split = splitVoseo(value);
      value = split.form;
      if (split.voseo) voseoRow[person] = split.voseo;
    }
    if (variant !== null) value = splitVariants(value)[variant];
    row[person] = value;
  }
  if (voseo && Object.keys(voseoRow).length) row.voseo = voseoRow;
  return row;
}

function normalize(conjugations) {
  const table = { indicativo: {}, subjuntivo: {}, imperativo: {}, formas: {} };

  for (const [mine, theirs] of Object.entries(INDICATIVE)) {
    const row = readRow(conjugations.indicative?.[theirs], { voseo: mine === 'presente' });
    if (row) table.indicativo[mine] = row;
  }

  for (const [mine, theirs] of Object.entries(SUBJUNCTIVE)) {
    const row = readRow(conjugations.subjunctive?.[theirs]);
    if (row) table.subjuntivo[mine] = row;
  }

  const imperfectRa = readRow(conjugations.subjunctive?.imperfect, { variant: 0 });
  const imperfectSe = readRow(conjugations.subjunctive?.imperfect, { variant: 1 });
  if (imperfectRa) table.subjuntivo.imperfectoRa = imperfectRa;
  if (imperfectSe) table.subjuntivo.imperfectoSe = imperfectSe;

  const pluscuamRa = readRow(conjugations.subjunctive?.past_perfect, { variant: 0 });
  const pluscuamSe = readRow(conjugations.subjunctive?.past_perfect, { variant: 1 });
  if (pluscuamRa) table.subjuntivo.pluscuamperfectoRa = pluscuamRa;
  if (pluscuamSe) table.subjuntivo.pluscuamperfectoSe = pluscuamSe;

  const imperative = conjugations.imperative || {};
  const tu = splitVoseo(imperative.singular_second_person);
  table.imperativo.afirmativo = {
    tu: tu.form || null,
    usted: imperative.singular_formal_second_person || null,
    vosotros: imperative.plural_second_person || null,
    ustedes: imperative.plural_formal_second_person || null,
  };
  if (tu.voseo) table.imperativo.afirmativo.tuVoseo = tu.voseo;

  const nonPersonal = conjugations.non_personal || {};
  table.formas = {
    infinitivo: nonPersonal.infinitive || null,
    participio: nonPersonal.participle || null,
    gerundio: nonPersonal.gerund || null,
    infinitivoCompuesto: nonPersonal.compound_infinitive || null,
    gerundioCompuesto: nonPersonal.compound_gerund || null,
  };

  return table;
}

/**
 * A verb, rather than whatever was in the box. Same guard as the dictionary's,
 * and for the same reason: "../../etc/passwd" is not a failed lookup, and
 * sending it to the RAE produced a 502 blaming the RAE.
 */
const LOOKS_LIKE_A_VERB = /^[\p{L}][\p{L}\p{M}'’-]*$/u;

/**
 * Spanish only, and now it says so.
 *
 * This asks the RAE, which is the authority for Spanish and knows nothing of
 * the others — French and Latin are conjugated by their own rules engines in
 * the browser, and the page only calls this where its engine is marked
 * authoritative. Nothing reaches it with another subject today, but silence
 * here is dangerous rather than merely untidy: Latin *moneo* came back 200
 * with a Spanish table, because *monear* is a Spanish verb. A wrong answer
 * that looks right is worse than an error.
 */
router.get('/conjugations', async (req, res) => {
  if (req.query.study && req.query.study !== 'es') {
    return res.status(400).json({ error: 'Esta tabla es solo de español.' });
  }

  const verb = String(req.query.verb ?? '').trim().toLowerCase().slice(0, 40);
  if (!verb) return res.status(400).json({ error: 'Falta el verbo.' });
  if (!LOOKS_LIKE_A_VERB.test(verb)) {
    return res.status(400).json({ error: 'Busca un verbo: solo letras, sin símbolos.' });
  }

  const cached = cache.get(verb);
  if (cached && Date.now() - cached.at < CACHE_TTL) return res.json(cached.payload);

  let lookup;
  try {
    lookup = await fetchRae(verb);
  } catch (error) {
    const status = error.status === 429 ? 429 : 502;
    return res.status(status).json({
      error: status === 429 ? error.message : `No se pudo consultar la RAE: ${error.message}`,
    });
  }

  if (!lookup.found) {
    return res.status(404).json({ error: `"${verb}" no está en el DLE.`, suggestions: lookup.suggestions });
  }

  const meaning = (lookup.data.meanings || []).find((entry) => entry.conjugations);
  if (!meaning) {
    return res.status(404).json({ error: `La RAE no da tabla de conjugación para "${verb}".` });
  }

  const payload = {
    verb: lookup.data.word,
    source: 'rae',
    table: normalize(meaning.conjugations),
    definition: meaning.senses?.[0]?.description || '',
  };

  cache.set(verb, { at: Date.now(), payload });
  res.json(payload);
});
