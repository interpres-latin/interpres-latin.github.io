/**
 * Groq — an OpenAI-compatible endpoint with a free tier.
 *
 * The first provider tried. Get a key at https://console.groq.com/keys.
 */

import { readEventStream } from './sse.js';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export const id = 'groq';
export const label = 'Groq';
export const free = true;
export const keyName = 'GROQ_API_KEY';

export function configured() {
  return Boolean(process.env.GROQ_API_KEY);
}

/**
 * Groq retires models without warning and the endpoint answers a dead one with
 * a plain 404 — "does not exist or you do not have access to it", which reads
 * like a key problem and is not. `llama-3.3-70b-versatile` was the default here
 * until it was decommissioned. If this one goes the same way, `GROQ_MODEL`
 * overrides it, and https://console.groq.com/docs/models lists what is live.
 */
export function model() {
  return process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
}

function requestBody({ system, messages, maxTokens, stream }) {
  return {
    model: model(),
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages,
    ],
    max_tokens: maxTokens,
    stream,
  };
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
  };
}

async function failure(response) {
  const body = await response.json().catch(() => null);
  const error = new Error(body?.error?.message || `Groq responded ${response.status}`);
  error.status = response.status;
  error.retryAfter = retryDelay(response, error.message);
  return error;
}

/**
 * How long Groq says to wait, in milliseconds, or null.
 *
 * The free tier is eight thousand tokens a minute, which one page of Virgil
 * goes through comfortably: the translator asks three questions per sentence
 * and a reasoning model spends most of its answer thinking. Every one of those
 * refusals said exactly how long to wait — "Please try again in 9.0075s" — and
 * the client threw it away, so the chain fell through to the word-by-word
 * glossary and the reader got a list instead of a sentence. Six passages out of
 * eleven, none of them because anything was wrong with the Latin.
 *
 * The header is preferred where there is one; the sentence is the fallback,
 * because Groq does not always send the header.
 */
function retryDelay(response, message) {
  const header = Number(response.headers?.get?.('retry-after'));
  if (Number.isFinite(header) && header > 0) return Math.ceil(header * 1000);

  const said = /try again in ([\d.]+)\s*(ms|s)\b/i.exec(String(message ?? ''));
  if (!said) return null;
  const amount = Number(said[1]);
  if (!Number.isFinite(amount)) return null;
  return Math.ceil(said[2].toLowerCase() === 'ms' ? amount : amount * 1000);
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * A rate limit is a queue, not a refusal.
 *
 * Bounded twice over: a fixed number of waits, and never longer than the cap. A
 * limit that wants more than half a minute is worth giving up on, because a
 * reader is watching a spinner.
 *
 * The budget is generous because the translator asks several questions per
 * sentence — a translation, a check, sometimes a repair — and the free tier is
 * eight thousand tokens a minute. Being impatient here does not fail fast; it
 * falls through to the word-by-word list, which is a visibly worse answer for
 * the sake of a few seconds.
 */
const MAX_RETRIES = 6;
const LONGEST_WAIT_MS = 30000;

// Only the non-streaming path retries. A stream that has already started
// cannot be replayed, and the chat route has its own fall-through.
async function sendWithRetry(body) {
  for (let attempt = 0; ; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    if (response.ok) return response;

    // eslint-disable-next-line no-await-in-loop
    const error = await failure(response);
    const again = error.status === 429 && attempt < MAX_RETRIES
      && error.retryAfter !== null && error.retryAfter <= LONGEST_WAIT_MS;
    if (!again) throw error;

    // A little past what it asked for: the window has to have actually moved on.
    // eslint-disable-next-line no-await-in-loop
    await wait(error.retryAfter + 250);
  }
}

export async function ask({ system, messages, maxTokens = 2000 }) {
  const response = await sendWithRetry(requestBody({ system, messages, maxTokens, stream: false }));

  const payload = await response.json();
  return (payload.choices?.[0]?.message?.content || '').trim();
}

export async function* askStream({ system, messages, maxTokens = 4000 }) {
  const controller = new AbortController();
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(requestBody({ system, messages, maxTokens, stream: true })),
    signal: controller.signal,
  });

  if (!response.ok) throw await failure(response);
  if (!response.body) throw new Error('Groq returned no stream.');

  for await (const data of readEventStream(response, controller)) {
    if (data === '[DONE]') return;

    let payload;
    try { payload = JSON.parse(data); } catch { continue; }

    const text = payload.choices?.[0]?.delta?.content;
    if (text) yield text;
  }
}
