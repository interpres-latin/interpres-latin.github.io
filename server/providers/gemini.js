/**
 * Google AI Studio (Gemini).
 *
 * The default provider, because its free tier is generous enough to run this
 * site without a bill. Get a key at https://aistudio.google.com/apikey.
 */

import { readEventStream } from './sse.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export const id = 'gemini';
export const label = 'Gemini';
export const free = true;
export const keyName = 'GEMINI_API_KEY';

export function configured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function model() {
  // An alias Google keeps pointed at the current Flash. Pinning a version
  // instead invites "no longer available to new users" once it is retired.
  return process.env.GEMINI_MODEL || 'gemini-flash-latest';
}

function requestBody({ system, messages, maxTokens }) {
  return {
    // Gemini calls the assistant "model" and has no assistant/user alternation
    // requirement beyond the last turn being the user's.
    contents: messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: { maxOutputTokens: maxTokens },
  };
}

function url(method, extra = '') {
  const key = encodeURIComponent(process.env.GEMINI_API_KEY);
  return `${ENDPOINT}/${model()}:${method}?key=${key}${extra}`;
}

async function failure(response) {
  const body = await response.json().catch(() => null);
  const message = body?.error?.message || `Gemini responded ${response.status}`;
  const error = new Error(message);
  error.status = response.status;
  return error;
}

/** Free-tier capacity is shared, so overload answers are routine, not fatal. */
const TRANSIENT = new Set([429, 500, 503]);
const RETRIES = 2;
const BACKOFF_MS = 900;

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Open a request, retrying while the model is merely busy. Retried before any
 * tokens have been read, so a caller never sees a half-written answer restart.
 */
async function open(target, init) {
  let last = null;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const response = await fetch(target, init);
    if (response.ok) return response;

    last = await failure(response);
    if (!TRANSIENT.has(response.status) || attempt === RETRIES) throw last;
    await wait(BACKOFF_MS * (attempt + 1));
  }
  throw last;
}

/** A prompt the safety filters refused comes back as a block, not an HTTP error. */
function checkBlocked(payload) {
  const reason = payload?.promptFeedback?.blockReason;
  if (!reason) return;
  const error = new Error(`Gemini declined the request (${reason}).`);
  error.status = 422;
  error.code = 'REFUSAL';
  throw error;
}

function textOf(payload) {
  return (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('');
}

export async function ask({ system, messages, maxTokens = 2000 }) {
  const response = await open(url('generateContent'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody({ system, messages, maxTokens })),
    signal: AbortSignal.timeout(60000),
  });

  const payload = await response.json();
  checkBlocked(payload);
  return textOf(payload).trim();
}

export async function* askStream({ system, messages, maxTokens = 4000 }) {
  const controller = new AbortController();
  const response = await open(url('streamGenerateContent', '&alt=sse'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody({ system, messages, maxTokens })),
    signal: controller.signal,
  });

  if (!response.body) throw new Error('Gemini returned no stream.');

  for await (const data of readEventStream(response, controller)) {
    let payload;
    try { payload = JSON.parse(data); } catch { continue; }

    checkBlocked(payload);
    const text = textOf(payload);
    if (text) yield text;
  }
}
