/**
 * The menu: three lines at the right-hand end of the header.
 *
 * The header shows as many page links as fit its width; the ones that do not
 * fit move into this menu, last first, the way Duolingo's header folds. The
 * menu also lists the course stages, each opening the dictionary on it.
 */

import { el, icon, ICONS } from './dom.js';
import { BOOKS, STAGE_NUMBERS } from '../data/stages-la.js';

export function mountMenu(nav) {
  const inner = nav.querySelector('.nav__inner');
  const brand = nav.querySelector('.nav__brand');
  const right = nav.querySelector('.nav__right');
  const links = [...nav.querySelectorAll('.nav__links a')];
  const holder = nav.querySelector('.nav__end');

  const button = el('button', {
    class: 'nav__menu',
    type: 'button',
    'aria-label': 'Menu',
    title: 'Menu',
    'aria-haspopup': 'true',
    'aria-expanded': 'false',
  }, icon(ICONS.menu, { size: 20, width: 2.6 }));
  holder.replaceChildren(button);

  let panel = null;

  // --- the links that fit ------------------------------------------------------

  function fit() {
    for (const link of links) link.hidden = false;
    const style = getComputedStyle(inner);
    const gap = parseFloat(getComputedStyle(right).columnGap) || 0;
    const linkGap = parseFloat(getComputedStyle(links[0].parentElement).columnGap) || 0;
    const room = inner.clientWidth
      - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      - brand.offsetWidth - (parseFloat(style.columnGap) || 0)
      - holder.offsetWidth - gap;

    let used = 0;
    let full = false;
    links.forEach((link, index) => {
      const width = link.offsetWidth + (index ? linkGap : 0);
      if (!full && used + width <= room) used += width;
      else full = true;
      link.hidden = full;
    });
  }

  // --- the panel -----------------------------------------------------------------

  function close() {
    panel?.remove();
    panel = null;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey);
  }

  const onOutside = (event) => { if (!holder.contains(event.target)) close(); };
  const onKey = (event) => { if (event.key === 'Escape') { close(); button.focus(); } };

  function build() {
    const here = window.location.pathname.replace(/\/+$/, '') || '/';
    const stage = here === '/diccionario' ? Number(new URLSearchParams(window.location.search).get('s')) : 0;
    const folded = links.filter((link) => link.hidden);

    const pages = folded.length
      ? [
        el('p', { class: 'menu__title' }, 'Pages'),
        el('div', { class: 'menu__rows' },
          ...folded.map((link) => el('a', {
            class: `menu__row${link.classList.contains('is-active') ? ' is-active' : ''}`,
            href: link.getAttribute('href'),
            'data-link': '',
          }, link.textContent))),
      ]
      : [];

    const stages = [
      el('p', { class: `menu__title${folded.length ? ' menu__title--rule' : ''}` }, 'Stages'),
      ...BOOKS.map((book) => el('div', { class: 'menu__book' },
        el('span', { class: 'menu__label' }, book.label),
        el('div', { class: 'menu__stages' },
          ...STAGE_NUMBERS.filter((number) => number >= book.from && number <= book.to)
            .map((number) => el('a', {
              class: `menu__stage${number === stage ? ' is-active' : ''}`,
              href: `/diccionario?s=${number}`,
              'data-link': '',
            }, String(number)))))),
    ];

    const menu = el('div', { class: 'menu', role: 'menu', 'aria-label': 'Menu' }, ...pages, ...stages);
    // A link inside closes the menu; the router does the navigating.
    menu.addEventListener('click', (event) => { if (event.target.closest('a')) close(); });
    return menu;
  }

  function open() {
    panel = build();
    holder.appendChild(panel);
    button.setAttribute('aria-expanded', 'true');
    // Deferred so the click that opened the menu does not shut it again.
    setTimeout(() => {
      document.addEventListener('pointerdown', onOutside, true);
      document.addEventListener('keydown', onKey);
    }, 0);
  }

  button.addEventListener('click', () => (panel ? close() : open()));
  window.addEventListener('popstate', close);

  fit();
  new ResizeObserver(() => fit()).observe(inner);
  document.fonts?.ready.then(fit);
}
