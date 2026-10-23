import { renderHome } from './views/home.js';
import { renderConjugator } from './views/conjugator.js';
import { renderDictionary } from './views/dictionary.js';
import { renderDeclensions } from './views/declensions.js';
import { renderGrammar, renderGrammarTopic } from './views/grammar.js';
import { clear } from './lib/dom.js';
import { mountMenu } from './lib/menu.js';

const ROUTES = [
  { path: '/', nav: 'home', render: renderHome },
  { path: '/conjugacion', nav: 'conjugacion', render: renderConjugator },
  { path: '/declinationes', nav: 'declinationes', render: renderDeclensions },
  { path: '/diccionario', nav: 'diccionario', render: renderDictionary },
  { path: '/grammatica', nav: 'grammatica', render: renderGrammar },
  { path: '/grammatica/adiectiva', nav: 'grammatica', render: (main) => renderGrammarTopic(main, 'adiectiva') },
  { path: '/grammatica/participia', nav: 'grammatica', render: (main) => renderGrammarTopic(main, 'participia') },
  { path: '/grammatica/casus', nav: 'grammatica', render: (main) => renderGrammarTopic(main, 'casus') },
];

/**
 * Old addresses that still have to land somewhere.
 *
 * The stages page is now the left column of the dictionary, and its query
 * (?s=12) means the same thing there. The chat is gone; its links go home.
 */
const MOVED = { '/stadia': '/diccionario', '/chat': '/' };

const main = document.getElementById('main');
const links = document.querySelector('.nav__links');

let teardown = null;
// Includes the query, so /conjugacion?v=rego re-renders when arriving from
// /conjugacion — the verb lives in the query, not the path.
let currentKey = null;

function match(pathname) {
  // A trailing slash is the same page: a static host may add one to a path
  // that is also a folder (/grammatica/ beside /grammatica/casus).
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return ROUTES.find((route) => route.path === path) || ROUTES[0];
}

function markActive(nav) {
  for (const link of links.querySelectorAll('[data-nav]')) {
    const lit = link.dataset.nav === nav;
    link.classList.toggle('is-active', lit);
    if (lit) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

// --- routing ----------------------------------------------------------------

function scrollToHash(hash) {
  if (!hash) return false;
  const target = document.getElementById(hash.slice(1));
  if (!target) return false;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

async function navigate() {
  const moved = MOVED[window.location.pathname];
  if (moved) {
    history.replaceState({}, '', moved + window.location.search + window.location.hash);
  }

  const route = match(window.location.pathname);
  const { hash } = window.location;

  const key = window.location.pathname + window.location.search;
  if (key !== currentKey) {
    if (typeof teardown === 'function') teardown();
    teardown = null;
    clear(main);
    // The stylesheet hangs each page's picture off this.
    main.dataset.page = route.nav;
    document.title = 'Interpres';
    teardown = (await route.render(main)) || null;
    currentKey = key;
    if (!hash) window.scrollTo({ top: 0 });
  }

  markActive(route.nav);
  // Let the freshly mounted view lay out before jumping to an anchor.
  if (hash) requestAnimationFrame(() => scrollToHash(hash));
}

function onClick(event) {
  const link = event.target.closest('a[data-link]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin) return;

  event.preventDefault();

  /**
   * The query is part of the destination, not decoration on it: every page
   * keeps what you are looking at in the query (`?v=rego`, `?n=rex, regis`,
   * `?q=canem`), so two links to one path with different queries are two
   * different places.
   */
  const samePage = url.pathname === window.location.pathname
    && url.search === window.location.search;

  if (samePage && url.hash) {
    history.replaceState({}, '', url.pathname + url.search + url.hash);
    scrollToHash(url.hash);
    return;
  }
  // Same page, no anchor asked for: go to the top of it, and drop any hash so
  // the next click on the logo is not mistaken for "already there".
  if (samePage) {
    if (window.location.hash) history.replaceState({}, '', url.pathname + url.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  history.pushState({}, '', url.pathname + url.search + url.hash);
  navigate();
}

/** Views call this to move between pages from code. */
export function go(to) {
  const url = new URL(to, window.location.origin);
  history.pushState({}, '', url.pathname + url.search + url.hash);
  navigate();
}

mountMenu(document.getElementById('nav'));

document.addEventListener('click', onClick);
window.addEventListener('popstate', () => navigate());

navigate();
