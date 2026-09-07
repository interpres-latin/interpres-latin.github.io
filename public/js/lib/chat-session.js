/**
 * The conversation, held outside the view.
 *
 * The chat page is mounted and torn down by the router, so anything owned by
 * the view dies when you switch page, change language or flip the theme. That
 * used to abort a reply mid-generation: the allowance had already been spent
 * but the answer was thrown away.
 *
 * The state and the request both live here instead. Navigating away no longer
 * touches the stream — it finishes in the background, and the answer is on
 * screen when you come back.
 */

import { answer as askTutor } from './tutor.js';
import { getJson } from './dom.js';
import { lang } from './i18n.js';
import { studyLang } from './study.js';

const state = {
  messages: [],        // { role, content, provider? } — the visible transcript
  streaming: null,     // { reply, provider, error } while a model is answering
  quota: null,
  enabled: false,
  language: null,
  loaded: false,
  acknowledged: false, // the visitor has dismissed the "allowance spent" tape
  blocked: [],         // timestamps of off-topic questions refused since then
};

/** Enough refusals close enough together to mean it is not sinking in. */
const BURST_COUNT = 5;
const BURST_MS = 15000;

export function acknowledgeQuota() {
  state.acknowledged = true;
  state.blocked = [];
  emit();
}

/**
 * Record an off-topic question that had no allowance behind it.
 * @returns {'toast'|'tape'} how firmly to say no
 */
function recordBlocked() {
  const now = Date.now();
  state.blocked = state.blocked.filter((at) => now - at < BURST_MS);
  state.blocked.push(now);

  if (state.blocked.length >= BURST_COUNT) {
    state.acknowledged = false;
    state.blocked = [];
    return 'tape';
  }
  return 'toast';
}

const listeners = new Set();

/** @param {(state: object, kind: 'change'|'stream') => void} listener */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(kind = 'change') {
  for (const listener of listeners) listener(state, kind);
}

export function getState() {
  return state;
}

export function isBusy() {
  return state.streaming !== null;
}

export async function loadStatus() {
  try {
    const status = await getJson('/api/chat/status');
    state.enabled = Boolean(status.enabled);
    state.quota = status.quota || null;
  } catch {
    state.enabled = false;
  }
  state.loaded = true;
  emit();
  return state;
}

export function reset() {
  state.messages = [];
  state.streaming = null;
  emit();
}

// The conversation is about one language. Carrying a Spanish transcript into
// French mode would send the model a history it cannot follow, and would leave
// answers on screen that the new tutor could not have given.
window.addEventListener('studychange', reset);

/** Flatten a grounded answer so it can go back to a model as history. */
function blocksToText(blocks) {
  return blocks.map((block) => {
    if (block.type === 'md') return block.text;
    if (block.type === 'table') return block.rows.map(([left, right]) => `${left}: ${right}`).join('; ');
    return '';
  }).filter(Boolean).join('\n\n');
}

/**
 * Ask a question. Resolves when the answer is complete; the caller does not
 * have to stay mounted for that to happen.
 */
export async function ask(text, { needsKeyNote } = {}) {
  if (state.streaming) return;

  state.messages.push({ role: 'user', content: text });
  state.streaming = { reply: '', provider: null, error: null, blocks: null };
  emit();

  let result;
  try {
    // Grounded answers — grammar, dictionary, conjugation — follow the site's
    // language, since that is the language the reader chose to work in. The
    // model fall-through still mirrors whatever the question was asked in.
    result = await askTutor(text, { language: lang(), force: true });
    state.language = result.language;
  } catch (error) {
    result = { confident: false, blocks: [{ type: 'md', text: String(error.message) }] };
  }

  // Out of allowance, and the tutor could not ground it. Say no proportionately
  // rather than sealing the page over and over.
  if (!result.confident && state.enabled && state.quota && state.quota.remaining <= 0) {
    state.messages.pop();
    state.streaming = null;
    state.refusal = state.acknowledged ? recordBlocked() : 'tape';
    emit('refused');
    return;
  }

  // Grounded answers land immediately and cost nothing.
  if (result.confident || !state.enabled) {
    const blocks = result.confident || !needsKeyNote
      ? result.blocks
      : [...result.blocks, { type: 'md', text: needsKeyNote }];
    state.messages.push({ role: 'assistant', content: blocksToText(blocks), blocks });
    state.streaming = null;
    emit();
    return;
  }

  await streamFromModel();
}

async function streamFromModel() {
  const history = state.messages.map(({ role, content }) => ({ role, content }));

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-20), study: studyLang() }),
    });

    if (!response.ok || !response.body) {
      const failure = await response.json().catch(() => ({}));
      if (response.status === 429) state.quota = failure.quota || { ...state.quota, remaining: 0 };
      throw new Error(failure.error || {
        fr: `Le serveur a répondu ${response.status}.`,
        la: `The server responded ${response.status}.`,
        es: `El servidor respondió ${response.status}.`,
      }[studyLang()]);
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
          state.quota = event.quota;
          emit();
        } else if (event.type === 'provider' || (event.type === 'done' && event.provider)) {
          state.streaming.provider = event.provider;
        } else if (event.type === 'delta') {
          state.streaming.reply += event.text;
          emit('stream');
        } else if (event.type === 'error') {
          throw new Error(event.error);
        }
      }
    }

    const { reply, provider } = state.streaming;
    if (reply.trim()) state.messages.push({ role: 'assistant', content: reply, provider });
    else {
      state.messages.push({
        role: 'assistant',
        content: '',
        error: {
          fr: 'La réponse est arrivée vide.',
          la: 'The answer came back empty.',
          es: 'La respuesta llegó vacía.',
        }[studyLang()],
      });
    }
  } catch (error) {
    const { reply, provider } = state.streaming;
    state.messages.push({
      role: 'assistant',
      content: reply,
      provider: reply.trim() ? provider : null,
      error: error.message,
    });
  } finally {
    state.streaming = null;
    emit();
  }
}
