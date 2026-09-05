/**
 * OpenRouter — the overflow provider, once the primary's allowance is spent.
 *
 * This file will not spend money, and it does not rely on any one mechanism to
 * promise that:
 *
 *   1. The model id must end in `:free`. Anything else is refused here, before
 *      a request is built.
 *   2. Every request carries `provider.max_price` of zero, so OpenRouter itself
 *      refuses to route to a paid endpoint — verified: a paid model comes back
 *      "No endpoints found that satisfy the max price for this request".
 *   3. The model's advertised price is checked against /models on first use and
 *      cached; a non-zero price refuses the call.
 *
 * Those are the code-side guards. The account-side ones (no payment method, a
 * credit limit on the key) are in the README, and matter just as much.
 */

import { readEventStream } from './sse.js';

const BASE = 'https://openrouter.ai/api/v1';

/**
 * Free endpoints go overloaded intermittently, so keep a couple of spares and
 * move down the list. All verified zero-priced; the guards below re-check.
 */
const DEFAULT_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'minimax/minimax-m3:free',
  'inclusionai/ling-3.0-flash-sante:free',
];

/** OpenRouter attributes traffic with these; they are courtesy, not auth. */
const ATTRIBUTION = {
  'HTTP-Referer': process.env.PUBLIC_URL || 'http://localhost:4000',
  'X-Title': 'ProfeGPT',
};

/** Zero on every axis OpenRouter can charge on. */
const FREE_ONLY = { max_price: { prompt: 0, completion: 0, request: 0, image: 0 } };

export const id = 'openrouter';
export const label = 'OpenRouter';
export const free = true;
export const keyName = 'OPENROUTER_API_KEY';

export function configured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function models() {
  const configured = (process.env.OPENROUTER_MODEL || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_MODELS;
}

export function model() {
  return models()[0];
}

function refuse(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'NOT_FREE';
  return error;
}

const verified = new Set();
let catalogue = null;

/**
 * Confirm with OpenRouter that a model really is free before sending anything
 * to it. A failed lookup does not open the gate — it closes it.
 */
async function assertFree(wanted) {
  if (!wanted.endsWith(':free')) {
    throw refuse(`OpenRouter models must end in ":free" so they cannot be billed. Got "${wanted}".`);
  }
  if (verified.has(wanted)) return;

  if (!catalogue) {
    const response = await fetch(`${BASE}/models`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw refuse('Could not confirm the OpenRouter model is free, so nothing was sent.');
    catalogue = (await response.json()).data || [];
  }

  const entry = catalogue.find((item) => item.id === wanted);
  if (!entry) throw refuse(`OpenRouter does not list "${wanted}".`);

  const price = entry.pricing || {};
  const chargeable = ['prompt', 'completion', 'request', 'image']
    .filter((field) => Number(price[field] || 0) !== 0);
  if (chargeable.length) {
    throw refuse(`"${wanted}" is not free — it charges for ${chargeable.join(', ')}. Refusing to send it.`);
  }

  verified.add(wanted);
}

function requestBody({ system, messages, maxTokens, stream, model: chosen }) {
  return {
    model: chosen,
    messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages],
    max_tokens: maxTokens,
    stream,
    provider: FREE_ONLY,
  };
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    ...ATTRIBUTION,
  };
}

async function failure(response) {
  const body = await response.json().catch(() => null);
  const error = new Error(body?.error?.message || `OpenRouter responded ${response.status}`);
  error.status = body?.error?.code || response.status;
  return error;
}

export async function ask({ system, messages, maxTokens = 2000 }) {
  let last = null;

  for (const chosen of models()) {
    await assertFree(chosen);
    try {
      const response = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(requestBody({ system, messages, maxTokens, stream: false, model: chosen })),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) throw await failure(response);

      const payload = await response.json();
      if (payload.error) throw new Error(payload.error.message || 'OpenRouter returned an error.');
      return (payload.choices?.[0]?.message?.content || '').trim();
    } catch (error) {
      if (error.code === 'NOT_FREE') throw error;
      last = error;
    }
  }

  throw last || new Error('No OpenRouter model was available.');
}

export async function* askStream({ system, messages, maxTokens = 4000 }) {
  let last = null;

  // Only the *opening* of a stream is retried on another model: once tokens
  // have been sent nothing restarts them over a half-written answer.
  for (const chosen of models()) {
    await assertFree(chosen);

    const controller = new AbortController();
    let response;
    try {
      response = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(requestBody({ system, messages, maxTokens, stream: true, model: chosen })),
        signal: controller.signal,
      });
      if (!response.ok) throw await failure(response);
      if (!response.body) throw new Error('OpenRouter returned no stream.');
    } catch (error) {
      last = error;
      continue;
    }

    let produced = false;
    for await (const data of readEventStream(response, controller)) {
      if (data === '[DONE]') return;

      let payload;
      try { payload = JSON.parse(data); } catch { continue; }

      if (payload.error) {
        const error = new Error(payload.error.message || 'OpenRouter returned an error.');
        if (produced) throw error;
        last = error;
        break;
      }

      const text = payload.choices?.[0]?.delta?.content;
      if (text) { produced = true; yield text; }
    }

    if (produced) return;
  }

  throw last || new Error('No OpenRouter model was available.');
}
