/**
 * The tape that seals the chat when the free questions run out.
 *
 * Two translucent strips roll across the panel from opposite corners and cross
 * into an X. The strips are real elements sitting above the chat, so they also
 * do the blocking — nothing underneath can be clicked while they are up.
 *
 * The angle and length are measured from the panel rather than hard-coded, so
 * the X lands on the corners at any size.
 */

import { el } from './dom.js';

const ROLL_MS = 1500;

export function sealWithTape(panel, { title, detail, note }) {
  panel.querySelector('.tape')?.remove();

  const first = strip('tape__strip--a');
  const second = strip('tape__strip--b');

  const overlay = el('div', { class: 'tape', role: 'alert' },
    first.wrapper,
    second.wrapper,
    el('div', { class: 'tape__card' },
      el('p', { class: 'tape__title' }, title),
      el('p', { class: 'tape__detail' }, detail),
      note ? el('p', { class: 'tape__note' }, note) : null));

  panel.appendChild(overlay);

  const measure = () => {
    const { width, height } = panel.getBoundingClientRect();
    if (!width || !height) return;
    // A strip long enough to reach both corners, at the panel's own diagonal.
    const length = Math.hypot(width, height) + 40;
    const angle = (Math.atan2(height, width) * 180) / Math.PI;
    overlay.style.setProperty('--tape-length', `${length}px`);
    overlay.style.setProperty('--tape-angle-a', `${angle}deg`);
    overlay.style.setProperty('--tape-angle-b', `${-angle}deg`);
  };

  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(panel);

  // Let the first frame land with the strips at zero width, then roll them.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('is-rolling');
    });
  });

  const reveal = setTimeout(() => overlay.classList.add('is-sealed'), ROLL_MS + 500);

  return () => {
    clearTimeout(reveal);
    observer.disconnect();
    overlay.remove();
  };
}

function strip(modifier) {
  const inner = el('div', { class: 'tape__inner' });
  const wrapper = el('div', { class: `tape__strip ${modifier}` }, inner);
  return { wrapper, inner };
}
