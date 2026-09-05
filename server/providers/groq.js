/**
 * Groq — an OpenAI-compatible endpoint with a free tier.
 *
 * Second choice after Gemini. Get a key at https://console.groq.com/keys.
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

export function model() {
  return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
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
  return error;
}

export async function ask({ system, messages, maxTokens = 2000 }) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(requestBody({ system, messages, maxTokens, stream: false })),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) throw await failure(response);

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
