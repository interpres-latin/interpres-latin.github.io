import { el, icon, ICONS, clear, getJson } from '../lib/dom.js';
import { renderMarkdown } from '../lib/markdown.js';
import { answer as askTutor } from '../lib/tutor.js';
import { sealWithTape } from '../lib/tape.js';
import { EXCLAMATIONS } from '../data/grammar.js';
import { t } from '../lib/i18n.js';

const STARTERS = [
  'ser y estar',
  'conjuga tener en subjuntivo',
  'qué significa sobremesa',
  'qué es «dijeron»',
  'cómo se dice "I am tired" en español',
];

export function renderChat(main) {
  const history = [];
  let modelEnabled = false;
  let busy = false;
  let streaming = null;
  let language = null; // whichever language the conversation has settled into
  let quota = null;    // free off-topic questions left, from the server
  let unseal = null;   // removes the tape, if it is up

  const log = el('div', { class: 'chat__log' });
  const input = el('textarea', { rows: 1, placeholder: t('chat.placeholder'), 'aria-label': t('chat.messageLabel') });

  const send = el('button', { class: 'composer__send', type: 'submit', disabled: true, 'aria-label': t('chat.send') },
    icon(ICONS.send, { size: 16, fill: true }));

  const composer = el('form', { class: 'composer' }, input, send);
  const hint = el('p', { class: 'composer__hint' }, t('chat.enterHint'));
  const chat = el('div', { class: 'chat' }, log, composer, hint);

  main.append(el('div', { class: 'page shell', style: { paddingBottom: '24px' } }, chat));

  greet();

  // The tutor works with no key at all. A model, when configured, only picks up
  // the questions the tutor decided it could not answer from the site's data.
  getJson('/api/chat/status')
    .then((status) => {
      modelEnabled = Boolean(status.enabled);
      quota = status.quota || null;
      updateHint();
      if (modelEnabled && quota && quota.remaining <= 0) rollTape();
    })
    .catch(() => updateHint());

  function updateHint() {
    clear(hint);
    if (!modelEnabled) {
      hint.textContent = t('chat.groundedOnly');
      return;
    }
    hint.append(t('chat.withModel'));
    hint.appendChild(el('span', { class: 'quota' },
      t('chat.otherTopics'),
      el('b', {}, `${quota ? quota.remaining : '—'} / ${quota ? quota.limit : '—'}`),
      t('chat.perWindow', { minutes: quota ? quota.windowMinutes : 30 })));
  }

  function pick(kind) {
    const options = EXCLAMATIONS[kind];
    return options[Math.floor(Math.random() * options.length)];
  }

  /** Seal the chat: the free off-topic questions are gone until the window rolls. */
  function rollTape() {
    if (unseal) return;
    const minutes = quota?.resetAt
      ? Math.max(1, Math.ceil((quota.resetAt - Date.now()) / 60000))
      : (quota?.windowMinutes ?? 30);

    input.disabled = true;
    send.disabled = true;

    unseal = sealWithTape(chat, {
      title: pick('bad'),
      detail: t('tape.quotaDetail', { minutes }),
      note: t('tape.quotaNote'),
    });
  }

  function greet() {
    clear(log);
    log.appendChild(el('div', { class: 'empty' },
      el('h3', {}, t('chat.title')),
      el('p', {}, t('chat.lead')),
      el('div', { class: 'starters', style: { justifyContent: 'center' } },
        ...STARTERS.map((starter) => el('button', {
          type: 'button',
          onclick: () => { input.value = starter; resize(); submit(); },
        }, starter)))));
  }

  function bubble(role) {
    const body = el('div', { class: 'msg__body' });
    log.appendChild(el('div', { class: `msg msg--${role}` },
      el('div', { class: 'msg__who' }, role === 'user' ? 'TÚ' : 'PG'),
      body));
    return body;
  }

  const scrollDown = () => { log.scrollTop = log.scrollHeight; };

  function resize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
    send.disabled = !input.value.trim() || busy;
  }

  /** Render the tutor's block list into a message body. */
  function paint(target, blocks) {
    clear(target);
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

  async function submit() {
    const text = input.value.trim();
    if (!text || busy) return;

    if (!history.length) clear(log);
    history.push({ role: 'user', content: text });
    bubble('user').appendChild(el('p', {}, text));

    input.value = '';
    busy = true;
    resize();
    scrollDown();

    const target = bubble('bot');
    target.appendChild(el('span', { class: 'spinner' }));
    scrollDown();

    let result;
    try {
      result = await askTutor(text, { language });
      language = result.language;
    } catch (error) {
      result = { blocks: [{ type: 'md', text: t('chat.failed', { error: error.message }) }], confident: false };
    }

    // Hand the unanswerable ones to Claude if there is a key; otherwise the
    // tutor's own "outside my scope" reply stands.
    if (!result.confident && modelEnabled) {
      clear(target);
      await streamFromModel(target);
      if (quota && quota.remaining <= 0) rollTape();
    } else {
      // Out of scope with no model configured: say what would make it work,
      // rather than leaving a dead end.
      const blocks = result.confident ? result.blocks : [...result.blocks, {
        type: 'md',
        text: t('chat.needsKey', { limit: quota?.limit ?? 10, minutes: quota?.windowMinutes ?? 30 }),
      }];
      paint(target, blocks);
      history.push({ role: 'assistant', content: blocksToText(blocks) });
    }

    busy = false;
    resize();
    scrollDown();
    input.focus();
  }

  async function streamFromModel(target) {
    const caret = el('span', { class: 'caret' });
    target.appendChild(caret);

    const controller = new AbortController();
    streaming = controller;
    let reply = '';
    let servedBy = null;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-20) }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const failure = await response.json().catch(() => ({}));
        if (response.status === 429) {
          quota = failure.quota || { ...quota, remaining: 0 };
          updateHint();
          clear(target);
          target.appendChild(el('p', {}, failure.error));
          rollTape();
          return;
        }
        throw new Error(failure.error || `El servidor respondió ${response.status}.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let split;
        while ((split = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, split).trim();
          buffer = buffer.slice(split + 2);
          if (!chunk.startsWith('data:')) continue;

          let event;
          try { event = JSON.parse(chunk.slice(5).trim()); } catch { continue; }

          if (event.type === 'quota') {
            quota = event.quota;
            updateHint();
          } else if (event.type === 'done' && event.provider) {
            servedBy = event.provider;
          } else if (event.type === 'delta') {
            reply += event.text;
            renderMarkdown(reply, target);
            target.appendChild(caret);
            scrollDown();
          } else if (event.type === 'error') {
            throw new Error(event.error);
          }
        }
      }

      renderMarkdown(reply, target);
      if (reply.trim()) {
        history.push({ role: 'assistant', content: reply });
        if (servedBy) target.appendChild(el('p', { class: 'msg__source' }, servedBy));
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        if (reply.trim()) renderMarkdown(reply, target);
        target.appendChild(el('p', { class: 'error' }, error.message));
      }
    } finally {
      caret.remove();
      streaming = null;
    }
  }

  composer.addEventListener('submit', (event) => { event.preventDefault(); submit(); });
  input.addEventListener('input', resize);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); }
  });

  resize();
  input.focus();

  return () => { streaming?.abort(); unseal?.(); };
}

/** Flatten an answer so it can go back to Claude as conversation history. */
function blocksToText(blocks) {
  return blocks.map((block) => {
    if (block.type === 'md') return block.text;
    if (block.type === 'table') return block.rows.map(([left, right]) => `${left}: ${right}`).join('; ');
    return '';
  }).filter(Boolean).join('\n\n');
}
