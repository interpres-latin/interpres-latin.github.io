/**
 * The declensions page — Latin only.
 *
 * Latin's five noun declensions have no counterpart in the modern languages,
 * which is why this page exists there and nowhere else. It takes a noun the way
 * a dictionary quotes it — nominative and genitive — because the genitive is
 * what says which declension it is and what its stem will be. Give it only the
 * nominative and there is genuinely no answer: *rex* alone could belong to any
 * of several patterns, and the page says so rather than guessing.
 */

import { el, icon, ICONS, clear, debounce, getJson } from '../lib/dom.js';
import { startWallpaper, wallpaperLayer } from '../lib/wallpaper.js';
import {
  CASE_ORDER, declineAdjective, declineNoun, parseParts,
} from '../lib/decliner-la.js';
import { lang, t } from '../lib/i18n.js';

/** One model noun per declension, so the page opens on something. */
const MODELS = [
  { key: '1st', parts: 'puella, puellae', gender: 'feminine', gloss: 'girl' },
  { key: '2nd', parts: 'dominus, domini', gender: 'masculine', gloss: 'master' },
  { key: '3rd', parts: 'rex, regis', gender: 'masculine', gloss: 'king' },
  { key: '4th', parts: 'manus, manus', gender: 'feminine', gloss: 'hand' },
  { key: '5th', parts: 'dies, diei', gender: 'masculine', gloss: 'day' },
];

const ADJECTIVE_MODEL = { key: 'adj', parts: 'bonus, bona, bonum', gloss: 'good' };

const SAMPLES = ['puella, puellae', 'bellum, belli', 'urbs, urbis', 'mare, maris', 'bonus, bona, bonum', 'fortis, forte'];

