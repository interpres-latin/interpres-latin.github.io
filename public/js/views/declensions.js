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
import { resolveLatinWord } from '../lib/latin-lookup.js';
import { lang, t } from '../lib/i18n.js';

/**
 * One model per declension.
 *
 * The second and third have `variants`, because a neuter of either declines
 * differently enough to need its own table — nominative, accusative and
 * vocative fall together, and the nominative plural is -a.
 *
 * **Those two open their menu on any click**, and never show a paradigm
 * directly. The rule used to be "click the tab you are already on", which meant
 * the first click quietly picked the masculine for you and only a second one
 * admitted there had been a choice — so a reader after *bellum* got *dominus*
 * and no reason to think anything else existed. A tab that holds two paradigms
 * asks which; the caret beside it says so before the click.
 */
const MODELS = [
  { key: '1st', parts: 'puella, puellae', gender: 'feminine', gloss: 'girl' },
  {
    key: '2nd',
    parts: 'dominus, domini',
    gender: 'masculine',
    gloss: 'master',
    variants: [
      { label: 'gendered', parts: 'dominus, domini', gender: 'masculine' },
      { label: 'neuter', parts: 'bellum, belli', gender: 'neuter' },
    ],
  },
  {
    key: '3rd',
    parts: 'rex, regis',
    gender: 'masculine',
    gloss: 'king',
    variants: [
      { label: 'gendered', parts: 'rex, regis', gender: 'masculine' },
      { label: 'neuter', parts: 'nomen, nominis', gender: 'neuter' },
    ],
  },
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
  const tabButtons = [];

  for (const model of [...MODELS, ADJECTIVE_MODEL]) {
    const label = model.key === 'adj'
      ? t('declension.adjectives')
      : t('declension.tab', { n: model.key });

    const holder = el('div', { class: 'tabmenu' });
    const button = el('button', {
      type: 'button',
      role: 'tab',
      onclick: () => {
        // A tab with two paradigms behind it always asks which; only a tab with
        // one answer goes straight to it.
        if (model.variants) {
          openVariants(holder, model);
          return;
        }
        closeMenus();
        input.value = model.parts;
        show(model.parts, model.gender);
      },
    }, label, model.variants
      ? el('span', { class: 'tabmenu__caret' }, icon(ICONS.caret, { size: 12, width: 2.6 }))
      : null);

    holder.appendChild(button);
    tabs.appendChild(holder);
    tabButtons.push([model.parts, button, model]);
  }

  function closeMenus() {
    for (const menu of tabs.querySelectorAll('.tabmenu__list')) menu.remove();
  }

  function openVariants(holder, model) {
    if (holder.querySelector('.tabmenu__list')) { closeMenus(); return; }
    closeMenus();

    const list = el('div', { class: 'tabmenu__list', role: 'menu' },
      el('p', { class: 'tabmenu__title' }, t('declension.pickGender')),
      ...model.variants.map((variant) => el('button', {
        type: 'button',
        role: 'menuitem',
        onclick: () => {
          closeMenus();
          input.value = variant.parts;
          show(variant.parts, variant.gender);
        },
      }, variant.label === 'neuter' ? t('declension.neuter') : t('declension.gendered'),
      el('em', {}, variant.parts))));

    holder.appendChild(list);
  }

  const onOutsideTab = (event) => {
    if (!event.target.closest('.tabmenu')) closeMenus();
  };
  document.addEventListener('click', onOutsideTab);

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
    const ticket = (state.request += 1);
    // The dictionary fills in a missing genitive and refuses a wrong one —
    // *puer, pueris* is not a word, and declining it would produce a whole
    // table of forms that do not exist. See lib/latin-lookup.js.
    const resolved = await resolveLatinWord(raw);
    if (ticket !== state.request) return;

    if (!resolved.ok) {
      clear(results);
      results.appendChild(el('div', { class: 'empty' },
        el('h3', {}, t('declension.notANoun')),
        el('p', {}, resolved.error === 'wrong-genitive'
          ? t('declension.wrongGenitive', { lemma: resolved.lemma, expected: resolved.expected })
          : resolved.error === 'unknown'
            ? t('declension.unknown')
            : t('declension.needsGenitive'))));
      return;
    }

    const { parts } = resolved;
    const gender = knownGender || resolved.gender || '';

    for (const [parts_, button, model] of tabButtons) {
      const own = [parts_, ...(model.variants ?? []).map((variant) => variant.parts)];
      button.classList.toggle('is-active', own.some((candidate) => parseParts(candidate).join() === parts.join()));
    }

    const url = new URL(window.location.href);
    url.searchParams.set('n', parts.join(', '));
    history.replaceState({}, '', url.pathname + url.search);

    const asNoun = () => { const r = declineNoun(parts[0], parts[1], gender); return r.ok ? r : null; };
    const asAdjective = () => { const r = declineAdjective(parts); return r.ok ? r : null; };
    const order = resolved.kind === 'adjective' ? [asAdjective, asNoun] : [asNoun, asAdjective];
    const result = order.reduce((carry, attempt) => carry ?? attempt(), null);

    clear(results);
    if (!result) {
      results.appendChild(el('div', { class: 'empty' },
        el('h3', {}, t('declension.notANoun')),
        el('p', {}, t('declension.needsGenitive'))));
      return;
    }

    // Say so when a part was supplied rather than typed, so nobody is left
    // wondering where the second word came from — and say which part, since
    // giving the genitive alone fills in the nominative, not the other way
    // round.
    if (resolved.completed) {
      results.appendChild(el('p', { class: 'notice' }, t(
        resolved.completedFrom === 'genitive' ? 'declension.completedNominative' : 'declension.completed',
        { parts: parts.join(', ') },
      )));
    }

    results.appendChild(result.family ? adjectiveCard(result, parts) : nounCard(result, gender));
  }

  const requested = new URLSearchParams(window.location.search).get('n');
  show(requested || MODELS[0].parts, requested ? '' : MODELS[0].gender);

  const stopWallpaper = startWallpaper(wallpaper, results);
  return () => {
    document.removeEventListener('click', onOutsideTab);
    stopWallpaper();
  };
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
    el('td', { class: table.singular[name] ? '' : 'is-empty' }, table.singular[name] || ','),
    el('td', { class: table.plural[name] ? '' : 'is-empty' }, table.plural[name] || ','))));

  return el('div', { class: 'tablewrap', style: { marginBottom: '14px' } },
    el('table', { class: 'conj', style: { minWidth: '0' } }, el('thead', {}, head), body));
}

const ordinal = (n) => ({ 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' }[n] ?? String(n));
