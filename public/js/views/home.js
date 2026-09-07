import { el, icon, ICONS, clear, debounce, postJson } from '../lib/dom.js';
import { startNetwork } from '../lib/network.js';
import { startWallpaper, wallpaperLayer } from '../lib/wallpaper.js';
import { pick, t } from '../lib/i18n.js';
import { modeCommand, setStudyLang, studyLang } from '../lib/study.js';
import { subjectAllowed } from '../lib/restriction.js';
import { fireConfetti } from '../lib/confetti.js';
import { toast } from '../lib/toast.js';

/**
 * The two sides of the translator: the language the site is about, and English.
 * `--es` is the study language's marker colour whichever language that is —
 * the palette has one accent per side of the pane, not one per language.
 */
const LANGUAGES = () => ({
  [studyLang()]: {
    label: t('translator.studyName'),
    colour: 'var(--es)',
    placeholder: 'translator.placeholderStudy',
    out: 'translator.outStudy',
  },
  en: {
    label: t('translator.englishName'),
    colour: 'var(--en)',
    placeholder: 'translator.placeholderEn',
    out: 'translator.outEn',
  },
});

const MAX_CHARS = 500;

/** Any capitalisation, any spacing. */
const GRADUATION = /^\s*graduation\s*2028\s*$/i;

export function renderHome(main) {
  const canvas = el('canvas', { class: 'hero__canvas', 'aria-hidden': 'true' });
  // Behind the hero and the translator both, then gone by the dictionary search.
  const wallpaper = wallpaperLayer();

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
  const stopWallpaper = startWallpaper(wallpaper, finder);

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
    placeholder: t('finder.samples').split(',')[0],
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
            ...t('finder.samples').split(',').map((word) =>
              el('button', { type: 'button', onclick: () => openDictionary(word) }, word))),
          el('p', { class: 'finder__note' }, t('finder.note'))))));
}

// ---------------------------------------------------------------------------

/** The one thing on this site that is not about grammar. */
function celebrate() {
  if (document.querySelector('.ole')) return;

  const canvas = el('canvas', { class: 'ole__confetti', 'aria-hidden': 'true' });
  const overlay = el('div', { class: 'ole', role: 'dialog', 'aria-label': '¡Olé!' },
    canvas,
    el('div', { class: 'ole__inner' },
      el('p', { class: 'ole__word' }, '¡Olé!'),
      el('p', { class: 'ole__sub' }, 'Graduación 2028')));

  const close = () => { stop(); overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (event) => { if (event.key === 'Escape') close(); };

  overlay.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);

  const stop = fireConfetti(canvas);
  requestAnimationFrame(() => overlay.classList.add('is-open'));
  setTimeout(close, 6000);
}

/**
 * The way into the French side of the site, and back out again.
 *
 * It is typed into the translator rather than clicked in the navigation, which
 * is the whole point: the French ProfeGPT sits behind the Spanish one and is
 * found by knowing the phrase. Handled before anything is sent anywhere — this
 * is a command, not text to translate.
 */
function switchMode(next, state, output, status) {
  state.pending?.abort();
  output.textContent = '';
  status.textContent = '';
  // setStudyLang fires studychange, which the router answers by tearing this
  // view down and rebuilding it in the new language — which is announcement
  // enough. The whole page changing does not need a notice on top of it.
  setStudyLang(next);
}

