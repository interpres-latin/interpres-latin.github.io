import { el, icon, ICONS, clear, getJson } from '../lib/dom.js';
import { findStage } from '../data/stages-la.js';
import { lang, t } from '../lib/i18n.js';

/**
 * Grammatical labels, in Latin and in English.
 *
 * The server normalises Whitaker's own category names to these keys, so the
 * page never has to know what shape the parser answered in.
 */
const LABELS = {
  categories: {
    noun: ['nomen', 'noun'],
    verb: ['verbum', 'verb'],
    adjective: ['adiectivum', 'adjective'],
    adverb: ['adverbium', 'adverb'],
    pronoun: ['pronomen', 'pronoun'],
    preposition: ['praepositio', 'preposition'],
    conjunction: ['coniunctio', 'conjunction'],
    interjection: ['interiectio', 'interjection'],
    article: ['articulus', 'article'],
    determiner: ['determinans', 'determiner'],
    numeral: ['numerus', 'numeral'],
    contraction: ['contractio', 'contraction'],
    expression: ['locutio', 'phrase'],
    'proper noun': ['nomen proprium', 'proper noun'],
    participle: ['participium', 'participle'],
    supine: ['supinum', 'supine'],
  },
  genders: {
    masculine: ['m.', 'masc.'],
    feminine: ['f.', 'fem.'],
    neuter: ['n.', 'neut.'],
    common: ['c.', 'common'],
  },
  verbKinds: {
    transitive: ['transitivum', 'transitive'],
    intransitive: ['intransitivum', 'intransitive'],
    deponent: ['deponens', 'deponent'],
    impersonal: ['impersonale', 'impersonal'],
  },
};

/** Grammatical labels follow the interface; the headword never does. */
const label = (kind, key) => {
  const table = LABELS[kind] ?? {};
  return table[key] ? table[key][lang() === 'en' ? 1 : 0] : key;
};

/**
 * The dictionary, and above it one stage's words in two columns when the
 * page is opened from the Stages page with ?s=N: clicking a word in the stage
 * opens its entry in the dictionary below the list.
 *
 * Both keep their place in the query (?s= and ?q=), so a link to a stage with
 * a word open on it still works.
 */
