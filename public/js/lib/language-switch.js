/**
 * The language switch in the header: ES | EN on the Spanish side of the site,
 * FR | EN on the French one.
 *
 * The study language is always open. English is behind a passcode, and a wrong
 * one seals the whole page with tape until the right one is entered — the lock
 * survives a reload, so closing the tab is not a way around it.
 *
 * Latin is the exception: it reads LA | EN and neither side is gated. English
 * is the working language of a Latin lesson rather than a way round it, so
 * there is nothing there to protect.
 *
 * The left-hand button always opens a menu: the subjects the site can be about,
 * and — below them — the choice of reading the interface in that language
 * rather than in English. Both jobs are in one place because the button cannot
 * do two different things on the same click and stay predictable.
 *
 * A teacher can narrow the list to Spanish alone; see lib/restriction.js. When
 * only one subject is on offer the menu still opens, since the interface choice
 * lives there too.
 */

import { el, clear } from './dom.js';
import { checkPasscode, isLocked, lang, languageOptions, passcodeRequired, setLang, setLocked, t } from './i18n.js';
import { setStudyLang, studyLang, STUDY_LANGUAGES } from './study.js';
import { allowedSubjects, onRestrictionChange } from './restriction.js';
import { sealWithTape } from './tape.js';

/**
 * The subjects the site can be about, in their own names.
 *
 * Reached by clicking the study-language button when it is already the active
 * one — the same "click the thing that is already on" gesture the declension
 * tabs use for their genders. Typing `mode: french` still works and always
 * will; this is the discoverable way to the same place, which the typed
 * command deliberately is not.
 */
const SUBJECTS = { es: 'Español', fr: 'Français', la: 'Latina' };

let unseal = null;

/** Put the page back under tape if the visitor left it locked. */
export function restoreLock() {
  if (isLocked()) lockPage();
}

function lockPage({ wrongAgain = false } = {}) {
  if (unseal) return;
  setLocked(true);

  unseal = sealWithTape(document.body, {
    title: t('tape.lockedTitle'),
    detail: wrongAgain ? t('tape.wrongAgain') : t('tape.lockedDetail'),
    note: t('tape.lockedNote'),
    prompt: {
      placeholder: t('tape.passcodePlaceholder'),
      submit: t('tape.unlock'),
      wrong: t('tape.wrongAgain'),
      onSubmit: (value) => {
        if (!checkPasscode(value)) return false;
        setLocked(false);
        unseal = null;
        setLang('en');
        return true;
      },
    },
  });
}

/** Small inline dialog asking for the code before switching to English. */
function askForPasscode(anchor) {
  anchor.querySelector('.passgate')?.remove();

  const field = el('input', {
    type: 'text',
    inputMode: 'numeric',
    autocomplete: 'off',
    placeholder: t('tape.passcodePlaceholder'),
    'aria-label': t('tape.passcodePlaceholder'),
  });

  const form = el('form', { class: 'passgate' },
    el('p', { class: 'passgate__title' }, t('passcode.title')),
    el('p', { class: 'passgate__detail' }, t('passcode.detail')),
    el('div', { class: 'passgate__row' },
      field,
      el('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, t('tape.unlock'))),
    el('button', { class: 'passgate__cancel', type: 'button', onclick: () => close() }, t('passcode.cancel')));

  // Dismiss on a click anywhere else, or on Escape.
  const close = () => {
    form.remove();
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey);
  };
  const onOutside = (event) => { if (!form.contains(event.target)) close(); };
  const onKey = (event) => { if (event.key === 'Escape') close(); };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = field.value;
    close();
    if (checkPasscode(value)) setLang('en');
    else lockPage();
  });

  anchor.appendChild(form);
  field.focus();

  // Deferred so the click that opened the gate does not immediately shut it.
  setTimeout(() => {
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey);
  }, 0);
}

export function mountLanguageSwitch(container) {
  let buttons = new Map();

  function paint() {
    for (const [code, button] of buttons) {
      button.classList.toggle('is-active', code === lang());
      button.setAttribute('aria-pressed', String(code === lang()));
    }
  }

  const closeSubjects = () => {
    for (const menu of container.querySelectorAll('.tabmenu__list')) menu.remove();
  };

  /**
   * The subjects on offer, and the interface choice.
   *
   * Both live here because the button opens the menu on every click. Making it
   * switch the interface on one click and open a menu on the next meant that
   * pressing LA in Latin mode turned the interface Latin instead of offering
   * the languages, which is not what anyone expected of it.
   */
  function openSubjects(holder) {
    if (holder.querySelector('.tabmenu__list')) { closeSubjects(); return; }
    closeSubjects();

    const study = studyLang();
    const subjects = allowedSubjects();

    const list = el('div', { class: 'tabmenu__list tabmenu__list--right', role: 'menu' },
      el('p', { class: 'tabmenu__title' }, t('nav.subjectLabel')),
      ...subjects.map((code) => {
        const button = el('button', {
          type: 'button',
          role: 'menuitem',
          onclick: () => {
            closeSubjects();
            if (code === study) return;
            setStudyLang(code);
          },
        }, SUBJECTS[code], el('em', {}, code.toUpperCase()));
        if (code === study) button.classList.add('is-active');
        return button;
      }));

    // Reading the site in the study language, which is what the button used to
    // do on its own.
    list.append(
      el('p', { class: 'tabmenu__title tabmenu__title--rule' }, t('nav.langLabel')),
      (() => {
        const button = el('button', {
          type: 'button',
          role: 'menuitem',
          onclick: () => {
            closeSubjects();
            if (lang() === study) return;
            if (!passcodeRequired()) { setLang(study); return; }
            setLang(study);
          },
        }, SUBJECTS[study], el('em', {}, study.toUpperCase()));
        if (lang() === study) button.classList.add('is-active');
        return button;
      })(),
    );

    holder.appendChild(list);
  }

  /** Rebuilt rather than repainted when the study language changes: ES becomes FR. */
  function build() {
    buttons = new Map();
    clear(container);
    container.setAttribute('aria-label', t('nav.langLabel'));

    const [study] = languageOptions();
    for (const code of languageOptions()) {
      const holder = code === study ? el('div', { class: 'tabmenu' }) : null;
      const button = el('button', {
        class: 'langswitch__option',
        type: 'button',
        title: code === study ? t('nav.langLabel') : null,
        onclick: () => {
          // The study button always opens the menu; the English one switches
          // the interface, behind the passcode where there is one.
          if (code === study) { openSubjects(holder); return; }
          if (lang() === code) return;
          if (!passcodeRequired()) { setLang(code); return; }
          askForPasscode(container);
        },
      }, code.toUpperCase());

      buttons.set(code, button);
      if (holder) { holder.appendChild(button); container.appendChild(holder); }
      else container.appendChild(button);
    }

    paint();
  }

  const onOutside = (event) => {
    if (!event.target.closest('.langswitch')) closeSubjects();
  };
  document.addEventListener('click', onOutside);

  build();
  window.addEventListener('langchange', paint);
  // A teacher narrowing the subjects has to reach a page that is already open.
  const stopWatching = onRestrictionChange(build);
  window.addEventListener('beforeunload', stopWatching);

  // Deliberately *not* wired to studychange. The interface language settles
  // after the subject does, and a listener here would run first and rebuild
  // the switch against the old one — leaving LA and EN on screen with neither
  // marked, because the language it was comparing them to was still ES. The
  // router calls this once the language has caught up. See app.js.
  return build;
}
