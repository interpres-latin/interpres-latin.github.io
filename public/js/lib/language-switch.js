/**
 * The language switch in the header: LA | EN.
 *
 * This is the language of the *chrome* only. The subject is Latin and does not
 * move, so there is nothing here to choose but whether to read the interface in
 * Latin or in English.
 *
 * Neither side is gated. English is the working language of a Latin lesson
 * rather than a way round it, so there is nothing to protect.
 */

import { el, clear } from './dom.js';
import { lang, languageOptions, setLang, t } from './i18n.js';

export function mountLanguageSwitch(container) {
  const buttons = new Map();

  function paint() {
    for (const [code, button] of buttons) {
      button.classList.toggle('is-active', code === lang());
      button.setAttribute('aria-pressed', String(code === lang()));
    }
  }

  clear(container);
  container.setAttribute('aria-label', t('nav.langLabel'));

  for (const code of languageOptions()) {
    const button = el('button', {
      class: 'langswitch__option',
      type: 'button',
      onclick: () => { if (lang() !== code) setLang(code); },
    }, code.toUpperCase());
    buttons.set(code, button);
    container.appendChild(button);
  }

  paint();
  window.addEventListener('langchange', paint);
  return paint;
}
