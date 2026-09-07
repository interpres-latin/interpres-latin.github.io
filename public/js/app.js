import { renderHome } from './views/home.js';
import { renderConjugator } from './views/conjugator.js';
import { renderDictionary } from './views/dictionary.js';
import { renderChat } from './views/chat.js';
import { renderDeclensions } from './views/declensions.js';
import { renderStages } from './views/stages.js';
import { clear } from './lib/dom.js';
import { mountThemeToggle } from './lib/theme.js';
import { mountLanguageSwitch, restoreLock } from './lib/language-switch.js';
import { mountSiteLock } from './lib/site-lock.js';
import { followStudyLanguage, t } from './lib/i18n.js';
import { studyLang } from './lib/study.js';

/**
 * `only` marks a page that exists in one study language. Latin grows two the
 * modern languages have no use for — a declension table, and the course's
 * vocabulary by stage — and asking for one in Spanish falls back to the home
 * page rather than rendering something the site is not about.
 */
const ROUTES = [
  { path: '/', nav: 'traductor', render: renderHome },
  { path: '/conjugacion', nav: 'conjugacion', render: renderConjugator },
  { path: '/declinationes', nav: 'declinationes', render: renderDeclensions, only: 'la' },
  { path: '/stadia', nav: 'stadia', render: renderStages, only: 'la' },
  { path: '/diccionario', nav: 'diccionario', render: renderDictionary },
  { path: '/chat', nav: 'chat', render: renderChat },
];

const main = document.getElementById('main');
const links = document.querySelector('.nav__links');
const toggle = document.querySelector('.nav__toggle');

mountThemeToggle(document.querySelector('.nav__theme'));
const refreshLanguageSwitch = mountLanguageSwitch(document.querySelector('.langswitch'));
mountSiteLock(document.querySelector('.nav__lock'));
restoreLock();

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
    const only = link.dataset.only;
    // A link to a page this language does not have is taken out of the nav
    // entirely rather than left to lead somewhere unhelpful.
    link.hidden = Boolean(only) && only !== studyLang();
    if (link.hidden) continue;
    link.textContent = t(`nav.${NAV_KEYS[link.dataset.nav]}`);
  }
  document.querySelector('.skip-link').textContent = t('meta.skip');
  const footer = document.querySelector('.footer p');
  clear(footer);
  footer.append('ProfeGPT · ', t('meta.footer'), ' ');
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
// Includes the query, so /conjugacion?v=ir re-renders when arriving from
// /conjugacion — the verb lives in the query, not the path.
let currentKey = null;

function match(pathname) {
  const found = ROUTES.find((route) => route.path === pathname);
  if (!found) return ROUTES[0];
  return !found.only || found.only === studyLang() ? found : ROUTES[0];
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

  const key = window.location.pathname + window.location.search;
  if (key !== currentKey) {
    if (typeof teardown === 'function') teardown();
    teardown = null;
    clear(main);
    document.title = route.path === '/' ? t('meta.home') : `ProfeGPT · ${t(`nav.${NAV_KEYS[route.nav]}`)}`;
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
  currentKey = null;
  navigate({ replace: true });
});

// So does a change of *study* language — the site swapping from Spanish to
// French replaces the strings, the tables and the dictionary behind the page,
// which is every bit as much of a rebuild. The chrome language follows first,
// since ES is no longer one of the options once the site is about French.
window.addEventListener('studychange', () => {
  // Order matters: the interface language has to settle before the switch is
  // rebuilt, or it paints LA and EN against a language that is still ES and
  // marks neither of them as the one you are reading.
  followStudyLanguage();
  refreshLanguageSwitch();
  paintChrome();

  // Drop the query as well. Every page keeps what you looked at in the URL —
  // ?v=parler, ?q=sobremesa — and rebuilding the view would otherwise reload a
  // French verb into the Latin conjugator. The subject changed; the search
  // should start empty.
  history.replaceState({}, '', window.location.pathname);

  currentKey = null;
  navigate({ replace: true });
});

paintChrome();

navigate({ replace: true });
