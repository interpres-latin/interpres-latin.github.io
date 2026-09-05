/**
 * The tape that seals things off.
 *
 * Two translucent strips roll in from opposite corners and cross into an X.
 * The strips are real elements above the content, so they also do the blocking
 * — nothing underneath can be clicked while they are up.
 *
 * Used twice: over the chat panel when the free questions run out, and over the
 * whole page when the English passcode is wrong.
 *
 * The angle and length are measured from whatever is being sealed, so the X
 * lands on its corners at any size.
 */

import { el } from './dom.js';

const ROLL_MS = 1500;

/**
 * @param {HTMLElement} panel  what to seal — pass document.body for the page
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.detail
 * @param {string} [options.note]
 * @param {object} [options.prompt]  { placeholder, submit, onSubmit(value) -> bool, wrong }
 * @param {object} [options.dismiss] { label, onDismiss } — a way back out, for
 *        a tape that should inform rather than imprison
 */
export function sealWithTape(panel, { title, detail, note, prompt = null, dismiss = null }) {
  panel.querySelector(':scope > .tape')?.remove();

  const page = panel === document.body;
  const card = el('div', { class: 'tape__card' },
    el('p', { class: 'tape__title' }, title),
    el('p', { class: 'tape__detail' }, detail));

  let cleanup = null;

  if (prompt) {
    const field = el('input', {
      type: 'text',
      inputMode: 'numeric',
      autocomplete: 'off',
      placeholder: prompt.placeholder,
      'aria-label': prompt.placeholder,
    });
    const error = el('p', { class: 'tape__error' });

    const form = el('form', { class: 'tape__form' },
      field,
      el('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, prompt.submit));

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (prompt.onSubmit(field.value)) {
        cleanup?.();
        return;
      }
      error.textContent = prompt.wrong;
      field.value = '';
      field.focus();
    });

    card.append(form, error);
    // Focus once the tape has finished rolling, so it does not scroll-jump.
    setTimeout(() => field.focus(), ROLL_MS + 600);
  }

  if (note) card.appendChild(el('p', { class: 'tape__note' }, note));

  if (dismiss) {
    card.appendChild(el('button', {
      class: 'btn btn--primary tape__dismiss',
      type: 'button',
      onclick: () => { cleanup?.(); dismiss.onDismiss?.(); },
    }, dismiss.label));
  }

  const overlay = el('div', { class: `tape${page ? ' tape--page' : ''}`, role: 'alert' },
    el('div', { class: 'tape__strip tape__strip--a' }, el('div', { class: 'tape__inner' })),
    el('div', { class: 'tape__strip tape__strip--b' }, el('div', { class: 'tape__inner' })),
    card);

  panel.appendChild(overlay);
  if (page) document.documentElement.classList.add('is-sealed');

  const measure = () => {
    const width = page ? window.innerWidth : panel.getBoundingClientRect().width;
    const height = page ? window.innerHeight : panel.getBoundingClientRect().height;
    if (!width || !height) return;
    // A strip long enough to reach both corners, at the panel's own diagonal.
    overlay.style.setProperty('--tape-length', `${Math.hypot(width, height) + 40}px`);
    const angle = (Math.atan2(height, width) * 180) / Math.PI;
    overlay.style.setProperty('--tape-angle-a', `${angle}deg`);
    overlay.style.setProperty('--tape-angle-b', `${-angle}deg`);
  };

  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(page ? document.documentElement : panel);

  // Let the first frame land with the strips at zero width, then roll them.
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('is-rolling')));
  const reveal = setTimeout(() => overlay.classList.add('is-sealed'), ROLL_MS + 500);

  cleanup = () => {
    clearTimeout(reveal);
    observer.disconnect();
    overlay.remove();
    if (page) document.documentElement.classList.remove('is-sealed');
  };

  return cleanup;
}
