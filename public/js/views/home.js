import { el, icon, ICONS, clear, debounce, postJson } from '../lib/dom.js';
import { t } from '../lib/i18n.js';

/**
 * The two sides of the translator. `--es` is the study language's marker
 * colour, kept under that name because the palette has one accent per side of
 * the pane rather than one per language.
 */
const LANGUAGES = () => ({
  la: {
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

export function renderHome(main) {
  // Three lines, each its own colour step, the way the Duolingo hero stacks.
  const titleLines = t('hero.title').split('|');

  const hero = el('section', { class: 'hero shell' },
    el('div', { class: 'hero__text' },
      el('h1', { class: 'hero__title' }, ...titleLines.map((line) => el('span', {}, line))),
      el('p', { class: 'hero__sub' }, t('hero.sub')),
      el('div', { class: 'hero__cta' },
        el('a', { class: 'btn btn--primary btn--lg', href: '/#interpres', 'data-link': '' }, t('hero.ctaTranslate')),
        el('a', { class: 'btn btn--lg', href: '/diccionario', 'data-link': '' }, t('hero.ctaDictionary')))),
    el('div', { class: 'hero__art' },
      el('img', {
        src: '/assets/art/colosseum.svg', alt: '', width: 520, height: 440, decoding: 'async',
      })));

  const translator = el('section', { class: 'translator shell', id: 'interpres' });
  buildTranslator(translator);

  const finder = buildFinder();

  const features = el('section', { class: 'features shell' },
    el('h2', { class: 'section__title' }, t('features.title')),
    el('div', { class: 'features__grid' },
      feature('/assets/art/helmet.svg', '/conjugacion', t('features.conjugation'), t('features.conjugationBody')),
      feature('/assets/art/column.svg', '/declinationes', t('features.declension'), t('features.declensionBody')),
      feature('/assets/art/scroll.svg', '/diccionario', t('features.dictionary'), t('features.dictionaryBody'))));

  main.append(hero, el('hr', { class: 'rule shell' }), translator, features, finder);
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

// ---------------------------------------------------------------------------

/**
 * A dialog over the page, closed by Escape, the backdrop or its own button.
 *
 * Both of the translator's extra panels use it, so the focus handling and the
 * three ways out are written once. It is a plain element rather than a
 * <dialog>, because the page has its own scrim and card styling already and a
 * modal dialog's backdrop cannot be themed alongside them.
 */
function openModal(title, body) {
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    document.documentElement.classList.remove('is-modal');
  };
  const onKey = (event) => { if (event.key === 'Escape') close(); };

  const closeButton = el('button', {
    class: 'modal__close',
    type: 'button',
    'aria-label': t('translator.detailsClose'),
    onclick: close,
  }, icon(ICONS.close, { size: 16 }));

  const card = el('div', {
    class: 'modal__card',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
    onclick: (event) => event.stopPropagation(),
  }, el('div', { class: 'modal__head' }, el('h2', {}, title), closeButton), body);

  const overlay = el('div', { class: 'modal', onclick: close }, card);

  document.body.appendChild(overlay);
  document.documentElement.classList.add('is-modal');
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => overlay.classList.add('is-open'));
  closeButton.focus();

  return close;
}

// ---------------------------------------------------------------------------

function buildTranslator(root) {
  const state = { from: 'en', to: 'la', pending: null, last: null };

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

  /**
   * The grammar is behind a button.
   *
   * Every Latin word of the translation, with its case, used to be printed
   * under the pane. It is the most interesting thing the site does and it was
   * in the way of the most common thing anyone wants, which is the sentence.
   * So it moved in here: out of sight for a reader who wants a translation, one
   * click away for a reader who wants to know why.
   */
  const details = el('button', { class: 'btn btn--sm pane__detail', type: 'button', hidden: true },
    icon(ICONS.info, { size: 13 }), t('translator.details'));

  /**
   * Shown only when a word came back that is not Latin.
   *
   * This used to be a strike-through over the sentence, which tells a student
   * their translation is wrong and offers them nothing to do about it. A word
   * the lexicon does not have is a gap, and the reader who hit it is the one
   * who can report it. See server/routes/report.js.
   */
  const report = el('button', { class: 'btn btn--sm pane__report', type: 'button', hidden: true },
    icon(ICONS.flag, { size: 13 }), t('translator.report'));

  /**
   * Ask a model, on purpose.
   *
   * Latin into English is parsed, and the parser is the whole answer: there is
   * no model underneath it and no word list either. This is how a reader gets a
   * second opinion, and it is a button rather than a fallback so that a parse
   * failure stays visible instead of being quietly answered by something else.
   */
  const retranslate = el('button', { class: 'btn btn--sm pane__model', type: 'button', hidden: true },
    icon(ICONS.swap, { size: 13 }), t('translator.retranslate'));

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
    el('div', { class: 'pane__actions' }, details, retranslate, report),
    el('div', { class: 'pane__foot' }, engine, el('span', {})));

  /**
   * A word the translator left in brackets.
   *
   * When there is no Latin for something, the sentence keeps the English word
   * in brackets rather than dropping it out of the middle — see the glossary in
   * server/latin-translate.js. That is the plainest "not Latin" signal there
   * is, and it is the one that carries no flag alongside it: the parser is
   * never asked about a bracketed token, so it reports nothing unknown.
   */
  const BRACKETED = /\[([^\]]+)\]/g;

  /**
   * Write the translation out, marking the words the engine gave up on.
   *
   * The marking is a colour and a dotted rule, not a strike: it says "this word
   * came through untouched", which is what tells the reader which words the
   * report button is about. Striking the sentence out said "this is wrong" and
   * left it there.
   *
   * textContent still reads back the whole sentence, so copying and the swap
   * button are unaffected.
   */
  function paintOutput(text, unsure) {
    clear(output);
    if (!text) return;

    const words = (unsure ?? []).filter(Boolean);
    const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // Bracketed words are marked too, and by the same rule: they are the words
    // the sentence is telling you it could not translate.
    const parts = [...escaped.map((word) => `\\b${word}\\b`), '\\[[^\\]]+\\]'];
    const pattern = new RegExp(`(${parts.join('|')})`, 'giu');

    // split() with a capture group alternates plain text and matches.
    for (const [index, piece] of text.split(pattern).entries()) {
      if (!piece) continue;
      output.appendChild(index % 2
        ? el('span', { class: 'unsure', title: t('translator.unsureWord') }, piece)
        : document.createTextNode(piece));
    }
  }

  /** The words the site could not turn into Latin, or English: a report is about these. */
  function troubleWords(data) {
    const words = new Set((data.unsure ?? []).filter(Boolean));
    for (const word of data.latin?.parses ?? []) {
      if (!word.readings?.length) words.add(word.word);
    }
    // Coming out of Latin: a word no dictionary had a meaning for. This is the
    // *itio* case — a real noun neither Whitaker's nor the course list holds.
    for (const word of data.words ?? []) {
      if (!word.known) words.add(word.word);
    }
    for (const [, word] of String(data.translation ?? '').matchAll(BRACKETED)) {
      words.add(word);
    }
    return [...words];
  }

  /**
   * The word-by-word breakdown, coming out of Latin.
   *
   * This used to *be* the translation — the pane showed "non — not · itio — ? ·
   * magnus — big (nom. sg.) · …" and left the reader to do the assembling. Every
   * piece of it was true and it was nearly useless to read. It is still true and
   * still here; it is simply no longer in the way of the sentence.
   */
  function wordRows(words) {
    const rows = el('div', {});
    for (const word of words) {
      rows.appendChild(el('div', { class: 'parses__row' },
        el('b', {}, word.word),
        el('span', {},
          el('i', { class: word.known ? '' : 'unsure' }, word.known ? word.gloss : t('translator.parseUnknown')),
          word.grammar ? el('span', { class: 'parses__grammar' }, word.grammar) : null)));
    }
    return rows;
  }

  /**
   * What the check found — and only that.
   *
   * The second reading is deliberately not shown. It exists to disagree: it is
   * the one that is more often wrong, and printing a wrong sentence next to the
   * right one invites the reader to weigh two things they have no way to weigh.
   * What they can use is the verdict.
   */
  function readingRows(reading) {
    const verdict = {
      agreed: 'translator.readingAgreed',
      partial: 'translator.readingPartly',
      differs: 'translator.readingDiffers',
      single: 'translator.readingSingle',
    }[reading.confidence] ?? 'translator.readingDiffers';

    return el('p', { class: 'detail__label' },
      `${t('translator.readingCheck')}, ${t(verdict)}`);
  }

  /** Everything the translator knows about the sentence it just produced. */
  function detailBody(data) {
    const body = el('div', { class: 'detail' });

    body.append(
      el('p', { class: 'detail__label' }, t('translator.detailsSource')),
      el('p', { class: 'detail__text' }, data.source),
      el('p', { class: 'detail__label' }, t('translator.detailsResult')),
      el('p', { class: 'detail__text' }, data.translation || ''),
    );

    if (data.engine) {
      body.appendChild(el('p', { class: 'detail__engine' }, t('translator.engine', { engine: data.engine })));
    }

    // The caveat about the sentence as a whole, in the loud style: it is a
    // remark about the translation, not about one word in it.
    if (data.uncertain) {
      const why = {
        wordByWord: 'translator.wordByWord',
        latin: 'translator.uncertainLatin',
        readingsDiffer: 'translator.readingsDiffer',
        readingsPartial: 'translator.readingsPartial',
      }[data.uncertainWhy] ?? 'translator.uncertain';
      body.appendChild(el('p', { class: 'parses__alarm' }, t(why)));
    }

    for (const note of data.latin?.notes ?? []) {
      body.appendChild(el('p', {
        class: { case: 'parses__fixed', untranslated: 'parses__alarm' }[note.kind] || 'parses__warn',
      }, note.kind === 'case' ? `${t('translator.caseFixed')}: ${note.from} → ${note.to}. ${note.why}` : note.why));
    }

    /**
     * Coming out of Latin: how the sentence was arrived at, and then the words
     * it was arrived at from. The check goes first because it is the thing that
     * qualifies the sentence above it.
     */
    if (data.reading) body.appendChild(readingRows(data.reading));

    if (data.words?.length) {
      body.appendChild(el('p', { class: 'parses__head' }, t('translator.wordList')));
      body.appendChild(wordRows(data.words));
    }

    if (data.latin?.parses?.length) {
      body.appendChild(el('p', { class: 'parses__head' }, t('translator.parseTitle')));
      body.appendChild(el('p', { class: 'parses__lead' }, t('translator.parseLead')));

      for (const word of data.latin.parses) {
        const best = word.readings?.[0];
        // Every reading of the form, not just the first. A Latin ending is
        // routinely ambiguous — *agricolae* is genitive, dative and nominative
        // plural at once — and showing one of the three would be telling the
        // reader something the word does not actually say.
        const grammar = (best?.parses ?? []).slice(0, 4).join(' · ');
        body.appendChild(el('div', { class: 'parses__row' },
          el('b', {}, word.word),
          best
            ? el('span', {},
              el('i', {}, best.headword),
              grammar ? el('span', { class: 'parses__grammar' }, grammar) : null)
            : el('span', { class: 'parses__warn' }, t('translator.parseUnknown'))));
      }
    }

    return body;
  }

  /**
   * The five things that can be wrong with a translation.
   *
   * A note box on its own gives a log nobody can sort, and it also asks the
   * reader to write a sentence before they can complain — which most will not
   * do. Picking one of these is a click.
   */
  const REASONS = [
    ['untranslated', 'translator.reasonUntranslated'],
    ['wrong-word', 'translator.reasonWrongWord'],
    ['wrong-grammar', 'translator.reasonWrongGrammar'],
    ['formatting', 'translator.reasonFormatting'],
    ['other', 'translator.reasonOther'],
  ];

  /** The report form: what went wrong, which words, and room to say more. */
  function reportBody(data, words) {
    const note = el('textarea', {
      class: 'detail__note',
      rows: 3,
      maxLength: 1000,
      spellcheck: false,
      'aria-label': t('translator.reportNote'),
    });

    const result = el('p', { class: 'detail__result' });
    const send = el('button', { class: 'btn btn--primary btn--sm', type: 'button' }, t('translator.reportSend'));

    // The first reason is pre-selected, so a reader who just wants to say "this
    // is wrong" can press send without choosing anything.
    let reason = words.length ? 'untranslated' : 'wrong-word';
    const reasons = el('div', { class: 'reasons', role: 'radiogroup', 'aria-label': t('translator.reportReason') },
      ...REASONS.map(([value, label]) => {
        const option = el('button', {
          class: `reasons__option${value === reason ? ' is-picked' : ''}`,
          type: 'button',
          role: 'radio',
          'aria-checked': String(value === reason),
          onclick: () => {
            reason = value;
            for (const other of reasons.children) {
              const picked = other === option;
              other.classList.toggle('is-picked', picked);
              other.setAttribute('aria-checked', String(picked));
            }
          },
        }, t(label));
        return option;
      }));

    send.addEventListener('click', async () => {
      send.disabled = true;
      try {
        await postJson('/api/report', {
          reason,
          source: data.source,
          translation: data.translation,
          from: data.from,
          words,
          note: note.value,
          /**
           * The working, not just the two sentences.
           *
           * "Wrong grammar" is rarely diagnosable from the input and the output
           * alone — what went wrong is usually one word the parser misread, and
           * that is in the breakdown. Sending it means a line in the log stands
           * on its own instead of having to be reproduced.
           */
          breakdown: (data.words ?? []).map(({ word, gloss, grammar }) => (
            `${word}, ${gloss}${grammar ? ` [${grammar}]` : ''}`
          )),
          check: data.reading
            ? `${data.reading.confidence}${data.reading.verdict ? ` (${data.reading.verdict})` : ''}`
              + `${data.reading.repaired ? ', repaired' : ''}`
            : '',
        });
        result.textContent = t('translator.reportSent');
        result.className = 'detail__result is-good';
      } catch {
        result.textContent = t('translator.reportFailed');
        result.className = 'detail__result is-bad';
        send.disabled = false;
      }
    });

    return el('div', { class: 'detail' },
      el('p', { class: 'detail__lead' }, t('translator.reportLead')),
      el('p', { class: 'detail__label' }, t('translator.reportReason')),
      reasons,
      // Only when there are any: a sentence can be wrong with every word of it
      // in perfectly good Latin.
      words.length ? el('p', { class: 'detail__label' }, t('translator.notLatin', { words: words.length })) : null,
      words.length ? el('p', { class: 'detail__words' }, ...words.map((word) => el('span', { class: 'unsure' }, word))) : null,
      el('p', { class: 'detail__label' }, t('translator.detailsSource')),
      el('p', { class: 'detail__text' }, data.source),
      el('p', { class: 'detail__label' }, t('translator.detailsResult')),
      el('p', { class: 'detail__text' }, data.translation || ''),
      el('p', { class: 'detail__label' }, t('translator.reportNote')),
      note,
      el('div', { class: 'detail__send' }, send, result));
  }

  retranslate.addEventListener('click', async () => {
    if (!state.last || retranslate.disabled) return;
    retranslate.disabled = true;
    const label = retranslate.lastChild;
    label.textContent = t('translator.retranslating');
    try {
      const data = await postJson('/api/translate', {
        text: state.last.source, from: state.last.from, model: true,
      });
      paintOutput(data.translation || '', data.unsure);
      engine.textContent = t('translator.retranslated');
      state.last = { ...data, source: state.last.source, from: state.last.from };
      details.hidden = !(data.words?.length || data.reading);
      report.hidden = !data.translation;
    } catch (error) {
      clear(status);
      status.append(el('span', { class: 'error' }, error.message || t('translator.retranslateFailed')));
    } finally {
      label.textContent = t('translator.retranslate');
      retranslate.disabled = false;
    }
  });

  details.addEventListener('click', () => {
    if (!state.last) return;
    openModal(t('translator.detailsTitle'), detailBody(state.last));
  });

  report.addEventListener('click', () => {
    if (!state.last) return;
    openModal(t('translator.reportTitle'), reportBody(state.last, troubleWords(state.last)));
  });

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

  /** Nothing to explain and nothing to report until something comes back. */
  function resetActions() {
    state.last = null;
    details.hidden = true;
    report.hidden = true;
    retranslate.hidden = true;
  }

  function sync() {
    counter.textContent = `${input.value.length} / ${MAX_CHARS}`;
    if (!input.value.trim()) {
      clear(output);
      resetActions();
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
      const data = await postJson(
        '/api/translate',
        { text, from: state.from },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;

      paintOutput(data.translation || '', data.unsure);
      engine.textContent = data.engine ? t('translator.engine', { engine: data.engine }) : '';

      state.last = { ...data, source: text, from: state.from };
      details.hidden = !(data.latin?.parses?.length || data.latin?.notes?.length
        || data.words?.length || data.reading || data.uncertain);
      /**
       * Offered on every translation, not only on one with a word left in
       * brackets. Now that the sentence routes reach for a synonym rather than
       * giving up on a word, an untranslated word is the rarest of the things
       * that can be wrong with a translation, and it was the only one that put
       * this button on screen.
       */
      report.hidden = !data.translation;
      // Only out of Latin: into Latin there is no second engine to ask.
      retranslate.hidden = state.from !== 'la';

      status.textContent = force ? t('translator.done') : t('translator.ready');
    } catch (error) {
      if (controller.signal.aborted || error.name === 'AbortError') return;
      resetActions();
      /**
       * A refused parse is a failure, and the model is the way past it.
       *
       * Latin into English has one engine and nothing under it, so this is the
       * only thing on screen when the parser cannot read a sentence. Hiding the
       * button here would leave the reader with an error and no next step.
       */
      if (state.from === 'la') {
        state.last = { source: text, from: state.from };
        retranslate.hidden = false;
      }
      clear(status);
      status.append(el('span', { class: 'error' }, error.message));
    } finally {
      if (state.pending === controller) state.pending = null;
    }
  }

  /**
   * One pass, once typing pauses.
   *
   * The wait is longer than it looks, and deliberately. Every pause is a
   * different prefix and so a different cache miss, and the morphology behind
   * the rules translator is fetched over the network — so a beat more patience
   * here is a lesson's worth of headroom there.
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
    resetActions();

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
