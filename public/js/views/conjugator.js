import { el, icon, ICONS, clear, debounce, fold, getJson } from '../lib/dom.js';
import { conjugate, irregularCells, PERSONS, PERSON_LABELS } from '../lib/conjugator.js';
import { COMMON_VERBS, MODEL_VERBS } from '../data/verbs.js';

const INDICATIVE_SIMPLE = [
  ['presente', 'Presente', 'present'],
  ['preterito', 'Pretérito perfecto simple', 'preterite'],
  ['imperfecto', 'Pretérito imperfecto', 'imperfect'],
  ['futuro', 'Futuro simple', 'future'],
  ['condicional', 'Condicional simple', 'conditional'],
];

const INDICATIVE_COMPOUND = [
  ['preteritoPerfecto', 'Pretérito perfecto compuesto', 'present perfect'],
  ['pluscuamperfecto', 'Pretérito pluscuamperfecto', 'past perfect'],
  ['preteritoAnterior', 'Pretérito anterior', 'past anterior'],
  ['futuroPerfecto', 'Futuro compuesto', 'future perfect'],
  ['condicionalPerfecto', 'Condicional compuesto', 'conditional perfect'],
];

const SUBJUNCTIVE_SIMPLE = [
  ['presente', 'Presente', 'present'],
  ['imperfectoRa', 'Pretérito imperfecto', 'imperfect · -ra'],
  ['imperfectoSe', 'Pretérito imperfecto', 'imperfect · -se'],
  ['futuro', 'Futuro simple', 'future · rare'],
];

const SUBJUNCTIVE_COMPOUND = [
  ['perfecto', 'Pretérito perfecto compuesto', 'present perfect'],
  ['pluscuamperfectoRa', 'Pretérito pluscuamperfecto', 'past perfect · -ra'],
  ['pluscuamperfectoSe', 'Pretérito pluscuamperfecto', 'past perfect · -se'],
  ['futuroPerfecto', 'Futuro compuesto', 'future perfect · rare'],
];

const IMPERATIVE_PERSONS = [
  ['tu', 'tú'],
  ['usted', 'usted'],
  ['nosotros', 'nosotros'],
  ['vosotros', 'vosotros'],
  ['ustedes', 'ustedes'],
];

const STEM_CHANGE_LABELS = {
  'e:ie': 'e → ie',
  'o:ue': 'o → ue',
  'e:i': 'e → i',
  'u:ue': 'u → ue',
  'i:ie': 'i → ie',
  'o:hue': 'o → hue',
  'i:í': 'i → í',
  'u:ú': 'u → ú',
  uir: 'inserta y',
};

const GLOSSES = new Map(COMMON_VERBS);

