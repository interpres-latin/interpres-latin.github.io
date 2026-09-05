import { el, icon, ICONS, clear, getJson } from '../lib/dom.js';
import { renderMarkdown } from '../lib/markdown.js';

const STARTERS = [
  '¿Cuál es la diferencia entre ser y estar?',
  'Explícame el subjuntivo con ejemplos sencillos.',
  '¿Por qué se dice "me gusta" y no "yo gusto"?',
  'Corrige este texto: Ayer yo fui a la tienda y compro pan.',
];

export function renderChat(main) {
  const messages = [];
  let streaming = null;

  const log = el('div', { class: 'chat__log' });
  const input = el('textarea', {
    rows: 1,
    placeholder: 'Pregunta lo que quieras…',
    'aria-label': 'Mensaje',
  });

  const send = el('button', {
    class: 'composer__send',
    type: 'submit',
    disabled: true,
    'aria-label': 'Enviar',
  }, icon(ICONS.send, { size: 16, fill: true }));

  const composer = el('form', { class: 'composer' }, input, send);
  const hint = el('p', { class: 'composer__hint' }, 'Enter para enviar · Shift + Enter para un salto de línea');

  main.append(el('div', { class: 'page shell', style: { paddingBottom: '24px' } },
    el('div', { class: 'chat' }, log, composer, hint)));

  greet();

  getJson('/api/chat/status')
    .then((status) => { if (!status.enabled) disable(); })
    .catch(() => disable());

  function disable() {
    input.disabled = true;
    send.disabled = true;
    input.placeholder = 'El chat necesita una clave de API.';
    log.prepend(el('div', { class: 'notice' },
      'El chat funciona con la API de Claude. Copia ',
      el('code', {}, '.env.example'),
      ' a ',
      el('code', {}, '.env'),
      ', pon ahí tu ',
      el('code', {}, 'ANTHROPIC_API_KEY'),
      ' y reinicia el servidor. El traductor, la conjugación y el diccionario funcionan sin clave.'));
  }

  function greet() {
    clear(log);
    log.appendChild(el('div', { class: 'empty' },
      el('h3', {}, 'Pregúntale a ProfeGPT'),
      el('p', {}, 'Gramática, vocabulario, matices de traducción — o cualquier otra cosa.'),
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

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function resize() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
    send.disabled = !input.value.trim() || Boolean(streaming) || input.disabled;
  }

  async function submit() {
    const text = input.value.trim();
    if (!text || streaming || input.disabled) return;

    if (!messages.length) clear(log);

    messages.push({ role: 'user', content: text });
    bubble('user').appendChild(el('p', {}, text));

    input.value = '';
    resize();
    scrollDown();

    const target = bubble('bot');
    const caret = el('span', { class: 'caret' });
    target.appendChild(caret);
    scrollDown();

    const controller = new AbortController();
    streaming = controller;
    send.disabled = true;

    let answer = '';
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const failure = await response.json().catch(() => ({}));
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

          if (event.type === 'delta') {
            answer += event.text;
            renderMarkdown(answer, target);
            target.appendChild(caret);
            scrollDown();
          } else if (event.type === 'error') {
            throw new Error(event.error);
          }
        }
      }

      renderMarkdown(answer, target);
      if (answer.trim()) messages.push({ role: 'assistant', content: answer });
      else target.appendChild(el('p', { class: 'error' }, 'La respuesta llegó vacía.'));
    } catch (error) {
      caret.remove();
      if (error.name !== 'AbortError') {
        if (answer.trim()) renderMarkdown(answer, target);
        target.appendChild(el('p', { class: 'error' }, error.message));
      }
    } finally {
      caret.remove();
      streaming = null;
      resize();
      scrollDown();
      input.focus();
    }
  }

  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    submit();
  });

  input.addEventListener('input', resize);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  });

  resize();
  input.focus();

  return () => streaming?.abort();
}
