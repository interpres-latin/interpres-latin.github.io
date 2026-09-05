import { el, icon, ICONS, clear, getJson } from '../lib/dom.js';
import { t } from '../lib/i18n.js';

const CATEGORIES = {
  noun: 'sustantivo',
  verb: 'verbo',
  adjective: 'adjetivo',
  adverb: 'adverbio',
  pronoun: 'pronombre',
  preposition: 'preposición',
  conjunction: 'conjunción',
  interjection: 'interjección',
  article: 'artículo',
  determiner: 'determinante',
  numeral: 'numeral',
  contraction: 'contracción',
  expression: 'expresión',
};

const GENDERS = {
  masculine: 'm.',
  feminine: 'f.',
  masculine_and_feminine: 'm. y f.',
  ambiguous: 'amb.',
  common: 'com.',
  neuter: 'n.',
};

const VERB_KINDS = {
  transitive: 'transitivo',
  intransitive: 'intransitivo',
  pronominal: 'pronominal',
  impersonal: 'impersonal',
  copulative: 'copulativo',
  auxiliary: 'auxiliar',
};

export function renderDictionary(main) {
  const state = { request: 0 };

  const input = el('input', {
    type: 'search',
    placeholder: t('dictionary.search'),
    autocomplete: 'off',
    spellcheck: false,
    'aria-label': t('finder.label'),
  });

  const results = el('div', {});

  const form = el('form', { class: 'search', style: { maxWidth: '560px' } },
    el('div', { class: 'search__field' },
      icon(ICONS.search, { size: 15 }),
      input,
      el('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, t('dictionary.button'))));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    search(input.value);
  });

  main.append(el('div', { class: 'page shell' },
    el('div', { class: 'page__head' },
      el('p', { class: 'eyebrow' }, t('dictionary.eyebrow')),
      el('h1', {}, t('dictionary.title')),
      el('p', {}, t('dictionary.lead'))),
    form,
    el('div', { style: { marginTop: '34px' } }, results),
  ));

  async function search(rawWord) {
    const word = String(rawWord || '').trim();
    if (!word) return;
    input.value = word;

    const url = new URL(window.location.href);
    url.searchParams.set('q', word);
    history.replaceState({}, '', url.pathname + url.search);

    const ticket = (state.request += 1);
    clear(results);
    results.appendChild(el('div', { class: 'empty' }, el('p', {}, el('span', { class: 'spinner' }), ` ${t('dictionary.looking')}`)));

    try {
      const data = await getJson(`/api/dictionary?word=${encodeURIComponent(word)}`);
      if (ticket !== state.request) return;
      clear(results);
      results.appendChild(renderEntry(data, search));
    } catch (error) {
      if (ticket !== state.request) return;
      clear(results);
      results.appendChild(renderMiss(word, error, search));
    }
  }

  const initial = new URLSearchParams(window.location.search).get('q');
  if (initial) search(initial);
  else {
    results.appendChild(el('div', { class: 'empty' },
      el('h3', {}, t('dictionary.emptyTitle')),
      el('p', {}, t('dictionary.emptyBody'))));
    input.focus();
  }
}

// ---------------------------------------------------------------------------

function renderMiss(word, error, search) {
  const suggestions = error.data?.suggestions || [];
  return el('div', { class: 'empty' },
    el('h3', {}, t('dictionary.noResults')),
    el('p', {}, error.message || `No encontré "${word}".`),
    suggestions.length
      ? el('div', { class: 'wordlist', style: { justifyContent: 'center', marginTop: '18px' } },
        el('span', {}, t('dictionary.didYouMean')),
        ...suggestions.slice(0, 8).map((suggestion) =>
          el('button', { type: 'button', onclick: () => search(suggestion) }, suggestion)))
      : null);
}

function renderEntry(data, search) {
  const wrap = el('article', { class: 'entry' });

  wrap.appendChild(el('div', { class: 'entry__head' },
    el('h2', {}, data.word),
    el('a', { class: 'chip', href: data.source.url, target: '_blank', rel: 'noopener' }, t('dictionary.seeOnRae'))));

  let senseIndex = 0;

  data.entries.forEach((entry, entryIndex) => {
    if (entry.origin) {
      wrap.appendChild(el('p', { class: 'entry__origin' },
        data.entries.length > 1 ? `${entryIndex + 1}. ${entry.origin}` : entry.origin));
    }

    for (const sense of entry.senses) {
      senseIndex += 1;
      const example = data.examples?.[sense.number];
      wrap.appendChild(renderSense(sense, senseIndex <= 4 ? example : null, data.exampleSource, search));
    }

    if (entry.locutions.length) {
      wrap.appendChild(el('section', { class: 'locutions' },
        el('h3', { class: 'mood__title' }, t('dictionary.locutions')),
        ...entry.locutions.map((locution) => el('div', { class: 'locution' },
          el('b', {}, locution.expression),
          ...locution.senses.map((sense) => el('p', {}, sense.description))))));
    }
  });

  return wrap;
}

function renderSense(sense, example, exampleSource, search) {
  const tags = [];
  if (sense.category) tags.push(el('span', { class: 'chip' }, CATEGORIES[sense.category] || sense.category));
  if (sense.gender) tags.push(el('span', { class: 'chip' }, GENDERS[sense.gender] || sense.gender));
  if (sense.verbCategory) tags.push(el('span', { class: 'chip' }, VERB_KINDS[sense.verbCategory] || sense.verbCategory));
  if (sense.usage) tags.push(el('span', { class: 'chip chip--warn' }, sense.usage));

  const body = el('div', {},
    tags.length ? el('div', { class: 'sense__tags' }, tags) : null,
    el('p', { class: 'sense__def' }, sense.description || '—'),
    ...sense.usageNotes.map((note) => el('p', { class: 'sense__note' }, note)),
  );

  if (sense.synonyms.length) body.appendChild(wordList(t('dictionary.synonyms'), sense.synonyms, search));
  if (sense.antonyms.length) body.appendChild(wordList(t('dictionary.antonyms'), sense.antonyms, search));

  if (example?.es) {
    body.appendChild(el('div', { class: 'sense__example' },
      el('p', {}, example.es),
      example.en ? el('p', {}, example.en) : null,
      exampleSource === 'template'
        ? el('p', { class: 'sense__note', style: { marginTop: '8px' } }, t('dictionary.templateNote'))
        : null));
  }

  return el('div', { class: 'sense' },
    el('div', { class: 'sense__num' }, String(sense.number ?? '·')),
    body);
}

function wordList(label, words, search) {
  return el('div', { class: 'wordlist' },
    el('span', {}, label),
    ...words.slice(0, 12).map((word) =>
      el('button', { type: 'button', onclick: () => search(word) }, word)));
}