export function renderDeclensions(main) {
  const state = { request: 0 };

  const results = el('div', {});
  const wallpaper = wallpaperLayer({ band: true });

  const input = el('input', {
    type: 'search',
    placeholder: t('declension.search'),
    autocomplete: 'off',
    spellcheck: false,
    'aria-label': t('declension.searchLabel'),
  });

  const form = el('form', { class: 'search', style: { maxWidth: '620px' } },
    el('div', { class: 'search__field' },
      icon(ICONS.search, { size: 15 }),
      input,
      el('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, t('declension.button'))));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    show(input.value);
  });

  const tabs = el('div', { class: 'tabs', role: 'tablist' });
  const tabButtons = [...MODELS, ADJECTIVE_MODEL].map((model) => {
    const label = model.key === 'adj'
      ? t('declension.adjectives')
      : t('declension.tab', { n: model.key });
    const button = el('button', {
      type: 'button',
      role: 'tab',
      onclick: () => { input.value = model.parts; show(model.parts, model.gender); },
    }, label);
    tabs.appendChild(button);
    return [model.parts, button];
  });

  main.append(wallpaper, el('div', { class: 'page shell' },
    el('div', { class: 'page__head' },
      el('p', { class: 'eyebrow' }, t('declension.eyebrow')),
      el('h1', {}, t('declension.title')),
      el('p', {}, t('declension.lead'))),
    el('div', { class: 'toolbar' }, tabs, el('div', { class: 'search' }, form)),
    el('div', { class: 'wordlist', style: { marginTop: '4px' } },
      el('span', {}, t('finder.tryWith')),
      ...SAMPLES.map((sample) =>
        el('button', { type: 'button', onclick: () => { input.value = sample; show(sample); } }, sample))),
    el('div', { style: { marginTop: '30px' } }, results),
  ));

  // --- rendering -----------------------------------------------------------

  /**
   * Nouns and adjectives are quoted alike — *rex, regis* against *ingens,
   * ingentis* — so where two parts could be either, the dictionary is asked.
   */
  async function show(raw, knownGender = '') {
    const parts = parseParts(raw);
    if (parts.length < 2) {
      clear(results);
      results.appendChild(el('div', { class: 'empty' },
        el('h3', {}, t('declension.notANoun')),
        el('p', {}, t('declension.needsGenitive'))));
      return;
    }

    for (const [parts_, button] of tabButtons) {
      button.classList.toggle('is-active', parseParts(parts_).join() === parts.join());
    }

    const url = new URL(window.location.href);
    url.searchParams.set('n', parts.join(', '));
    history.replaceState({}, '', url.pathname + url.search);

    let gender = knownGender;
    let kind = parts.length >= 3 ? 'adjective' : '';

    if (!kind || !gender) {
      const ticket = (state.request += 1);
      const data = await getJson(`/api/dictionary?word=${encodeURIComponent(parts[0])}&study=la`)
        .catch(() => null);
      if (ticket !== state.request) return;
      const senses = data?.entries?.[0]?.senses ?? [];
      const noun = senses.find((sense) => sense.category === 'noun');
      const adjective = senses.find((sense) => sense.category === 'adjective');
      if (!kind) kind = noun ? 'noun' : adjective ? 'adjective' : '';
      if (!gender && noun) gender = noun.gender || '';
    }

    const asNoun = () => { const r = declineNoun(parts[0], parts[1], gender); return r.ok ? r : null; };
    const asAdjective = () => { const r = declineAdjective(parts); return r.ok ? r : null; };
    const order = kind === 'adjective' ? [asAdjective, asNoun] : [asNoun, asAdjective];
    const result = order.reduce((carry, attempt) => carry ?? attempt(), null);

    clear(results);
    if (!result) {
      results.appendChild(el('div', { class: 'empty' },
        el('h3', {}, t('declension.notANoun')),
        el('p', {}, t('declension.needsGenitive'))));
      return;
    }

    results.appendChild(result.family ? adjectiveCard(result, parts) : nounCard(result, gender));
  }

  const requested = new URLSearchParams(window.location.search).get('n');
  show(requested || MODELS[0].parts, requested ? '' : MODELS[0].gender);

  const stopWallpaper = startWallpaper(wallpaper, results);
  return () => stopWallpaper();
}

// ---------------------------------------------------------------------------

const caseLabel = (name) => t(`declension.${name}`);

function nounCard(result, gender) {
  const tags = [
    el('span', { class: 'chip' }, t('declension.tab', { n: ordinal(result.declension) })),
  ];
  if (gender) tags.push(el('span', { class: 'chip chip--es' }, t(`declension.${gender}`)));
  if (result.iStem) tags.push(el('span', { class: 'chip chip--warn' }, t('declension.iStem')));
  tags.push(el('span', { class: 'chip' }, `${t('declension.stem')} ${result.stem}-`));

  return el('div', {},
    el('div', { class: 'verbcard' },
      el('div', {},
        el('h2', {}, `${result.lemma}, ${result.genitive}`),
        el('div', { class: 'verbcard__tags' }, tags))),
    el('div', { class: 'conj-tables' },
      el('section', { class: 'mood' },
        el('h2', { class: 'mood__title' }, t('declension.cases')),
        caseTable(result.table))));
}

function adjectiveCard(result, parts) {
  const tags = [el('span', { class: 'chip' }, t('declension.adjectives'))];
  tags.push(el('span', { class: 'chip chip--es' }, result.family));
  if (result.terminations) {
    tags.push(el('span', { class: 'chip' }, `${result.terminations}-termination`));
  }
  tags.push(el('span', { class: 'chip' }, `${t('declension.stem')} ${result.stem}-`));

  return el('div', {},
    el('div', { class: 'verbcard' },
      el('div', {},
        el('h2', {}, parts.join(', ')),
        el('div', { class: 'verbcard__tags' }, tags))),
    el('div', { class: 'conj-tables' },
      ...['masculine', 'feminine', 'neuter'].map((gender) =>
        el('section', { class: 'mood' },
          el('h2', { class: 'mood__title' }, t(`declension.${gender}`)),
          caseTable(result.table[gender])))));
}

/** Cases down, singular and plural across — the way a Latin table is set out. */
function caseTable(table) {
  const head = el('tr', {},
    el('th', { scope: 'col' }, t('declension.cases')),
    el('th', { scope: 'col' }, t('declension.singular')),
    el('th', { scope: 'col' }, t('declension.plural')));

  const body = el('tbody', {}, ...CASE_ORDER.map((name) => el('tr', {},
    el('th', { scope: 'row' }, caseLabel(name)),
    el('td', { class: table.singular[name] ? '' : 'is-empty' }, table.singular[name] || '—'),
    el('td', { class: table.plural[name] ? '' : 'is-empty' }, table.plural[name] || '—'))));

  return el('div', { class: 'tablewrap', style: { marginBottom: '14px' } },
    el('table', { class: 'conj', style: { minWidth: '0' } }, el('thead', {}, head), body));
}

const ordinal = (n) => ({ 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' }[n] ?? String(n));
