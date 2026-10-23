/**
 * The Stages page (/stadia): every stage of the Cambridge Latin Course,
 * grouped by book. Each opens the dictionary with that stage's words beside
 * it (/diccionario?s=N).
 */

import { el } from '../lib/dom.js';
import { BOOKS, STAGE_NUMBERS, STAGES } from '../data/stages-la.js';
import { t } from '../lib/i18n.js';

export function renderStages(main) {
  document.title = 'Stages | Interpres';
  main.append(el('div', { class: 'page shell' },
    el('div', { class: 'page__head' },
      el('h1', {}, 'stages'),
      el('p', {}, t('stages.title'))),
    ...BOOKS.map((book) => el('section', { class: 'stagebook' },
      el('h2', { class: 'mood__title' }, book.label),
      el('div', { class: 'stagegrid' },
        ...STAGE_NUMBERS.filter((number) => number >= book.from && number <= book.to)
          .map((number) => {
            const stage = STAGES[number];
            return el('a', { class: 'stagetile', href: `/diccionario?s=${number}`, 'data-link': '' },
              el('span', { class: 'stagetile__num' }, String(number)),
              el('div', {},
                el('h3', {}, stage.title),
                el('p', {}, stage.setting),
                el('span', { class: 'stagetile__count' }, t('stages.wordCount', { n: stage.words.length }))));
          }))))));
}
