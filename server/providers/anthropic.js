import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = 'claude-opus-5';

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

// Server-side fallback: if a safety classifier declines a request, the API
// retries it on another model instead of handing back a refusal. Accounts that
// are not enrolled in the beta reject the parameter, so we drop it and retry.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
let fallbackSupported = true;

let client = null;

function getClient() {
  if (!configured()) {
    const error = new Error('ANTHROPIC_API_KEY is not set');
    error.status = 503;
    error.code = 'NO_API_KEY';
    throw error;
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

function params({ system, messages, maxTokens, effort }) {
  const request = {
    model: model(),
    max_tokens: maxTokens,
    system,
    messages,
    output_config: { effort },
  };
  if (fallbackSupported) {
    request.betas = [FALLBACK_BETA];
    request.fallbacks = 'default';
  }
  return request;
}

/** A 400 about the beta flag means this account cannot use server-side fallback. */
function isFallbackRejection(error) {
  if (!fallbackSupported || error?.status !== 400) return false;
  const message = String(error.message || '').toLowerCase();
  return message.includes('fallback') || message.includes(FALLBACK_BETA);
}

function checkRefusal(message) {
  if (message.stop_reason !== 'refusal') return;
  const error = new Error(message.stop_details?.explanation || 'The request was declined.');
  error.status = 422;
  error.code = 'REFUSAL';
  throw error;
}

/** One-shot request that returns the concatenated text of the reply. */
export async function ask({ system, messages, maxTokens = 2000, effort = 'low' }) {
  const send = () => getClient().beta.messages.create(params({ system, messages, maxTokens, effort }));

  let response;
  try {
    response = await send();
  } catch (error) {
    if (!isFallbackRejection(error)) throw error;
    fallbackSupported = false;
    response = await send();
  }

  checkRefusal(response);

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

/** Streaming request. Yields text chunks as they arrive. */
export async function* askStream({ system, messages, maxTokens = 8000, effort = 'medium' }) {
  const open = () => getClient().beta.messages.stream(params({ system, messages, maxTokens, effort }));

  let stream;
  let iterator;
  let first;
  try {
    stream = open();
    // Pull the first event here so a rejected beta surfaces before we yield.
    iterator = stream[Symbol.asyncIterator]();
    first = await iterator.next();
  } catch (error) {
    if (!isFallbackRejection(error)) throw error;
    fallbackSupported = false;
    stream = open();
    iterator = stream[Symbol.asyncIterator]();
    first = await iterator.next();
  }

  let finished = false;
  try {
    for (let event = first; !event.done; event = await iterator.next()) {
      const { value } = event;
      if (value.type === 'content_block_delta' && value.delta.type === 'text_delta') {
        yield value.delta.text;
      }
    }
    finished = true;
    checkRefusal(await stream.finalMessage());
  } finally {
    // The consumer hung up (browser closed the connection) — stop the request.
    if (!finished) stream.abort();
  }
}
