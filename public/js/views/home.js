import { el } from '../lib/dom.js';
import { t } from '../lib/i18n.js';

export function renderHome(main) {
  // Three lines, each its own colour step, the way the Duolingo hero stacks.
  const titleLines = t('hero.title').split('|');

  const hero = el('section', { class: 'hero shell' },
    el('div', { class: 'hero__text' },
      el('h1', { class: 'hero__title' }, ...titleLines.map((line) => el('span', {}, line))),
      el('p', { class: 'hero__sub' }, t('hero.sub')),
      el('div', { class: 'hero__cta' },
        el('a', { class: 'btn btn--primary btn--lg', href: '/diccionario', 'data-link': '' }, t('hero.ctaDictionary')),
        el('a', { class: 'btn btn--lg', href: '/conjugacion', 'data-link': '' }, t('hero.ctaConjugate')))),
    el('div', { class: 'hero__art' },
      el('img', {
        src: '/assets/art/colosseum.svg', alt: '', width: 520, height: 440, decoding: 'async',
      })));

  const finder = buildFinder();

  const features = el('section', { class: 'features shell' },
    el('h2', { class: 'section__title' }, t('features.title')),
    el('div', { class: 'features__grid' },
      feature('/assets/art/helmet.svg', '/conjugacion', t('features.conjugation'), t('features.conjugationBody')),
      feature('/assets/art/column.svg', '/declinationes', t('features.declension'), t('features.declensionBody')),
      feature('/assets/art/scroll.svg', '/diccionario', t('features.dictionary'), t('features.dictionaryBody'))));

  main.append(hero, el('hr', { class: 'rule shell' }), features, finder);
}

function feature(art, href, title, body) {
  return el('a', { class: 'feature', href, 'data-link': '' },
    el('img', { class: 'feature__art', src: art, alt: '', width: 72, height: 72 }),
    el('div', {},
      el('h3', {}, title),
      el('p', {}, body)));
}

/** Send the visitor to the dictionary page with the query already applied. */
function openDictionary(word) {
  const query = String(word || '').trim();
  if (!query) return;
  history.pushState({}, '', `/diccionario?q=${encodeURIComponent(query)}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// ---------------------------------------------------------------------------

function buildFinder() {
  const input = el('input', {
    type: 'search',
    name: 'q',
    placeholder: t('finder.samples').split(',')[0],
    autocomplete: 'off',
    spellcheck: false,
    'aria-label': t('finder.label'),
  });

  const form = el('form', { class: 'finder__form' },
    input,
    el('button', { class: 'btn btn--primary', type: 'submit' }, t('finder.button')));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    openDictionary(input.value);
  });

  return el('section', { class: 'finder', id: 'buscador' },
    el('div', { class: 'shell' },
      el('div', { class: 'finder__grid' },
        el('div', { class: 'finder__intro' },
          el('img', { class: 'finder__art', src: '/assets/art/owl.svg', alt: '', width: 96, height: 96 }),
          el('p', { class: 'eyebrow' }, t('finder.eyebrow')),
          el('h2', {}, t('finder.title')),
          el('p', { class: 'finder__lead' }, t('finder.lead'))),
        el('div', {},
          form,
          el('div', { class: 'finder__hints' },
            el('span', {}, t('finder.tryWith')),
            ...t('finder.samples').split(',').map((word) =>
              el('button', { type: 'button', onclick: () => openDictionary(word) }, word))),
          el('p', { class: 'finder__note' }, t('finder.note'))))));
}
