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
 * The left-hand button does double duty. Click it when it is not the active
 * language and it switches the interface; click it when it already is, and it
 * offers the other subjects the site can be about.
 */

import { el, clear } from './dom.js';
import { checkPasscode, isLocked, lang, languageOptions, passcodeRequired, setLang, setLocked, t } from './i18n.js';
import { setStudyLang, studyLang, STUDY_LANGUAGES } from './study.js';
import { sealWithTape } from './tape.js';
import { toast } from './toast.js';

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

  /** The other subjects the site can be about. */
  function openSubjects(holder) {
    if (holder.querySelector('.tabmenu__list')) { closeSubjects(); return; }
    closeSubjects();

    holder.appendChild(el('div', { class: 'tabmenu__list tabmenu__list--right', role: 'menu' },
      el('p', { class: 'tabmenu__title' }, t('nav.langLabel')),
      ...STUDY_LANGUAGES.map((code) => {
        const button = el('button', {
          type: 'button',
          role: 'menuitem',
          onclick: () => {
            closeSubjects();
            if (code === studyLang()) return;
            setStudyLang(code);
            // The view is rebuilt from under us, so the notice has to outlive
            // it — and by now t() is answering in the new language.
            toast(`${t('mode.entered')} · ${t('mode.enteredNote')}`);
          },
        }, SUBJECTS[code], el('em', {}, code.toUpperCase()));
        if (code === studyLang()) button.classList.add('is-active');
        return button;
      })));
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
          // The study button offers the other subjects once it is already on.
          if (code === study && lang() === code) { openSubjects(holder); return; }
          if (lang() === code) return;
          if (code === study || !passcodeRequired()) { setLang(code); return; }
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
  window.addEventListener('studychange', build);
  return paint;
}
