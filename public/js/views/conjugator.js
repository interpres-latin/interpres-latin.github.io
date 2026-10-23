import { el, icon, ICONS, clear, debounce, fold } from '../lib/dom.js';
import * as latin from '../lib/conjugator-la.js';
import * as latinVerbs from '../data/verbs-la.js';
import { lang, t } from '../lib/i18n.js';

/**
 * Everything the page needs to render a paradigm.
 *
 * The tense lists, the mood keys and the non-finite forms are data here rather
 * than literals in the rendering code. That separation is worth keeping now
 * that there is one language rather than three: it is what lets the tests below
 * check the page against the engine at all.
 *
 * Exported for the tests, which check that every tense named here exists in the
 * table the engine actually builds — a typo would otherwise show as a silently
 * missing row rather than as an error.
 */
export const ENGINES = {
  la: {
    ...latin,
    ...latinVerbs,
    moods: { indicative: 'indicativus', subjunctive: 'coniunctivus', imperative: 'imperativus', forms: 'formae' },
    imperativeKinds: [['praesens', 'Imperativus', 'do it'], ['negativus', 'Negativus', "don't do it"]],
    imperativePersons: [['tu', 'tu'], ['vos', 'vos']],
    // Latin splits each mood by voice where the modern languages split it by
    // simple and compound, so the two tables a mood is drawn as are active and
    // passive. The captions come from the string pack.
    indicativeSimple: [
      ['praesens', 'Praesens', 'present'],
      ['imperfectum', 'Imperfectum', 'imperfect'],
      ['futurum', 'Futurum', 'future'],
      ['perfectum', 'Perfectum', 'perfect'],
      ['plusquamperfectum', 'Plusquamperfectum', 'pluperfect'],
      ['futurumExactum', 'Futurum exactum', 'future perfect'],
    ],
    indicativeCompound: [
      ['praesensPassivum', 'Praesens', 'present'],
      ['imperfectumPassivum', 'Imperfectum', 'imperfect'],
      ['futurumPassivum', 'Futurum', 'future'],
      ['perfectumPassivum', 'Perfectum', 'perfect'],
      ['plusquamperfectumPassivum', 'Plusquamperfectum', 'pluperfect'],
      ['futurumExactumPassivum', 'Futurum exactum', 'future perfect'],
    ],
    subjunctiveSimple: [
      ['praesens', 'Praesens', 'present'],
      ['imperfectum', 'Imperfectum', 'imperfect'],
      ['perfectum', 'Perfectum', 'perfect'],
      ['plusquamperfectum', 'Plusquamperfectum', 'pluperfect'],
    ],
    subjunctiveCompound: [
      ['praesensPassivum', 'Praesens', 'present'],
      ['imperfectumPassivum', 'Imperfectum', 'imperfect'],
      ['perfectumPassivum', 'Perfectum', 'perfect'],
      ['plusquamperfectumPassivum', 'Plusquamperfectum', 'pluperfect'],
    ],
    nonFinite: [
      ['conjugator.gerund', 'participiumPraesens'],
      ['conjugator.participle', 'participiumPerfectum'],
      ['conjugator.compoundInf', 'gerundivum'],
      ['conjugator.compoundGer', 'supinum'],
    ],
    stemChangeLabels: {},
    // A Latin verb is conjugated from its principal parts, so the tabs and the
    // search index carry all of them rather than just the first.
    modelInput: (model) => model.parts ?? model.verb,
    glossKey: (parts) => String(parts).split(',')[0].trim(),
  },
};

const engine = () => ENGINES.la;

