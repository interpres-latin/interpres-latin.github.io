/**
 * The teacher's padlock.
 *
 * The switch lives on the server, so throwing it seals the site for everyone
 * currently on it, not just this browser. Clients poll for the state, which is
 * how a locked room reaches someone who was already reading a page.
 *
 * Anyone with the passcode can unlock — including from the tape itself, so a
 * student who knows it is not stranded.
 */

import { el, clear, icon, ICONS, getJson, postJson } from './dom.js';
import { t } from './i18n.js';
import { sealWithTape } from './tape.js';

const POLL_MS = 8000;

let locked = false;
let unseal = null;
let button = null;

function paintButton() {
  if (!button) return;
  clear(button);
  button.appendChild(icon(locked ? ICONS.lock : ICONS.unlock, { size: 17 }));
  button.classList.toggle('is-locked', locked);
  button.setAttribute('aria-label', locked ? t('lock.unlockLabel') : t('lock.lockLabel'));
  button.title = locked ? t('lock.unlockLabel') : t('lock.lockLabel');
}

/** Put the tape up, or take it down, to match the server. */
function applyState(next) {
  if (next === locked) return;
  locked = next;
  paintButton();

  if (!locked) {
    unseal?.();
    unseal = null;
    return;
  }

  if (unseal) return;
  unseal = sealWithTape(document.body, {
    title: t('lock.sealedTitle'),
    detail: t('lock.sealedDetail'),
    note: t('lock.sealedNote'),
    prompt: {
      placeholder: t('lock.passcode'),
      submit: t('tape.unlock'),
      wrong: t('lock.wrong'),
      onSubmit: (value) => {
        // Fire and forget: the poll below takes the tape down once the server
        // agrees, so a wrong code simply leaves it up.
        postJson('/api/lock', { passcode: value, locked: false })
          .then((state) => applyState(Boolean(state.locked)))
          .catch(() => {});
        return false;
      },
    },
  });
}

async function refresh() {
  try {
    const state = await getJson('/api/lock');
    applyState(Boolean(state.locked));
  } catch {
    // Server unreachable — leave whatever is on screen alone.
  }
}

/** The little dialog the padlock opens, mirroring the language gate. */
function askForPasscode(anchor) {
  anchor.parentElement.querySelector('.passgate')?.remove();

  const field = el('input', {
    type: 'password',
    autocomplete: 'off',
    placeholder: t('lock.passcode'),
    'aria-label': t('lock.passcode'),
  });
  const error = el('p', { class: 'passgate__error' });

  const form = el('form', { class: 'passgate passgate--left' },
    el('p', { class: 'passgate__title' }, t('lock.title')),
    el('p', { class: 'passgate__detail' }, t('lock.detail')),
    el('div', { class: 'passgate__row' },
      field,
      el('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, t('lock.lockNow'))),
    error,
    el('button', { class: 'passgate__cancel', type: 'button', onclick: () => close() }, t('passcode.cancel')));

  const close = () => {
    form.remove();
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey);
  };
  const onOutside = (event) => { if (!form.contains(event.target) && event.target !== anchor) close(); };
  const onKey = (event) => { if (event.key === 'Escape') close(); };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const state = await postJson('/api/lock', { passcode: field.value, locked: !locked });
      close();
      applyState(Boolean(state.locked));
    } catch {
      error.textContent = t('lock.wrong');
      field.value = '';
      field.focus();
    }
  });

  anchor.parentElement.appendChild(form);
  field.focus();
  setTimeout(() => {
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey);
  }, 0);
}

export function mountSiteLock(node) {
  button = node;
  clear(button);
  paintButton();

  button.addEventListener('click', () => askForPasscode(button));
  window.addEventListener('langchange', paintButton);

  refresh();
  const timer = setInterval(refresh, POLL_MS);
  return () => clearInterval(timer);
}

export function isSiteLocked() {
  return locked;
}
