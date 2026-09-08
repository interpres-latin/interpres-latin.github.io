import { renderHome } from './views/home.js';
import { renderConjugator } from './views/conjugator.js';
import { renderDictionary } from './views/dictionary.js';
import { renderChat } from './views/chat.js';
import { renderDeclensions } from './views/declensions.js';
import { renderStages } from './views/stages.js';
import { clear } from './lib/dom.js';
import { mountThemeToggle } from './lib/theme.js';
import { mountLanguageSwitch } from './lib/language-switch.js';
import { t } from './lib/i18n.js';

const ROUTES = [
  { path: '/', nav: 'traductor', render: renderHome },
  { path: '/conjugacion', nav: 'conjugacion', render: renderConjugator },
  { path: '/declinationes', nav: 'declinationes', render: renderDeclensions },
  { path: '/stadia', nav: 'stadia', render: renderStages },
  { path: '/diccionario', nav: 'diccionario', render: renderDictionary },
  { path: '/chat', nav: 'chat', render: renderChat },
];

const main = document.getElementById('main');
const links = document.querySelector('.nav__links');
const toggle = document.querySelector('.nav__toggle');
const more = document.querySelector('.navmore');
const moreButton = more.querySelector('.navmore__button');
const moreList = more.querySelector('.navmore__list');

mountThemeToggle(document.querySelector('.nav__theme'));
mountLanguageSwitch(document.querySelector('.langswitch'));

const NAV_KEYS = {
  traductor: 'translator',
  conjugacion: 'conjugation',
  declinationes: 'declension',
  stadia: 'stages',
  diccionario: 'dictionary',
  chat: 'chat',
};

function paintChrome() {
  for (const link of document.querySelectorAll('[data-nav]')) {
    link.textContent = t(`nav.${NAV_KEYS[link.dataset.nav]}`);
  }
  moreButton.textContent = t('nav.more');
  document.querySelector('.skip-link').textContent = t('meta.skip');
  const footer = document.querySelector('.footer p');
  clear(footer);
  footer.append('Interpres · ', t('meta.footer'), ' ');
  footer.appendChild(Object.assign(document.createElement('a'), {
    href: t('meta.footerHref'), target: '_blank', rel: 'noopener', textContent: t('meta.footerDict'),
  }));
  footer.append(t('meta.footerCredit'));
  footer.appendChild(Object.assign(document.createElement('span'), {
    className: 'footer__legal',
    textContent: t('meta.copyright'),
  }));
}

let teardown = null;
// Includes the query, so /conjugacion?v=rego re-renders when arriving from
// /conjugacion — the verb lives in the query, not the path.
let currentKey = null;

function match(pathname) {
  return ROUTES.find((route) => route.path === pathname) || ROUTES[0];
}

/**
 * Which nav item is lit.
 *
 * The home page holds two things — the hero and the translator — so being on
 * "/" is not the same as being at the translator. At the top of the page
 * nothing is lit; the translator lights up when its anchor is the one you are
 * at. Every other page is a page, and lights its own link.
 */
function markActive(nav, hash = window.location.hash) {
  const lit = nav === 'traductor' && !hash ? '' : nav;
  for (const link of document.querySelectorAll('[data-nav]')) {
    link.classList.toggle('is-active', link.dataset.nav === lit);
  }
  // A page reached from the menu still has to look reached, so the button
  // carries the active mark on behalf of whatever is open inside it.
  more.classList.toggle('is-active', Boolean(moreList.querySelector(`[data-nav="${lit}"]`)));
}

function closeMore() {
  moreList.hidden = true;
  moreButton.setAttribute('aria-expanded', 'false');
}

function scrollToHash(hash) {
  if (!hash) return false;
  const target = document.getElementById(hash.slice(1));
  if (!target) return false;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

async function navigate({ replace = false } = {}) {
  const route = match(window.location.pathname);
  const { hash } = window.location;

  const key = window.location.pathname + window.location.search;
  if (key !== currentKey) {
    if (typeof teardown === 'function') teardown();
    teardown = null;
    clear(main);
    // The site is called Interpres on every page of it. A title that renames
    // itself per section tells the reader which tab is theirs and nothing else.
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
  links.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  closeMore();

  /**
   * The query is part of the destination, not decoration on it.
   *
   * Every page keeps what you are looking at in the query — `?v=rego`,
   * `?n=rex, regis`, `?q=canem` — and this used to push only the path, so a
   * link that carried a word arrived without it. That is what the chat's
   * "full table" and "full entry" links are: the answer names a word and offers
   * to open the page on it, and the page opened on nothing instead.
   *
   * "Same page" has to mean the query as well, for the same reason. Two links
   * to /conjugacion with different verbs are two different destinations, and
   * treating them as one scrolled to the top of the verb already on screen.
   */
  const samePage = url.pathname === window.location.pathname
    && url.search === window.location.search;

  if (samePage && url.hash) {
    history.replaceState({}, '', url.pathname + url.search + url.hash);
    // The hash is part of where you are, so the nav has to follow it: on the
    // home page the translator link lights at its anchor and nowhere else.
    markActive(match(url.pathname).nav, url.hash);
    scrollToHash(url.hash);
    return;
  }
  /**
   * Same page, no anchor asked for: go to the top of it.
   *
   * The old condition also required the *current* URL to have no hash, so
   * clicking the wordmark from /#interpres did nothing at all: it pushed "/"
   * with no hash, the router saw the same path and query and re-rendered
   * nothing, and no scroll happened. Only the second click worked, by which
   * time the hash was gone. The hash is cleared here instead.
   */
  if (samePage && !url.hash) {
    if (window.location.hash) history.replaceState({}, '', url.pathname + url.search);
    markActive(match(url.pathname).nav, '');
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

toggle.addEventListener('click', () => {
  const open = links.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', String(open));
});

moreButton.addEventListener('click', (event) => {
  event.stopPropagation();
  const open = moreList.hidden;
  moreList.hidden = !open;
  moreButton.setAttribute('aria-expanded', String(open));
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.navmore')) closeMore();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMore();
});

document.addEventListener('click', onClick);
window.addEventListener('popstate', () => navigate({ replace: true }));

// A language change rebuilds the current view, since every string is baked in
// at render time rather than bound.
window.addEventListener('langchange', () => {
  paintChrome();
  currentKey = null;
  navigate({ replace: true });
});

paintChrome();

navigate({ replace: true });