export function renderConjugator(main) {
  const {
    conjugate, irregularCells, PERSONS, PERSON_LABELS, COMMON_VERBS, MODEL_VERBS,
  } = engine();

  // Latin's index is keyed by principal parts, so the gloss is filed under the
  // lemma the engine will report rather than under the whole quotation.
  const { glossKey, modelInput } = engine();
  const glosses = new Map(COMMON_VERBS.map(([key, gloss]) => [glossKey ? glossKey(key) : key, gloss]));
  const [firstMode] = Object.keys(MODEL_VERBS);
  const state = { mode: firstMode, verb: MODEL_VERBS[firstMode].verb, highlight: true, request: 0 };
  const firstValue = engine().modelInput
    ? engine().modelInput(MODEL_VERBS[firstMode])
    : MODEL_VERBS[firstMode].verb;

  const results = el('div', {});
  const searchInput = el('input', {
    type: 'search',
    placeholder: t('conjugator.search'),
    autocomplete: 'off',
    spellcheck: false,
    'aria-label': t('conjugator.searchLabel'),
  });
  const suggestions = el('div', { class: 'suggest', role: 'listbox' });

  const tabs = el('div', { class: 'tabs', role: 'tablist' });
  const tabButtons = Object.entries(MODEL_VERBS).map(([mode, model]) => {
    const value = modelInput ? modelInput(model) : model.verb;
    const button = el('button', {
      type: 'button',
      role: 'tab',
      onclick: () => { searchInput.value = ''; clear(suggestions); show(value, mode); },
    }, t('conjugator.tab', { ending: mode }));
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
      el('p', { class: 'eyebrow' }, t('conjugator.eyebrow')),
      el('h1', {}, t('conjugator.title')),
      el('p', {}, t('conjugator.lead'))),
    el('div', { class: 'toolbar' },
      tabs,
      el('div', { class: 'search' },
        el('div', { class: 'search__field' }, icon(ICONS.search, { size: 15 }), searchInput),
        suggestions),
      el('label', { class: 'switch' }, highlightToggle, t('conjugator.highlight'))),
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
        el('h3', {}, t('conjugator.notAVerb')),
        // A Latin verb needs all its parts, and saying so is more use than
        // repeating the error code.
        el('p', {}, result.error === 'needs-principal-parts' ? t('conjugator.needsParts') : result.error)));
      return;
    }

    state.verb = result.verb;
    state.mode = mode ?? result.class;
    for (const [tabMode, button] of tabButtons) {
      button.classList.toggle('is-active', tabMode === state.mode && MODEL_VERBS[tabMode].verb === result.verb);
    }

    paint(result);

    /**
     * Keep the URL on the verb being shown, so the page can be linked to,
     * refreshed and shared — which is what the chat's "full table" link needs.
     *
     * The principal parts, not the lemma. This wrote back `?v=capio` after
     * conjugating *capio, capere, cepi, captus* perfectly well, so the address
     * bar ended up holding the one thing this page refuses: reloading it
     * answered "a Latin verb cannot be conjugated without its principal parts"
     * about the verb that had just been on screen.
     */
    const url = new URL(window.location.href);
    url.searchParams.set('v', result.principalParts || result.verb);
    history.replaceState({}, '', url.pathname + url.search);

  }

  function paint(result) {
    clear(results);
    results.append(
      verbCard(result, glosses),
      tables(result, state.highlight, { irregularCells, PERSONS, PERSON_LABELS }),
    );
  }

  const requested = new URLSearchParams(window.location.search).get('v');
  if (requested) {
    searchInput.value = requested;
    show(requested);
  } else {
    show(firstValue, firstMode);
  }


  return () => {
    document.removeEventListener('click', onDocumentClick);
  };
}

// ---------------------------------------------------------------------------

function verbCard(result, glosses) {
  const { moods, nonFinite, stemChangeLabels } = engine();
  const gloss = glosses.get(result.verb);
  const tags = [];

  tags.push(el('span', { class: 'chip' }, t('conjugator.verbClass', { ending: result.class })));
  // The principal parts are the verb, for a Latin reader — they belong on the card.
  if (result.principalParts) {
    tags.push(el('span', { class: 'chip chip--es' }, result.principalParts));
  }
  if (result.deponent) tags.push(el('span', { class: 'chip chip--warn' }, t('conjugator.pronominal')));
  if (result.flags.irregular) tags.push(el('span', { class: 'chip chip--warn' }, t('conjugator.irregular')));
  if (result.flags.stemChange) {
    tags.push(el('span', { class: 'chip chip--es' },
      t('conjugator.stemChange', { change: stemChangeLabels[result.flags.stemChange] ?? result.flags.stemChange })));
  }
  if (result.flags.ortho) tags.push(el('span', { class: 'chip' }, t('conjugator.spelling', { change: result.flags.ortho })));
  if (result.flags.derivedFrom) tags.push(el('span', { class: 'chip' }, t('conjugator.likeVerb', { verb: result.flags.derivedFrom })));

  const forms = result.table[moods.forms];
  return el('div', { class: 'verbcard' },
    el('div', {},
      el('h2', {}, result.input),
      el('p', { class: 'verbcard__gloss' }, result.definition || (gloss ? `“${gloss}”` : t('conjugator.fullTable'))),
      el('div', { class: 'verbcard__tags' }, tags)),
    el('div', { class: 'verbcard__forms' },
      ...nonFinite.map(([label, key]) => formRow(t(label), forms[key] || ','))));
}

