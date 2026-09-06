/**
 * The conjugation page renders whichever language the site is about, from one
 * set of tense lists per language. These check that the two agree with the
 * engines: a tense named here but absent from the table would show as a quietly
 * missing row, and a tense the engine builds but nobody lists would never
 * appear at all.
 */
import { ENGINES } from '../public/js/views/conjugator.js';

let checked = 0;
const failures = [];
function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

for (const [study, engine] of Object.entries(ENGINES)) {
  const { conjugate, MODEL_VERBS, PERSONS, PERSON_LABELS, moods } = engine;

  // Every model verb on the tabs has to conjugate, or the page opens empty.
  for (const [mode, { verb }] of Object.entries(MODEL_VERBS)) {
    const result = conjugate(verb);
    ok(`${study}: model verb ${verb} conjugates`, result.ok, result.error);
    ok(`${study}: model verb ${verb} is an -${mode} verb`, result.class === mode, `got -${result.class}`);
  }

  const sample = conjugate(Object.values(MODEL_VERBS)[0].verb);
  const irregular = conjugate(study === 'fr' ? 'être' : 'ser');

  const lists = [
    [moods.indicative, engine.indicativeSimple, 'indicative simple'],
    [moods.indicative, engine.indicativeCompound, 'indicative compound'],
    [moods.subjunctive, engine.subjunctiveSimple, 'subjunctive simple'],
    [moods.subjunctive, engine.subjunctiveCompound, 'subjunctive compound'],
  ];

  const listed = new Set();
  for (const [mood, rows, label] of lists) {
    for (const [key, name, hint] of rows) {
      listed.add(`${mood}.${key}`);
      ok(`${study}: ${label} names a real tense — ${mood}.${key}`,
        Boolean(sample.table[mood]?.[key]), `not in the table for ${sample.verb}`);
      ok(`${study}: ${mood}.${key} has both names`, Boolean(name) && Boolean(hint));
    }
  }

  // Nothing the engine builds should be missing from the page.
  for (const mood of [moods.indicative, moods.subjunctive]) {
    for (const tense of Object.keys(sample.table[mood])) {
      ok(`${study}: ${mood}.${tense} is shown somewhere`, listed.has(`${mood}.${tense}`),
        'the engine builds it but no tense list names it');
    }
  }

  // Persons: the table columns and the paradigm have to line up.
  for (const person of PERSONS) {
    ok(`${study}: person ${person} has a label`, Boolean(PERSON_LABELS[person]));
    ok(`${study}: person ${person} is in the present`, person in sample.table[moods.indicative][engine.indicativeSimple[0][0]]);
  }

  // The imperative, which has its own persons and its two kinds.
  const imperative = sample.table[moods.imperative];
  for (const [kind] of engine.imperativeKinds) {
    ok(`${study}: imperative has a ${kind}`, Boolean(imperative[kind]));
    for (const [person] of engine.imperativePersons) {
      ok(`${study}: imperative ${kind} covers ${person}`, person in imperative[kind]);
    }
  }

  // The non-finite forms shown on the verb card.
  for (const [label, key] of engine.nonFinite) {
    ok(`${study}: non-finite ${key} exists`, Boolean(sample.table[moods.forms][key]),
      `missing from ${sample.verb}`);
    ok(`${study}: non-finite ${key} has a label key`, label.startsWith('conjugator.'));
  }

  // Every stem change the engine can report needs a label, or the chip shows a code.
  ok(`${study}: irregular model still conjugates`, irregular.ok);
  const changes = new Set();
  for (const [verb] of engine.COMMON_VERBS) {
    const result = conjugate(verb);
    if (result.ok && result.flags.stemChange) changes.add(result.flags.stemChange);
  }
  for (const change of changes) {
    ok(`${study}: stem change "${change}" has a label`, Boolean(engine.stemChangeLabels[change]),
      `add it to stemChangeLabels — ${[...changes].join(', ')}`);
  }
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} conjugation-page checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} conjugation-page checks passed`);
