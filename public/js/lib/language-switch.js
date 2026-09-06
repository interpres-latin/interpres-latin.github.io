/**
 * The language switch in the header: ES | EN on the Spanish side of the site,
 * FR | EN on the French one.
 *
 * The study language is always open. English is behind a passcode, and a wrong
 * one seals the whole page with tape until the right one is entered — the lock
 * survives a reload, so closing the tab is not a way around it.
 */

import { el, clear } from './dom.js';
import { checkPasscode, isLocked, lang, languageOptions, setLang, setLocked, t } from './i18n.js';
import { sealWithTape } from './tape.js';

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

  /** Rebuilt rather than repainted when the study language changes: ES becomes FR. */
  function build() {
    buttons = new Map();
    clear(container);
    container.setAttribute('aria-label', t('nav.langLabel'));

    const [study] = languageOptions();
    for (const code of languageOptions()) {
      const button = el('button', {
        class: 'langswitch__option',
        type: 'button',
        onclick: () => {
          if (lang() === code) return;
          if (code === study) { setLang(study); return; }
          askForPasscode(container);
        },
      }, code.toUpperCase());
      buttons.set(code, button);
      container.appendChild(button);
    }

    paint();
  }

  build();
  window.addEventListener('langchange', paint);
  window.addEventListener('studychange', build);
  return paint;
}