function formRow(label, value) {
  return el('div', {}, el('span', {}, label), el('span', {}, value));
}

function tables(result, highlight, { irregularCells, PERSONS, PERSON_LABELS }) {
  const {
    moods, indicativeSimple, indicativeCompound, subjunctiveSimple, subjunctiveCompound,
  } = engine();

  const marks = irregularCells(result.verb, result.table);
  const wrap = el('div', { class: `conj-tables${highlight ? ' mark-irregular' : ''}` });
  const columns = { PERSONS, PERSON_LABELS };

  wrap.append(
    mood(t('conjugator.indicative'), [
      tenseTable(result.table[moods.indicative], indicativeSimple, moods.indicative, marks, t('conjugator.simple'), columns),
      tenseTable(result.table[moods.indicative], indicativeCompound, moods.indicative, marks, t('conjugator.compound'), columns),
    ]),
    mood(t('conjugator.subjunctive'), [
      tenseTable(result.table[moods.subjunctive], subjunctiveSimple, moods.subjunctive, marks, t('conjugator.simple'), columns),
      tenseTable(result.table[moods.subjunctive], subjunctiveCompound, moods.subjunctive, marks, t('conjugator.compound'), columns),
    ]),
    mood(t('conjugator.imperative'), [imperativeTable(result.table[moods.imperative], marks)]),
  );
  return wrap;
}

function mood(title, children) {
  return el('section', { class: 'mood' }, el('h2', { class: 'mood__title' }, title), ...children);
}

const upperFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * In English the English name leads and the original becomes the hint.
 * Case belongs to the role, not to the string: swapping the pair used to carry
 * the capitalisation with it, so English mode showed "present" above "Presente".
 */
function tenseNames(label, hint) {
  const [main, sub] = lang() === 'en' ? [hint, label] : [label, hint];
  return [upperFirst(main), lowerFirst(sub)];
}

function tenseTable(tenses, rows, moodKey, marks, caption, { PERSONS, PERSON_LABELS }) {
  const head = el('tr', {}, el('th', { scope: 'col' }, caption));
  for (const person of PERSONS) {
    head.appendChild(el('th', { scope: 'col' }, PERSON_LABELS[person]));
  }

  const body = el('tbody', {});
  for (const [key, label, hint] of rows) {
    const forms = tenses?.[key];
    if (!forms) continue;
    const [main, sub] = tenseNames(label, hint);
    const tr = el('tr', {}, el('th', { scope: 'row' }, main, el('small', {}, sub)));
    for (const person of PERSONS) {
      const value = forms[person];
      tr.appendChild(el('td', {
        class: [value ? '' : 'is-empty', marks.has(`${moodKey}.${key}.${person}`) ? 'is-irregular' : ''].filter(Boolean).join(' '),
      }, value || ','));
    }
    body.appendChild(tr);
  }

  return el('div', { class: 'tablewrap', style: { marginBottom: '14px' } },
    el('table', { class: 'conj' }, el('thead', {}, head), body));
}

function imperativeTable(imperative, marks) {
  const { moods, imperativeKinds, imperativePersons } = engine();

  const head = el('tr', {}, el('th', { scope: 'col' }, t('conjugator.imperative')));
  for (const [, label] of imperativePersons) head.appendChild(el('th', { scope: 'col' }, label));

  const body = el('tbody', {});
  for (const [kind, label, hint] of imperativeKinds) {
    const [main, sub] = tenseNames(label, hint);
    const tr = el('tr', {}, el('th', { scope: 'row' }, main, el('small', {}, sub)));
    for (const [person] of imperativePersons) {
      const value = imperative[kind]?.[person];
      tr.appendChild(el('td', {
        class: [value ? '' : 'is-empty', marks.has(`${moods.imperative}.${kind}.${person}`) ? 'is-irregular' : ''].filter(Boolean).join(' '),
      }, value || ','));
    }
    body.appendChild(tr);
  }

  return el('div', { class: 'tablewrap' },
    el('table', { class: 'conj', style: { minWidth: '760px' } }, el('thead', {}, head), body));
}