export function renderConjugator(main) {
  const state = { mode: 'ar', verb: MODEL_VERBS.ar.verb, highlight: true, request: 0 };

  const results = el('div', {});
  const searchInput = el('input', {
    type: 'search',
    placeholder: 'Busca un verbo: pedir, obtener, construir…',
    autocomplete: 'off',
    spellcheck: false,
    'aria-label': 'Buscar un verbo',
  });
  const suggestions = el('div', { class: 'suggest', role: 'listbox' });

  const tabs = el('div', { class: 'tabs', role: 'tablist' });
  const tabButtons = Object.entries(MODEL_VERBS).map(([mode, { verb }]) => {
    const button = el('button', {
      type: 'button',
      role: 'tab',
      onclick: () => { searchInput.value = ''; clear(suggestions); show(verb, mode); },
    }, `verbos -${mode}`);
    tabs.appendChild(button);
    return [mode, button];
  });

  const highlightToggle = el('input', { type: 'checkbox', checked: true });
  highlightToggle.addEventListener('change', () => {
    state.highlight = highlightToggle.checked;
    results.querySelector('.conj-tables')?.classList.toggle('mark-irregular', state.highlight);
  });

  main.append(el('div', { class: 'page shell' },
    el('div', { class: 'page__head' },
      el('p', { class: 'eyebrow' }, 'Conjugación'),
      el('h1', {}, 'Todos los tiempos, todos los verbos'),
      el('p', {}, 'Empieza por uno de los tres modelos regulares o busca el verbo que necesites. ' +
        'Las formas irregulares aparecen resaltadas.')),
    el('div', { class: 'toolbar' },
      tabs,
      el('div', { class: 'search' },
        el('div', { class: 'search__field' }, icon(ICONS.search, { size: 15 }), searchInput),
        suggestions),
      el('label', { class: 'switch' }, highlightToggle, 'Resaltar irregulares')),
    results,
  ));

  // --- search --------------------------------------------------------------

  let activeSuggestion = -1;

  function renderSuggestions(query) {
    clear(suggestions);
    activeSuggestion = -1;
    const needle = fold(query.trim());
    if (needle.length < 1) return;

    const matches = COMMON_VERBS
      .map(([verb, gloss]) => ({ verb, gloss, score: rank(verb, gloss, needle) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.verb.localeCompare(b.verb))
      .slice(0, 8);

    for (const { verb, gloss } of matches) {
      suggestions.appendChild(el('button', {
        type: 'button',
        role: 'option',
        onclick: () => { searchInput.value = verb; clear(suggestions); show(verb); },
      }, el('span', {}, verb), el('em', {}, gloss)));
    }
  }

  function rank(verb, gloss, needle) {
    const folded = fold(verb);
    if (folded === needle) return 100;
    if (folded.startsWith(needle)) return 60 - folded.length * 0.1;
    if (folded.includes(needle)) return 30;
    if (fold(gloss).includes(needle)) return 12;
    return 0;
  }

  const onType = debounce(() => renderSuggestions(searchInput.value), 110);
  searchInput.addEventListener('input', onType);

  searchInput.addEventListener('keydown', (event) => {
    const options = [...suggestions.querySelectorAll('button')];
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!options.length) return;
      event.preventDefault();
      activeSuggestion = (activeSuggestion + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      options.forEach((option, index) => option.classList.toggle('is-active', index === activeSuggestion));
      options[activeSuggestion].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onType.cancel();
      if (activeSuggestion >= 0 && options[activeSuggestion]) options[activeSuggestion].click();
      else if (searchInput.value.trim()) { clear(suggestions); show(searchInput.value.trim()); }
    } else if (event.key === 'Escape') {
      clear(suggestions);
    }
  });

  const onDocumentClick = (event) => {
    if (!event.target.closest('.search')) clear(suggestions);
  };
  document.addEventListener('click', onDocumentClick);

  // --- rendering -----------------------------------------------------------

  async function show(rawVerb, mode = null) {
    const result = conjugate(rawVerb);
    if (!result.ok) {
      clear(results);
      results.appendChild(el('div', { class: 'empty' },
        el('h3', {}, 'No reconozco ese verbo'),
        el('p', {}, result.error)));
      return;
    }

    state.verb = result.verb;
    state.mode = mode ?? result.class;
    for (const [tabMode, button] of tabButtons) {
      button.classList.toggle('is-active', tabMode === state.mode && MODEL_VERBS[tabMode].verb === result.verb);
    }

    paint(result);

    // RAE's own table is authoritative when it has one; merge it in on arrival.
    const ticket = (state.request += 1);
    try {
      const rae = await getJson(`/api/verbs/conjugations?verb=${encodeURIComponent(result.verb)}`);
      if (ticket !== state.request) return;
      paint({ ...result, table: merge(result.table, rae.table), source: 'rae', definition: rae.definition, voseo: rae.table.indicativo.presente?.voseo });
    } catch {
      /* offline, rate-limited, or not in the DLE — the local table stands. */
    }
  }

  function paint(result) {
    clear(results);
    results.append(verbCard(result), tables(result, state.highlight));
  }

  show(state.verb, 'ar');

  return () => document.removeEventListener('click', onDocumentClick);
}

// ---------------------------------------------------------------------------

/**
 * RAE forms win cell by cell. RAE gives no nosotros imperative and no negative
 * imperative, so both are rebuilt from the merged present subjunctive.
 */
function merge(local, rae) {
  const out = structuredClone(local);

  for (const mood of ['indicativo', 'subjuntivo']) {
    for (const [tense, forms] of Object.entries(rae[mood] ?? {})) {
      if (!out[mood][tense]) continue;
      for (const person of PERSONS) {
        if (forms[person]) out[mood][tense][person] = forms[person];
      }
    }
  }

  for (const [person, form] of Object.entries(rae.imperativo?.afirmativo ?? {})) {
    if (form && person in out.imperativo.afirmativo) out.imperativo.afirmativo[person] = form;
  }

  for (const [name, form] of Object.entries(rae.formas ?? {})) {
    if (form && name in out.formas) out.formas[name] = form;
  }

  const subjunctive = out.subjuntivo.presente;
  if (out.imperativo.afirmativo.nosotros) out.imperativo.afirmativo.nosotros = subjunctive.nosotros;
  out.imperativo.negativo = {
    tu: `no ${subjunctive.tu}`,
    usted: `no ${subjunctive.el}`,
    nosotros: `no ${subjunctive.nosotros}`,
    vosotros: `no ${subjunctive.vosotros}`,
    ustedes: `no ${subjunctive.ellos}`,
  };

  return out;
}

function verbCard(result) {
  const gloss = GLOSSES.get(result.verb);
  const tags = [];

  tags.push(el('span', { class: 'chip' }, `verbo -${result.class}`));
  if (result.flags.irregular) tags.push(el('span', { class: 'chip chip--warn' }, 'irregular'));
  if (result.flags.stemChange) {
    tags.push(el('span', { class: 'chip chip--es' }, `cambio de raíz ${STEM_CHANGE_LABELS[result.flags.stemChange] ?? result.flags.stemChange}`));
  }
  if (result.flags.ortho) tags.push(el('span', { class: 'chip' }, `ortografía ${result.flags.ortho}`));
  if (result.flags.derivedFrom) tags.push(el('span', { class: 'chip' }, `se conjuga como ${result.flags.derivedFrom}`));
  if (result.pronominal) tags.push(el('span', { class: 'chip' }, 'pronominal · me / te / se'));
  if (result.voseo) tags.push(el('span', { class: 'chip' }, `voseo ${result.voseo.tu}`));
  tags.push(el('span', { class: 'chip' }, result.source === 'rae' ? 'formas de la RAE' : 'formas generadas'));

  const forms = result.table.formas;
  return el('div', { class: 'verbcard' },
    el('div', {},
      el('h2', {}, result.input),
      el('p', { class: 'verbcard__gloss' }, result.definition || (gloss ? `“${gloss}”` : 'Conjugación completa')),
      el('div', { class: 'verbcard__tags' }, tags)),
    el('div', { class: 'verbcard__forms' },
      formRow('gerundio', forms.gerundio),
      formRow('participio', forms.participio),
      formRow('inf. compuesto', forms.infinitivoCompuesto),
      formRow('ger. compuesto', forms.gerundioCompuesto)));
}

function formRow(label, value) {
  return el('div', {}, el('span', {}, label), el('span', {}, value));
}

function tables(result, highlight) {
  const marks = irregularCells(result.verb, result.table);
  const wrap = el('div', { class: `conj-tables${highlight ? ' mark-irregular' : ''}` });

  wrap.append(
    mood('Indicativo', [
      tenseTable(result.table.indicativo, INDICATIVE_SIMPLE, 'indicativo', marks, 'Tiempos simples'),
      tenseTable(result.table.indicativo, INDICATIVE_COMPOUND, 'indicativo', marks, 'Tiempos compuestos'),
    ]),
    mood('Subjuntivo', [
      tenseTable(result.table.subjuntivo, SUBJUNCTIVE_SIMPLE, 'subjuntivo', marks, 'Tiempos simples'),
      tenseTable(result.table.subjuntivo, SUBJUNCTIVE_COMPOUND, 'subjuntivo', marks, 'Tiempos compuestos'),
    ]),
    mood('Imperativo', [imperativeTable(result.table.imperativo, marks)]),
  );
  return wrap;
}

function mood(title, children) {
  return el('section', { class: 'mood' }, el('h2', { class: 'mood__title' }, title), ...children);
}

function tenseTable(tenses, rows, moodKey, marks, caption) {
  const head = el('tr', {}, el('th', { scope: 'col' }, caption));
  for (const person of PERSONS) {
    head.appendChild(el('th', { scope: 'col' }, PERSON_LABELS[person]));
  }

  const body = el('tbody', {});
  for (const [key, label, hint] of rows) {
    const forms = tenses[key];
    if (!forms) continue;
    const tr = el('tr', {}, el('th', { scope: 'row' }, label, el('small', {}, hint)));
    for (const person of PERSONS) {
      const value = forms[person];
      tr.appendChild(el('td', {
        class: [value ? '' : 'is-empty', marks.has(`${moodKey}.${key}.${person}`) ? 'is-irregular' : ''].filter(Boolean).join(' '),
      }, value || '—'));
    }
    body.appendChild(tr);
  }

  return el('div', { class: 'tablewrap', style: { marginBottom: '14px' } },
    el('table', { class: 'conj' }, el('thead', {}, head), body));
}

function imperativeTable(imperative, marks) {
  const head = el('tr', {}, el('th', { scope: 'col' }, 'Imperativo'));
  for (const [, label] of IMPERATIVE_PERSONS) head.appendChild(el('th', { scope: 'col' }, label));

  const body = el('tbody', {});
  for (const [kind, label, hint] of [['afirmativo', 'Afirmativo', 'do it'], ['negativo', 'Negativo', "don't do it"]]) {
    const tr = el('tr', {}, el('th', { scope: 'row' }, label, el('small', {}, hint)));
    for (const [person] of IMPERATIVE_PERSONS) {
      const value = imperative[kind][person];
      tr.appendChild(el('td', {
        class: [value ? '' : 'is-empty', marks.has(`imperativo.${kind}.${person}`) ? 'is-irregular' : ''].filter(Boolean).join(' '),
      }, value || '—'));
    }
    body.appendChild(tr);
  }

  return el('div', { class: 'tablewrap' },
    el('table', { class: 'conj', style: { minWidth: '760px' } }, el('thead', {}, head), body));
}
