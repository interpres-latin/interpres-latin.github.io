import { el, icon, ICONS, clear, debounce, postJson } from '../lib/dom.js';
import { startNetwork } from '../lib/network.js';
import { startWallpaper } from '../lib/wallpaper.js';
import { lang, t } from '../lib/i18n.js';

const LANGUAGES = {
  es: { label: 'Español', colour: 'var(--es)', placeholder: 'translator.placeholderEs', out: 'translator.outEs' },
  en: { label: 'English', colour: 'var(--en)', placeholder: 'translator.placeholderEn', out: 'translator.outEn' },
};

const MAX_CHARS = 5000;
const SAMPLE_WORDS = ['sobremesa', 'madrugar', 'entrañable', 'friolero', 'estrenar'];

export function renderHome(main) {
  const canvas = el('canvas', { class: 'hero__canvas', 'aria-hidden': 'true' });
  // The photo sits in its own child so the parallax transform and the opacity
  // fade do not fight over the same element.
  const wallpaper = el('div', { class: 'wallpaper', 'aria-hidden': 'true' },
    el('div', { class: 'wallpaper__photo' }),
    el('div', { class: 'wallpaper__scrim' }));

  const hero = el('section', { class: 'hero' },
    canvas,
    el('div', { class: 'hero__inner' },
      el('p', { class: 'hero__badge' }, t('hero.badge')),
      el('h1', { class: 'hero__title' }, 'ProfeGPT'),
      el('p', { class: 'hero__sub' }, t('hero.sub')),
      el('div', { class: 'hero__cta' },
        el('a', { class: 'btn btn--primary', href: '/#traductor', 'data-link': '' }, t('hero.ctaTranslate')),
        el('a', { class: 'btn', href: '/chat', 'data-link': '' }, t('hero.ctaChat')))));

  const translator = el('section', { class: 'translator shell', id: 'traductor' });
  buildTranslator(translator);

  const finder = buildFinder();

  const features = el('section', { class: 'features shell' },
    feature('01', '/conjugacion', t('features.conjugation'), t('features.conjugationBody')),
    feature('02', '/diccionario', t('features.dictionary'), t('features.dictionaryBody')),
    feature('03', '/chat', t('features.chat'), t('features.chatBody')));

  main.append(wallpaper, hero, translator, finder, features);

  const stopNetwork = startNetwork(canvas);
  const stopWallpaper = startWallpaper(wallpaper, translator, finder);

  return () => { stopNetwork(); stopWallpaper(); };
}

function feature(number, href, title, body) {
  return el('a', { class: 'feature', href, 'data-link': '' },
    el('span', { class: 'feature__num' }, number),
    el('h3', {}, title),
    el('p', {}, body));
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
    placeholder: 'sobremesa',
    autocomplete: 'off',
    spellcheck: false,
    'aria-label': t('finder.label'),
  });

  const form = el('form', { class: 'finder__form' },
    input,
    el('button', { type: 'submit' }, t('finder.button')));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    openDictionary(input.value);
  });

  return el('section', { class: 'finder', id: 'buscador' },
    el('div', { class: 'shell' },
      el('div', { class: 'finder__grid' },
        el('div', {},
          el('p', { class: 'eyebrow' }, t('finder.eyebrow')),
          el('h2', {}, t('finder.title')),
          el('p', { class: 'finder__lead' }, t('finder.lead'))),
        el('div', {},
          form,
          el('div', { class: 'finder__hints' },
            el('span', {}, t('finder.tryWith')),
            ...SAMPLE_WORDS.map((word) =>
              el('button', { type: 'button', onclick: () => openDictionary(word) }, word))),
          el('p', { class: 'finder__note' }, t('finder.note'))))));
}

// ---------------------------------------------------------------------------

