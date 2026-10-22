/**
 * server/providers/anthropic.js, for Apps Script.
 *
 * The Node server talks to Claude through the official SDK, which cannot load
 * in Apps Script (no Node modules, no streaming sockets). Here the same
 * provider is a plain POST to the Messages API over UrlFetchApp (the shim's
 * fetch), with the same exports, defaults and behaviour: the server-side
 * refusal fallback, dropped if the account is not enrolled, and a refusal
 * turned into a 422.
 *
 * Only used if ANTHROPIC_API_KEY is set in the script properties. It is the
 * paid provider, tried after Groq, exactly as on the Node server.
 */

/** The same default as server/providers/anthropic.js; ANTHROPIC_MODEL overrides it. */
const DEFAULT_MODEL = 'claude-opus-5';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2026-10-21';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export const id = 'anthropic';
export const label = 'Claude';
export const free = false;
export const keyName = 'ANTHROPIC_API_KEY';

export function configured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function model() {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

/** Each execution is fresh, so this is relearned per request; it costs one retry at most. */
let fallbackSupported = true;

function apiError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

async function send({ system, messages, maxTokens, effort }) {
  if (!configured()) throw apiError(503, 'ANTHROPIC_API_KEY is not set', 'NO_API_KEY');

  const body = { model: model(), max_tokens: maxTokens, system, messages, output_config: { effort } };
  const headers = {
    'content-type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': API_VERSION,
  };
  if (fallbackSupported) {
    body.fallbacks = 'default';
    headers['anthropic-beta'] = FALLBACK_BETA;
  }

  const response = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw apiError(response.status, data?.error?.message || `Claude answered ${response.status}`, data?.error?.type);
  }
  return data;
}

/** A 400 about the beta means this account cannot use server-side fallback. */
function isFallbackRejection(error) {
  if (!fallbackSupported || error?.status !== 400) return false;
  const message = String(error.message || '').toLowerCase();
  return message.includes('fallback') || message.includes(FALLBACK_BETA);
}

function checkRefusal(message) {
  if (message.stop_reason !== 'refusal') return;
  throw apiError(422, message.stop_details?.explanation || 'The request was declined.', 'REFUSAL');
}

/** One-shot request that returns the concatenated text of the reply. */
export async function ask({ system, messages, maxTokens = 2000, effort = 'low' }) {
  let response;
  try {
    response = await send({ system, messages, maxTokens, effort });
  } catch (error) {
    if (!isFallbackRejection(error)) throw error;
    fallbackSupported = false;
    response = await send({ system, messages, maxTokens, effort });
  }

  checkRefusal(response);
  return (response.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

/**
 * Streaming, as far as Apps Script can stream: UrlFetchApp returns whole
 * bodies, so the reply arrives as one chunk. The build flattens this
 * generator into an async function returning that one chunk.
 */
export async function* askStream({ system, messages, maxTokens = 8000, effort = 'medium' }) {
  yield await ask({ system, messages, maxTokens, effort });
}