function buildTranslator(root) {
  const state = { from: 'en', to: studyLang(), pending: null };

  const input = el('textarea', { spellcheck: false, maxLength: MAX_CHARS, 'aria-label': t('translator.sourceLabel') });

  const output = el('div', {
    class: 'pane__out',
    'aria-live': 'polite',
    'data-placeholder': t('translator.outStudy'),
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

  const notes = el('div', { class: 'idioms' });
  // Latin only: every word of the translation, with its case. See the comment
  // on paintParses.
  const parses = el('div', { class: 'parses-pane' });

  const targetPane = el('div', { class: 'pane' },
    el('div', { class: 'pane__bar' },
      el('span', { class: 'pane__lang' }, targetDot, targetLang),
      copy),
    el('div', { class: 'pane__body' }, output),
    notes,
    parses,
    el('div', { class: 'pane__foot' }, engine, el('span', {})));

  /**
   * Every Latin word of the translation, with the case it is in.
   *
   * No free engine produces reliably correct Latin — Google renders "the dog of
   * the girl" as *canem puellae*, with the dog in the accusative — so the
   * server parses what comes back through Whitaker's Words and corrects the
   * head noun where the English leaves no doubt. This shows the reader the
   * result rather than asking them to take it on trust, and flags any word that
   * is not Latin at all.
   */
  /**
   * Write the translation out, marking the words the engine gave up on.
   *
   * Apertium flags a word it has no entry for; those used to be silently
   * unmarked, so a French sentence containing the English "chaîne" looked
   * exactly as translated as the rest of it. They are the one part of the
   * sentence the engine is telling you not to trust, so they are the one part
   * that is coloured.
   *
   * textContent still reads back the whole sentence, so copying and the swap
   * button are unaffected.
   */
  function paintOutput(text, unsure) {
    clear(output);
    if (!text) return;

    const words = (unsure ?? []).filter(Boolean);
    if (!words.length) { output.textContent = text; return; }

    const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'giu');

    // split() with a capture group alternates plain text and matches.
    for (const [index, piece] of text.split(pattern).entries()) {
      if (!piece) continue;
      output.appendChild(index % 2
        ? el('span', { class: 'unsure', title: t('translator.unsureWord') }, piece)
        : document.createTextNode(piece));
    }
  }

  function paintParses(latin) {
    clear(parses);
    output.classList.remove('output--unreliable');
    if (!latin?.parses?.length) return;

    // An engine that left English words behind did not translate the sentence,
    // so the sentence stops looking like an answer.
    output.classList.toggle('output--unreliable', latin.reliable === false);

    for (const note of latin.notes || []) {
      parses.appendChild(el('p', {
        class: { case: 'parses__fixed', untranslated: 'parses__alarm' }[note.kind] || 'parses__warn',
      }, note.kind === 'case' ? `${t('translator.caseFixed')}: ${note.from} → ${note.to}. ${note.why}` : note.why));
    }

    parses.appendChild(el('p', { class: 'parses__head' }, t('translator.parseTitle')));

    for (const word of latin.parses) {
      const best = word.readings?.[0];
      // Every reading of the form, not just the first. A Latin ending is
      // routinely ambiguous — *agricolae* is genitive, dative and nominative
      // plural at once — and showing one of the three would be telling the
      // reader something the word does not actually say.
      const grammar = (best?.parses ?? []).slice(0, 4).join(' · ');
      parses.appendChild(el('div', { class: 'parses__row' },
        el('b', {}, word.word),
        best
          ? el('span', {},
            el('i', {}, best.headword),
            grammar ? el('span', { class: 'parses__grammar' }, grammar) : null)
          : el('span', { class: 'parses__warn' }, t('translator.parseUnknown'))));
    }
  }

  /** Idioms are worth pointing at: the pairing is the thing being taught. */
  function paintNotes(list) {
    clear(notes);
    for (const note of list || []) {
      notes.appendChild(el('div', { class: 'idioms__item' },
        el('p', { class: 'idioms__pair' },
          el('span', {}, note.source),
          el('span', { class: 'idioms__arrow' }, ' = '),
          el('b', {}, note.target)),
        el('p', { class: 'idioms__meaning' }, pick(note.meaning))));
    }
  }

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
    const languages = LANGUAGES();
    const source = languages[state.from];
    const target = languages[state.to];
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
      clear(notes);
      clear(parses);
      engine.textContent = '';
      status.textContent = t('translator.ready');
      return;
    }
    scheduleTranslate();
  }

  async function translate(force = false) {
    const text = input.value.trim();
    if (!text) return;

    const mode = modeCommand(text);
    if (mode) {
      output.textContent = '';
      status.textContent = t('translator.ready');
      if (mode === studyLang()) return;
      // A teacher may have narrowed the site to one subject, and the typed
      // command is not a way round that.
      if (!subjectAllowed(mode)) { toast(t('mode.restricted')); return; }
      switchMode(mode, state, output, status);
      return;
    }

    if (GRADUATION.test(text)) {
      celebrate();
      output.textContent = '¡Olé!';
      engine.textContent = '';
      status.textContent = t('translator.done');
      return;
    }

    state.pending?.abort();
    const controller = new AbortController();
    state.pending = controller;

    clear(status);
    status.append(el('span', { class: 'spinner' }), ` ${t('translator.working')}`);

    try {
      const data = await postJson(
        '/api/translate',
        { text, from: state.from, study: studyLang() },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      paintOutput(data.translation || '', data.unsure);
      paintNotes(data.notes);
      paintParses(data.latin);
      engine.textContent = data.engine ? t('translator.engine', { engine: data.engine }) : '';

      // A last-resort translation says so, first among the notes and in the
      // loud style — it is a caveat about the sentence itself, not a remark
      // about one word in it.
      if (data.uncertain) {
        notes.prepend(el('p', { class: 'parses__alarm' }, t('translator.uncertain')));
      }
      status.textContent = force ? t('translator.done') : t('translator.ready');
    } catch (error) {
      if (controller.signal.aborted || error.name === 'AbortError') return;
      clear(status);
      status.append(el('span', { class: 'error' }, error.message));
    } finally {
      if (state.pending === controller) state.pending = null;
    }
  }

  /**
   * One pass, once typing pauses.
   *
   * There were two for a while: a quick one answered by the free engines and a
   * later one a model was allowed to answer. No model translates now, so there
   * is nothing to defer to and the second pass was pure waste.
   *
   * The wait is longer than it looks, and deliberately. Every pause is a
   * different prefix and so a different cache miss, and DeepL bills by the
   * character against a monthly allowance the whole class shares — so a beat
   * more patience here is a lesson's worth of headroom there.
   */
  const scheduleTranslate = debounce(() => translate(), 900);

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
    else { clear(output); clear(notes); clear(parses); engine.textContent = ''; status.textContent = t('translator.ready'); }
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
