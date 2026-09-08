/**
 * The stages page — Latin only.
 *
 * The Cambridge Latin Course teaches in numbered stages, and a student revises
 * by stage. Type a number and the whole list comes up.
 *
 * The lists are hand-compiled — the course publishes no vocabulary data — and
 * every word in them is checked against Whitaker's Words. What that provenance
 * is worth is recorded in data/stages-la.js, where somebody maintaining the
 * lists will find it, rather than on the page, where it sat above the answer a
 * reader came for.
 */

import { el, icon, ICONS, clear, fold } from '../lib/dom.js';
import { startWallpaper, wallpaperLayer } from '../lib/wallpaper.js';
import {
  allWords, BOOKS, bookOf, COURSE, findStage, STAGE_NUMBERS, STAGES,
} from '../data/stages-la.js';
import { lang, t } from '../lib/i18n.js';

export function renderStages(main) {
  const results = el('div', {});
  const wallpaper = wallpaperLayer({ band: true });

  const input = el('input', {
    type: 'search',
    placeholder: t('stages.search'),
    autocomplete: 'off',
    spellcheck: false,
    'aria-label': t('stages.searchLabel'),
  });

  const form = el('form', { class: 'search', style: { maxWidth: '420px' } },
    el('div', { class: 'search__field' },
      icon(ICONS.search, { size: 15 }),
      input,
      el('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, t('stages.button'))));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    show(input.value);
  });

  /**
   * Every stage as a chip, grouped by book — a reader thinks in books before
   * stages, and 28 numbers in one line says nothing about where Book II starts.
   */
  const index = el('div', { class: 'stageindex' },
    ...BOOKS.map((book) => el('div', { class: 'stageindex__book' },
      el('span', { class: 'stageindex__label' }, book.label),
      el('div', { class: 'stageindex__chips' },
        ...STAGE_NUMBERS.filter((number) => number >= book.from && number <= book.to)
          .map((number) => el('button', {
            type: 'button',
            title: STAGES[number].title,
            onclick: () => { input.value = String(number); show(number); },
          }, String(number)))))));

  main.append(wallpaper, el('div', { class: 'page shell' },
    el('div', { class: 'page__head' },
      el('p', { class: 'eyebrow' }, t('stages.eyebrow')),
      el('h1', {}, t('stages.title')),
      el('p', {}, t('stages.lead'))),
    form,
    index,
    el('div', { style: { marginTop: '26px' } }, results),
  ));

  function show(raw) {
    const stage = findStage(raw);
    clear(results);

    if (!stage) {
      // Not a stage number — try it as a word, since a reader who half
      // remembers "canis" wants to know which stage it came from.
      const needle = fold(String(raw ?? '').trim());
      const matches = needle.length > 1
        ? allWords().filter((word) => fold(word.latin).startsWith(needle) || fold(word.english).includes(needle))
        : [];

      if (matches.length) {
        results.appendChild(wordTable(matches.slice(0, 40), true));
        return;
      }

      results.appendChild(el('div', { class: 'empty' },
        el('h3', {}, t('stages.notFound')),
        el('p', {}, `${STAGE_NUMBERS[0]}–${STAGE_NUMBERS.at(-1)} · ${COURSE.name}, ${COURSE.book}`)));
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('s', String(stage.number));
    history.replaceState({}, '', url.pathname + url.search);

    results.append(
      el('div', { class: 'verbcard' },
        el('div', {},
          el('h2', {}, `${stage.number}. ${stage.title}`),
          el('p', { class: 'verbcard__gloss' }, stage.setting),
          el('div', { class: 'verbcard__tags' },
            stage.book ? el('span', { class: 'chip chip--es' }, stage.book.label) : null,
            el('span', { class: 'chip' }, t('stages.wordCount', { n: stage.words.length }))))),
      wordTable(stage.words.map(([latin, english]) => ({ latin, english })), false),
    );
  }

  const requested = new URLSearchParams(window.location.search).get('s');
  if (requested) input.value = requested;
  show(requested || STAGE_NUMBERS[0]);

  const stopWallpaper = startWallpaper(wallpaper, results);
  return () => stopWallpaper();
}

/** Each Latin word links to the dictionary, which is where its grammar is. */
function wordTable(words, showStage) {
  const head = el('tr', {},
    el('th', { scope: 'col' }, t('stages.latinWord')),
    el('th', { scope: 'col' }, t('stages.englishWord')),
    showStage ? el('th', { scope: 'col' }, t('stages.fromStage')) : null);

  const body = el('tbody', {}, ...words.map((word) => el('tr', {},
    el('th', { scope: 'row' },
      el('a', { href: `/diccionario?q=${encodeURIComponent(word.latin)}`, 'data-link': '' }, word.latin)),
    el('td', {}, word.english),
    showStage ? el('td', {}, `${word.book ? `${word.book.label} · ` : ''}${word.stage}`) : null)));

  return el('div', { class: 'tablewrap' },
    el('table', { class: 'conj', style: { minWidth: '0' } }, el('thead', {}, head), body));
}