export function renderDictionary(main) {
  const state = { request: 0 };

  const input = el('input', {
    type: 'search',
    placeholder: t('dictionary.search'),
    autocomplete: 'off',
    spellcheck: false,
    'aria-label': t('finder.label'),
  });

  const results = el('div', { class: 'panel__results' });

  const form = el('form', { class: 'search' },
    el('div', { class: 'search__field' },
      icon(ICONS.search, { size: 15 }),
      input,
      el('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, t('dictionary.button'))));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    search(input.value);
  });

  const dictionaryPanel = el('section', { class: 'panel panel--dictionary', id: 'lexicon' },
    el('div', { class: 'panel__head' },
      el('img', { class: 'panel__art', src: '/assets/art/scroll.svg', alt: '', width: 56, height: 56 }),
      el('div', {},
        el('h2', {}, t('finder.title')),
        el('p', {}, t('dictionary.lead')))),
    form,
    results);

  const params = new URLSearchParams(window.location.search);
  const stagePanel = buildStage(params.get('s'), (word) => {
    search(word);
    // The dictionary is below the list, so bring the entry into view.
    dictionaryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  main.append(el('div', { class: 'page shell' },
    el('div', { class: 'page__head' },
      el('h1', {}, t('dictionary.title')),
      el('p', {}, t('dictionary.pageLead'))),
    stagePanel
      ? el('div', { class: 'columns columns--stacked' }, stagePanel, dictionaryPanel)
      : el('div', { class: 'columns columns--single' }, dictionaryPanel),
    el('p', { class: 'footnote' },
      'Definitions from ',
      el('a', { href: 'https://mk270.github.io/whitakers-words/', target: '_blank', rel: 'noopener' }, 'Whitaker’s Words'),
      ' (public domain), looked up through the Alpheios morphology service.')));

  async function search(rawWord) {
    const word = String(rawWord || '').trim();
    if (!word) return;
    input.value = word;
    setQuery('q', word);

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

  const initial = params.get('q');
  if (initial) search(initial);
  else {
    results.appendChild(el('div', { class: 'empty' },
      el('h3', {}, t('dictionary.emptyTitle')),
      el('p', {}, t('dictionary.emptyBody'))));
  }
}

/** Change one key of the query without touching the other column's. */
function setQuery(key, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  history.replaceState({}, '', url.pathname + url.search + url.hash);
}

// ---------------------------------------------------------------------------
// The stage column
// ---------------------------------------------------------------------------

/**
 * One stage's word list, above the dictionary, when the page was opened with
 * ?s=N (from the Stages page, /stadia). Without a stage there is no list.
 *
 * The lists are hand-compiled (the course publishes no vocabulary data) and
 * every word in them is checked against Whitaker's Words. What that provenance
 * is worth is recorded in data/stages-la.js.
 */
function buildStage(raw, lookUp) {
  const stage = raw ? findStage(raw) : null;
  if (!stage) return null;
  return el('section', { class: 'panel panel--stages' },
    el('a', { class: 'backlink', href: '/stadia', 'data-link': '' }, t('stages.eyebrow')),
    el('div', { class: 'stagecard' },
      el('h3', {}, `${stage.number}. ${stage.title}`),
      el('p', { class: 'stagecard__setting' }, stage.setting),
      el('div', { class: 'verbcard__tags' },
        stage.book ? el('span', { class: 'chip chip--es' }, stage.book.label) : null,
        el('span', { class: 'chip' }, t('stages.wordCount', { n: stage.words.length })))),
    wordColumns(stage.words.map(([latin, english]) => ({ latin, english })), lookUp));
}

/** A stage's words in two tables side by side, the first half on the left. */
function wordColumns(words, lookUp) {
  const half = Math.ceil(words.length / 2);
  return el('div', { class: 'wordcolumns' },
    wordTable(words.slice(0, half), false, lookUp),
    wordTable(words.slice(half), false, lookUp));
}

/** Each Latin word opens in the dictionary below the list. */
function wordTable(words, showStage, lookUp) {
  const head = el('tr', {},
    el('th', { scope: 'col' }, t('stages.latinWord')),
    el('th', { scope: 'col' }, t('stages.englishWord')),
    showStage ? el('th', { scope: 'col' }, t('stages.fromStage')) : null);

  const body = el('tbody', {}, ...words.map((word) => el('tr', {},
    el('th', { scope: 'row' },
      el('button', {
        class: 'wordlink',
        type: 'button',
        title: t('stages.lookUp'),
        onclick: () => lookUp(word.latin.split(',')[0]),
      }, word.latin)),
    el('td', {}, word.english),
    showStage ? el('td', {}, `${word.book ? `${word.book.label} · ` : ''}${word.stage}`) : null)));

  return el('div', { class: 'tablewrap' },
    el('table', { class: 'conj conj--words' }, el('thead', {}, head), body));
}

// ---------------------------------------------------------------------------

function renderMiss(word, error, search) {
  const suggestions = error.data?.suggestions || [];
  return el('div', { class: 'empty' },
    el('h3', {}, t('dictionary.noResults')),
    el('p', {}, error.message || `Whitaker’s Words does not know “${word}”.`),
    suggestions.length
      ? el('div', { class: 'wordlist', style: { justifyContent: 'center', marginTop: '18px' } },
        el('span', {}, t('dictionary.didYouMean')),
        ...suggestions.slice(0, 8).map((suggestion) =>
          el('button', { type: 'button', onclick: () => search(suggestion) }, suggestion)))
      : null);
}

function renderEntry(data, search) {
  const wrap = el('article', { class: 'entry' });

  // The Spanish side falls back to a second dictionary only when the RAE is
  // unreachable, and says so.

  wrap.appendChild(el('div', { class: 'entry__head' },
    el('h2', {}, data.word),
    el('a', { class: 'chip', href: data.source.url, target: '_blank', rel: 'noopener' },
      t('dictionary.seeOnRae'))));

  /**
   * The licence line, and only that.
   *
   * The text these definitions come from is CC BY-SA, which requires the source
   * to be named — so it is, once, small, at the foot of the entry, rather than
   * in a chip at the top and a banner underneath it.
   */
  if (data.credit) {
    wrap.appendChild(el('p', { class: 'usage__credit' },
      el('a', { href: data.credit.url, target: '_blank', rel: 'noopener' }, data.credit.name),
      ` · ${data.credit.licence}`));
  }

  // The Spanish side still says when it is not the RAE, because there the RAE
  // is the authority the page promises.

  // A short English gloss, where the dictionary gives only its own language.
  if (data.gloss?.senses?.length) {
    wrap.appendChild(el('p', { class: 'entry__gloss' }, data.gloss.senses.join(' · ')));
  }

  // Sentences from a corpus belong to the word, not to one sense: they contain
  // it, they do not promise to illustrate a particular meaning.
  if (data.usage?.sentences?.length) {
    wrap.appendChild(el('section', { class: 'usage' },
      el('h3', { class: 'mood__title' }, t('dictionary.inUse')),
      ...data.usage.sentences.map((sentence) => el('div', { class: 'usage__item' },
        el('p', {}, sentence.text),
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
  if (sense.category) tags.push(el('span', { class: 'chip' }, label('categories', sense.category)));
  if (sense.gender) tags.push(el('span', { class: 'chip' }, label('genders', sense.gender)));
  // Which declension or conjugation a Latin word belongs to is half of knowing it.
  if (sense.declension) tags.push(el('span', { class: 'chip chip--es' }, `${sense.declension} decl.`));
  if (sense.conjugation) tags.push(el('span', { class: 'chip chip--es' }, `${sense.conjugation} conj.`));
  for (const kind of String(sense.verbCategory || '').split(',').map((item) => item.trim()).filter(Boolean)) {
    tags.push(el('span', { class: 'chip' }, label('verbKinds', kind)));
  }
  if (sense.usage) tags.push(el('span', { class: 'chip chip--warn' }, sense.usage));

  // Both dictionaries define in their own language. In English the translation
  // leads and the original stays underneath, because the original wording is
  // the authoritative text.
  const englishDef = example?.def;
  const body = el('div', {},
    // The principal parts are what a Latin dictionary is *for* — the headword
    // alone tells you nothing about how the verb or noun will behave.
    sense.headword
      ? el('p', { class: 'sense__headword' }, sense.headword)
      : null,
    tags.length ? el('div', { class: 'sense__tags' }, tags) : null,
    el('p', { class: 'sense__def' }, englishDef || sense.description || ','),
    englishDef ? el('p', { class: 'sense__original' }, sense.description) : null,
    // Every way the form the reader typed can be read. *puellae* is three
    // different cases, and pretending otherwise would be the whole problem.
    sense.parses?.length
      ? el('div', { class: 'parses' },
        el('span', { class: 'parses__label' }, t('dictionary.parses')),
        ...sense.parses.map((parse) => el('span', { class: 'parses__item' }, parse)))
      : null,
    ...sense.usageNotes.map((note) => el('p', { class: 'sense__note' }, note)),
  );

  if (sense.synonyms.length) body.appendChild(wordList(t('dictionary.synonyms'), sense.synonyms, search));
  if (sense.antonyms.length) body.appendChild(wordList(t('dictionary.antonyms'), sense.antonyms, search));

  if (example?.text) {
    body.appendChild(el('div', { class: 'sense__example' },
      el('p', {}, example.text),
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
