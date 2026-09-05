import { renderHome } from './views/home.js';
import { renderConjugator } from './views/conjugator.js';
import { renderDictionary } from './views/dictionary.js';
import { renderChat } from './views/chat.js';
import { clear } from './lib/dom.js';
import { mountThemeToggle } from './lib/theme.js';
import { mountLanguageSwitch, restoreLock } from './lib/language-switch.js';
import { lang, t } from './lib/i18n.js';

const ROUTES = [
  { path: '/', nav: 'traductor', render: renderHome },
  { path: '/conjugacion', nav: 'conjugacion', render: renderConjugator },
  { path: '/diccionario', nav: 'diccionario', render: renderDictionary },
  { path: '/chat', nav: 'chat', render: renderChat },
];

const main = document.getElementById('main');
const links = document.querySelector('.nav__links');
const toggle = document.querySelector('.nav__toggle');

mountThemeToggle(document.querySelector('.nav__theme'));
mountLanguageSwitch(document.querySelector('.langswitch'));
restoreLock();

function paintChrome() {
  for (const link of document.querySelectorAll('[data-nav]')) {
    link.textContent = t(`nav.${{ traductor: 'translator', conjugacion: 'conjugation', diccionario: 'dictionary', chat: 'chat' }[link.dataset.nav]}`);
  }
  document.querySelector('.skip-link').textContent = t('meta.skip');
  const footer = document.querySelector('.footer p');
  clear(footer);
  footer.append('ProfeGPT · ', t('meta.footer'), ' ');
  footer.appendChild(Object.assign(document.createElement('a'), {
    href: 'https://dle.rae.es', target: '_blank', rel: 'noopener', textContent: t('meta.footerDict'),
  }));
  footer.append(' (RAE)');
}

let teardown = null;
let currentPath = null;

function match(pathname) {
  return ROUTES.find((route) => route.path === pathname) || ROUTES[0];
}

function markActive(nav) {
  for (const link of document.querySelectorAll('[data-nav]')) {
    link.classList.toggle('is-active', link.dataset.nav === nav);
  }
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

  if (route.path !== currentPath) {
    if (typeof teardown === 'function') teardown();
    teardown = null;
    clear(main);
    document.title = route.path === '/' ? t('meta.home') : `ProfeGPT · ${t(`nav.${route.nav === 'traductor' ? 'translator' : route.nav === 'conjugacion' ? 'conjugation' : route.nav === 'diccionario' ? 'dictionary' : 'chat'}`)}`;
    teardown = (await route.render(main)) || null;
    currentPath = route.path;
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

  const samePage = url.pathname === window.location.pathname;
  if (samePage && url.hash) {
    history.replaceState({}, '', url.pathname + url.hash);
    scrollToHash(url.hash);
    return;
  }
  if (samePage && !url.hash && !window.location.hash) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  history.pushState({}, '', url.pathname + url.hash);
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

document.addEventListener('click', onClick);
window.addEventListener('popstate', () => navigate({ replace: true }));

// A language change rebuilds the current view, since every string is baked in
// at render time rather than bound.
window.addEventListener('langchange', () => {
  paintChrome();
  currentPath = null;
  navigate({ replace: true });
});

paintChrome();

navigate({ replace: true });
