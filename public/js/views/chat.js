import { el, icon, ICONS, clear } from '../lib/dom.js';
import { renderMarkdown } from '../lib/markdown.js';
import { startWallpaper, wallpaperLayer } from '../lib/wallpaper.js';
import { t } from '../lib/i18n.js';
import { ask, getState, isBusy, loadStatus, subscribe } from '../lib/chat-session.js';

/** The profe's interjections, and their French counterparts. */

/**
 * The chat page is a pure view over lib/chat-session.js. It owns no
 * conversation state, so unmounting it — switching page, language or theme —
 * cannot interrupt an answer that is still generating.
 */
export function renderChat(main) {

  const log = el('div', { class: 'chat__log' });
  const input = el('textarea', { rows: 1, placeholder: t('chat.placeholder'), 'aria-label': t('chat.messageLabel') });

  const send = el('button', { class: 'composer__send', type: 'submit', disabled: true, 'aria-label': t('chat.send') },
    icon(ICONS.send, { size: 16, fill: true }));

  const composer = el('form', { class: 'composer' }, input, send);
  const hint = el('p', { class: 'composer__hint' }, t('chat.enterHint'));
  const chat = el('div', { class: 'chat' }, log, composer, hint);
  // Long-form text over the busiest part of the photo needs a heavier scrim.
  const wallpaper = wallpaperLayer({ band: true, strong: true });

  main.append(wallpaper, el('div', { class: 'page shell', style: { paddingBottom: '24px' } }, chat));
  const stopWallpaper = startWallpaper(wallpaper, composer);

  // --- painting ------------------------------------------------------------

  const scrollDown = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

  function bubble(role) {
    const body = el('div', { class: 'msg__body' });
    log.appendChild(el('div', { class: `msg msg--${role}` },
      el('div', { class: 'msg__who' }, role === 'user' ? t('chat.you') : 'PG'),
      body));
    return body;
  }

  /** Render the tutor's block list into a message body. */
  function paintBlocks(target, blocks) {
    for (const block of blocks) {
      if (block.type === 'md') {
        const holder = el('div', {});
        renderMarkdown(block.text, holder);
        while (holder.firstChild) target.appendChild(holder.firstChild);
      } else if (block.type === 'table') {
        target.appendChild(el('div', { class: 'tablewrap', style: { margin: '4px 0 12px' } },
          el('table', { class: 'conj', style: { minWidth: '0' } },
            el('thead', {}, el('tr', {},
              el('th', { scope: 'col' }, block.caption || block.head[0]),
              el('th', { scope: 'col' }, block.head[1]))),
            el('tbody', {}, ...block.rows.map(([left, right]) =>
              el('tr', {}, el('th', { scope: 'row' }, left), el('td', {}, right)))))));
      } else if (block.type === 'links') {
        target.appendChild(el('div', { class: 'wordlist' },
          el('span', {}, block.label),
          ...block.items.map((item) => el('a', { class: 'chip', href: item.href, 'data-link': '' }, item.label))));
      }
    }
  }

  function greeting() {
    return el('div', { class: 'empty' },
      el('h3', {}, t('chat.title')),
      el('p', {}, t('chat.lead')),
      el('div', { class: 'starters', style: { justifyContent: 'center' } },
        ...t('chat.starters').split('|').map((starter) => el('button', {
          type: 'button',
          onclick: () => { input.value = starter; resize(); submit(); },
        }, starter))));
  }

  /** Rebuild the transcript from state — on mount, and on any structural change. */
  function paint(state) {
    clear(log);

    if (!state.messages.length && !state.streaming) {
      log.appendChild(greeting());
      return;
    }

    for (const message of state.messages) {
      const body = bubble(message.role === 'user' ? 'user' : 'bot');
      if (message.role === 'user') {
        body.appendChild(el('p', {}, message.content));
        continue;
      }
      if (message.blocks) paintBlocks(body, message.blocks);
      else if (message.content) renderMarkdown(message.content, body);
      if (message.provider) body.appendChild(el('p', { class: 'msg__source' }, message.provider));
      if (message.error) body.appendChild(el('p', { class: 'error' }, message.error));
    }

    if (state.streaming) {
      bubble('bot').dataset.streaming = 'true';
      paintStreaming(state);
    }
  }

  /** Cheaper path for each token: only the last bubble changes. */
  function paintStreaming(state) {
    const body = log.querySelector('[data-streaming]');
    if (!body || !state.streaming) return;
    clear(body);
    if (state.streaming.reply) renderMarkdown(state.streaming.reply, body);
    else body.appendChild(el('span', { class: 'spinner' }));
    body.appendChild(el('span', { class: 'caret' }));
  }

  function updateHint(state) {
    clear(hint);
    hint.textContent = state.enabled ? t('chat.withModel') : t('chat.groundedOnly');
  }

  function resize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
    send.disabled = !input.value.trim() || isBusy() || input.disabled;
  }

  function onChange(state, kind) {
    if (kind === 'stream') {
      paintStreaming(state);
      scrollDown();
      return;
    }

    paint(state);
    updateHint(state);
    resize();
    scrollDown();
  }

  // --- wiring --------------------------------------------------------------

  function submit() {
    const text = input.value.trim();
    if (!text || isBusy() || input.disabled) return;
    input.value = '';
    resize();
    const state = getState();
    ask(text, {
      needsKeyNote: state.enabled ? null : t('chat.needsKey'),
    });
  }

  composer.addEventListener('submit', (event) => { event.preventDefault(); submit(); });
  input.addEventListener('input', resize);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); }
  });

  const unsubscribe = subscribe(onChange);

  // Repaint whatever the session already holds — including a reply that went on
  // generating while this view was unmounted.
  const state = getState();
  paint(state);
  updateHint(state);
  resize();
  if (!state.loaded) loadStatus();

  input.focus();

  // Deliberately does not abort the request: the answer finishes in the
  // background and is waiting when the visitor comes back.
  return () => { unsubscribe(); stopWallpaper(); };
}
