/**
 * The grammar pages: /grammatica lists the topics, and each topic is its own
 * page (/grammatica/adiectiva, /grammatica/participia, /grammatica/casus).
 *
 * Everything is static, from public/js/data/grammar-la.js. A topic's parts sit
 * behind the same tabs the conjugation page uses, and the part on show is kept
 * in the query (?s=…) so a link or a refresh lands on it.
 */

import { el, clear } from '../lib/dom.js';
import { ADJECTIVES, PARTICIPLES, CASES } from '../data/grammar-la.js';

export const TOPICS = [
  {
    slug: 'adiectiva',
    title: 'Adjectives',
    lead: 'Agreement, the two families of adjectives, comparison and adverbs.',
    blurb: 'bonus and omnis, the special genitive, comparison and adverbs.',
    art: '/assets/art/laurel.svg',
  },
  {
    slug: 'participia',
    title: 'Participles',
    lead: 'The verbal adjective: how it is formed, declined and used.',
    blurb: 'Formation, declension, uses, relative time and the ablative absolute.',
    art: '/assets/art/helmet.svg',
  },
  {
    slug: 'casus',
    title: 'Cases',
    lead: 'All seven cases and every use of each.',
    blurb: 'Nominative to locative, with every use, an example and what to look for.',
    art: '/assets/art/column.svg',
  },
];

// --- the topic list -----------------------------------------------------------

export function renderGrammar(main) {
  document.title = 'Grammar | Interpres';
  main.append(el('div', { class: 'page shell' },
    el('div', { class: 'page__head' },
      el('h1', {}, 'grammar'),
      el('p', {}, 'Reference sheets for adjectives, participles and the cases.')),
    el('div', { class: 'features__grid grammar__topics' },
      ...TOPICS.map((topic) => el('a', { class: 'feature', href: `/grammatica/${topic.slug}`, 'data-link': '' },
        el('img', { class: 'feature__art', src: topic.art, alt: '', width: 72, height: 72 }),
        el('div', {},
          el('h3', {}, topic.title),
          el('p', {}, topic.blurb)))))));
}

// --- one topic -------------------------------------------------------------------

export function renderGrammarTopic(main, slug) {
  const topic = TOPICS.find((entry) => entry.slug === slug);
  document.title = `${topic.title} | Interpres`;

  const parts = slug === 'casus'
    ? CASES.map((entry) => ({ key: entry.key, label: entry.label, render: () => caseView(entry) }))
    : (slug === 'adiectiva' ? ADJECTIVES : PARTICIPLES)
      .map((section) => ({ key: section.key, label: section.label, render: () => sectionView(section) }));

  const body = el('div', { class: 'grammar__body' });
  const tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': topic.title });
  const buttons = parts.map((part) => {
    const button = el('button', {
      type: 'button', role: 'tab', 'aria-selected': 'false', onclick: () => show(part.key, true),
    }, part.label);
    tabs.appendChild(button);
    return [part.key, button];
  });

  function show(key, remember) {
    const part = parts.find((entry) => entry.key === key) || parts[0];
    for (const [name, button] of buttons) {
      const lit = name === part.key;
      button.classList.toggle('is-active', lit);
      button.setAttribute('aria-selected', String(lit));
    }
    clear(body);
    body.append(...[].concat(part.render()));
    if (remember) {
      const url = new URL(window.location.href);
      url.searchParams.set('s', part.key);
      history.replaceState({}, '', url.pathname + url.search);
    }
  }

  main.append(el('div', { class: 'page shell' },
    el('a', { class: 'backlink', href: '/grammatica', 'data-link': '' }, 'Grammar'),
    el('div', { class: 'page__head' },
      el('h1', {}, topic.title.toLowerCase()),
      el('p', {}, topic.lead)),
    el('div', { class: 'toolbar' }, tabs),
    body));

  show(new URLSearchParams(window.location.search).get('s'), false);
}

// --- a section of a reference sheet -----------------------------------------------

function sectionView(section) {
  return el('section', { class: 'panel grammar__card' },
    el('h2', { class: 'mood__title' }, section.title),
    ...section.blocks.map(block));
}

function block(item) {
  if (item.type === 'h') return el('h3', { class: 'grammar__sub' }, ...rich(item.text));
  if (item.type === 'p') return el('p', { class: 'grammar__p' }, ...rich(item.text));
  if (item.type === 'ul') {
    return el('ul', { class: 'grammar__list' }, ...item.items.map((text) => el('li', {}, ...rich(text))));
  }
  return table(item.head, item.rows);
}

/**
 * A paradigm (short forms in every cell) scrolls sideways on a phone with its
 * first column pinned, as the conjugation tables do. A table of prose stacks
 * instead, each cell under its column's name, because sideways scrolling
 * through sentences is no way to read them.
 */
function table(head, rows) {
  const prose = rows.some((row) => row.some((cell) => plain(cell).length > 34));
  return el('div', { class: `tablewrap grammar__table${prose ? ' grammar__table--prose' : ''}` },
    el('table', { class: `conj ${prose ? 'conj--prose' : 'conj--paradigm'}` },
      el('thead', {}, el('tr', {}, ...head.map((cell) => el('th', { scope: 'col' }, cell)))),
      el('tbody', {}, ...rows.map((row) => el('tr', {},
        el('th', { scope: 'row' }, ...rich(row[0])),
        ...row.slice(1).map((cell, index) => el('td', { 'data-label': head[index + 1] }, ...rich(cell))))))));
}

// --- one case ---------------------------------------------------------------------

function caseView(entry) {
  const out = [
    el('section', { class: 'panel grammar__card grammar__case' },
      el('h2', { class: 'mood__title' }, entry.label.toLowerCase()),
      el('div', { class: 'grammar__casetags' },
        el('span', { class: 'chip chip--es' }, entry.latin),
        el('span', { class: 'chip' }, entry.asks),
        el('span', { class: 'chip' }, entry.uses.length === 1 ? '1 use' : `${entry.uses.length} uses`))),
    el('div', { class: 'grammar__uses' }, ...entry.uses.map(useCard)),
  ];
  if (entry.table) {
    out.push(el('section', { class: 'panel grammar__card' },
      el('h2', { class: 'mood__title' }, entry.table.title),
      table(entry.table.head, entry.table.rows)));
  }
  return out;
}

function useCard(use) {
  return el('article', { class: 'grammar__use' },
    el('h3', {}, use.name),
    el('p', { class: 'grammar__what' }, use.what),
    ...use.examples.map(([latin, english]) => el('div', { class: 'sense__example grammar__example' },
      el('p', { lang: 'la' }, latin),
      el('p', {}, english))),
    el('p', { class: 'grammar__look' },
      el('span', {}, 'Look for'),
      use.look));
}

// --- text -------------------------------------------------------------------------

/** The sheets' text carries <i> and <b> and nothing else; they become elements. */
function rich(text) {
  const out = [];
  const stack = [];
  for (const piece of String(text).split(/(<\/?[ib]>)/)) {
    if (!piece) continue;
    const tag = piece.match(/^<(\/?)([ib])>$/);
    if (tag && !tag[1]) {
      stack.push(el(tag[2] === 'i' ? 'em' : 'strong', {}));
    } else if (tag) {
      const node = stack.pop();
      (stack.length ? stack[stack.length - 1] : { append: (child) => out.push(child) }).append(node);
    } else if (stack.length) {
      stack[stack.length - 1].append(piece);
    } else {
      out.push(piece);
    }
  }
  return out;
}

function plain(text) {
  return String(text).replace(/<[^>]+>/g, '');
}