function buildTranslator(root) {
  const state = { from: 'es', to: 'en', pending: null };

  const input = el('textarea', { spellcheck: false, maxLength: MAX_CHARS, 'aria-label': t('translator.sourceLabel') });

  const output = el('div', {
    class: 'pane__out',
    'aria-live': 'polite',
    'data-placeholder': t('translator.outEs'),
  });

  const sourceLang = el('span', {});
  const targetLang = el('span', {});
  const sourceDot = el('span', { class: 'pane__dot' });
  const targetDot = el('span', { class: 'pane__dot' });
  const counter = el('span', {}, `0 / ${MAX_CHARS}`);
  const status = el('span', {}, t('translator.ready'));
  const engine = el('span', {}, '');

  const copy = el('button', { class: 'btn btn--sm', type: 'button', title: t('translator.copy') },
    icon(ICONS.copy, { size: 13 }), t('translator.copy'));

  copy.addEventListener('click', async () => {
    if (!output.textContent.trim()) return;
    try {
      await navigator.clipboard.writeText(output.textContent);
      copy.lastChild.textContent = t('translator.copied');
      setTimeout(() => { copy.lastChild.textContent = t('translator.copy'); }, 1400);
    } catch {
      copy.lastChild.textContent = t('translator.copyFailed');
      setTimeout(() => { copy.lastChild.textContent = t('translator.copy'); }, 1400);
    }
  });

  const swap = el('button', {
    class: 'swap',
    type: 'button',
    title: t('translator.swapTitle'),
    'aria-label': t('translator.swap'),
  }, icon(ICONS.swap, { size: 18 }));

  const sourcePane = el('div', { class: 'pane pane--source' },
    el('div', { class: 'pane__bar' },
      el('span', { class: 'pane__lang' }, sourceDot, sourceLang),
      el('button', { class: 'btn btn--sm', type: 'button', onclick: () => { input.value = ''; sync(); } }, t('translator.clear'))),
    el('div', { class: 'pane__body' }, input),
    el('div', { class: 'pane__foot' }, counter, status));

  const targetPane = el('div', { class: 'pane' },
    el('div', { class: 'pane__bar' },
      el('span', { class: 'pane__lang' }, targetDot, targetLang),
      copy),
    el('div', { class: 'pane__body' }, output),
    el('div', { class: 'pane__foot' }, engine, el('span', {})));

  root.append(
    el('div', { class: 'translator__head' },
      el('div', {},
        el('p', { class: 'eyebrow' }, t('translator.eyebrow')),
        el('h2', {}, t('translator.title')),
        el('p', {}, t('translator.lead'))),
      el('button', { class: 'btn btn--primary', type: 'button', onclick: () => translate(true) }, t('translator.button'))),
    el('div', { class: 'trio' }, sourcePane, swap, targetPane),
  );

  // --- behaviour -----------------------------------------------------------

  function paintLanguages() {
    const source = LANGUAGES[state.from];
    const target = LANGUAGES[state.to];
    sourceLang.textContent = source.label;
    targetLang.textContent = target.label;
    sourceDot.style.background = source.colour;
    targetDot.style.background = target.colour;
    input.placeholder = t(source.placeholder);
    output.dataset.placeholder = t(target.out);
  }

  function sync() {
    counter.textContent = `${input.value.length} / ${MAX_CHARS}`;
    if (!input.value.trim()) {
      clear(output);
      engine.textContent = '';
      status.textContent = t('translator.ready');
      return;
    }
    scheduleTranslate();
  }

  async function translate(force = false) {
    const text = input.value.trim();
    if (!text) return;

    state.pending?.abort();
    const controller = new AbortController();
    state.pending = controller;

    clear(status);
    status.append(el('span', { class: 'spinner' }), ` ${t('translator.working')}`);

    try {
      const data = await postJson('/api/translate', { text, from: state.from }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      output.textContent = data.translation || '';
      engine.textContent = data.engine ? t('translator.engine', { engine: data.engine }) : '';
      status.textContent = force ? t('translator.done') : t('translator.ready');
    } catch (error) {
      if (controller.signal.aborted || error.name === 'AbortError') return;
      clear(status);
      status.append(el('span', { class: 'error' }, error.message));
    } finally {
      if (state.pending === controller) state.pending = null;
    }
  }

  const scheduleTranslate = debounce(() => translate(), 650);

  swap.addEventListener('click', () => {
    scheduleTranslate.cancel();
    state.pending?.abort();

    // Keep what is on screen: the translation becomes the new source text.
    const previousOutput = output.textContent;
    const previousInput = input.value;
    [state.from, state.to] = [state.to, state.from];
    input.value = previousOutput;
    output.textContent = previousOutput ? previousInput : '';

    paintLanguages();
    counter.textContent = `${input.value.length} / ${MAX_CHARS}`;

    swap.classList.toggle('is-turning');
    input.focus();

    if (input.value.trim()) translate();
    else { clear(output); engine.textContent = ''; status.textContent = t('translator.ready'); }
  });

  input.addEventListener('input', sync);
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      scheduleTranslate.cancel();
      translate(true);
    }
  });

  paintLanguages();
  sync();
}
