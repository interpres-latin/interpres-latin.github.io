import { el, icon, ICONS, clear, getJson } from '../lib/dom.js';
import { startWallpaper, wallpaperLayer } from '../lib/wallpaper.js';
import { lang, t } from '../lib/i18n.js';

const CATEGORIES = {
  noun: ['sustantivo', 'noun'],
  verb: ['verbo', 'verb'],
  adjective: ['adjetivo', 'adjective'],
  adverb: ['adverbio', 'adverb'],
  pronoun: ['pronombre', 'pronoun'],
  preposition: ['preposición', 'preposition'],
  conjunction: ['conjunción', 'conjunction'],
  interjection: ['interjección', 'interjection'],
  article: ['artículo', 'article'],
  determiner: ['determinante', 'determiner'],
  numeral: ['numeral', 'numeral'],
  contraction: ['contracción', 'contraction'],
  expression: ['expresión', 'expression'],
};

const GENDERS = {
  masculine: ['m.', 'masc.'],
  feminine: ['f.', 'fem.'],
  masculine_and_feminine: ['m. y f.', 'masc. & fem.'],
  ambiguous: ['amb.', 'ambiguous'],
  common: ['com.', 'common'],
  neuter: ['n.', 'neuter'],
};

const VERB_KINDS = {
  transitive: ['transitivo', 'transitive'],
  intransitive: ['intransitivo', 'intransitive'],
  pronominal: ['pronominal', 'pronominal'],
  impersonal: ['impersonal', 'impersonal'],
  copulative: ['copulativo', 'copulative'],
  auxiliary: ['auxiliar', 'auxiliary'],
};

/** Grammatical labels follow the interface; the headword never does. */
const label = (table, key) => (table[key] ? table[key][lang() === 'en' ? 1 : 0] : key);

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
  const wallpaper = wallpaperLayer({ band: true });

  const form = el('form', { class: 'search', style: { maxWidth: '560px' } },
    el('div', { class: 'search__field' },
      icon(ICONS.search, { size: 15 }),
      input,
      el('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, t('dictionary.button'))));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    search(input.value);
  });

  main.append(wallpaper, el('div', { class: 'page shell' },
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
      const data = await getJson(`/api/dictionary?word=${encodeURIComponent(word)}&lang=${lang()}`);
      if (ticket !== state.request) return;
      clear(results);
      results.appendChild(renderEntry(data, search));
    } catch (error) {
      if (ticket !== state.request) return;
      clear(results);
      results.appendChild(renderMiss(word, error, search));
    }
  }

  const stopWallpaper = startWallpaper(wallpaper, results);

  const initial = new URLSearchParams(window.location.search).get('q');
  if (initial) search(initial);
  else {
    results.appendChild(el('div', { class: 'empty' },
      el('h3', {}, t('dictionary.emptyTitle')),
      el('p', {}, t('dictionary.emptyBody'))));
    input.focus();
  }

  return () => stopWallpaper();
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

  // A short English gloss, where the RAE gives only Spanish.
  if (data.gloss?.senses?.length) {
    wrap.appendChild(el('p', { class: 'entry__gloss' }, data.gloss.senses.join(' · ')));
  }

  // Sentences from a corpus belong to the word, not to one sense: they contain
  // it, they do not promise to illustrate a particular meaning.
  if (data.usage?.sentences?.length) {
    wrap.appendChild(el('section', { class: 'usage' },
      el('h3', { class: 'mood__title' }, t('dictionary.inUse')),
      ...data.usage.sentences.map((sentence) => el('div', { class: 'usage__item' },
        el('p', {}, sentence.es),
        sentence.en ? el('p', {}, sentence.en) : null)),
      el('p', { class: 'usage__credit' },
        el('a', { href: data.usage.credit.url, target: '_blank', rel: 'noopener' }, data.usage.credit.name),
        ` · ${data.usage.credit.licence}`)));
  }

  let senseIndex = 0;

  data.entries.forEach((entry, entryIndex) => {
    if (entry.origin) {
      wrap.appendChild(el('p', { class: 'entry__origin' },
        data.entries.length > 1 ? `${entryIndex + 1}. ${entry.origin}` : entry.origin));
    }

    for (const sense of entry.senses) {
      senseIndex += 1;
      const example = data.examples?.[sense.number];
      wrap.appendChild(renderSense(sense, example, data.exampleSource, search));
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
  if (sense.category) tags.push(el('span', { class: 'chip' }, label(CATEGORIES, sense.category)));
  if (sense.gender) tags.push(el('span', { class: 'chip' }, label(GENDERS, sense.gender)));
  if (sense.verbCategory) tags.push(el('span', { class: 'chip' }, label(VERB_KINDS, sense.verbCategory)));
  if (sense.usage) tags.push(el('span', { class: 'chip chip--warn' }, sense.usage));

  // The RAE is Spanish-only. In English the translation leads and the original
  // stays underneath, because the Spanish wording is the authoritative text.
  const englishDef = example?.def;
  const body = el('div', {},
    tags.length ? el('div', { class: 'sense__tags' }, tags) : null,
    el('p', { class: 'sense__def' }, englishDef || sense.description || '—'),
    englishDef ? el('p', { class: 'sense__original' }, sense.description) : null,
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
