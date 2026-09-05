/**
 * A short notice that slides in at the top and leaves on its own.
 *
 * Used where the tape would be too much — telling someone their allowance is
 * gone for the third time should not seal the page again.
 */

import { el } from './dom.js';

const LIFE_MS = 3200;
let current = null;

export function toast(message, { tone = 'plain' } = {}) {
  current?.remove();

  const node = el('div', { class: `toast toast--${tone}`, role: 'status' }, message);
  document.body.appendChild(node);
  current = node;

  requestAnimationFrame(() => node.classList.add('is-open'));

  const close = () => {
    node.classList.remove('is-open');
    setTimeout(() => {
      node.remove();
      if (current === node) current = null;
    }, 320);
  };

  const timer = setTimeout(close, LIFE_MS);
  node.addEventListener('click', () => { clearTimeout(timer); close(); });

  return close;
}
