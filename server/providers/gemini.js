/**
 * Google AI Studio (Gemini).
 *
 * The default provider, because its free tier is generous enough to run this
 * site without a bill. Get a key at https://aistudio.google.com/apikey.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export const id = 'gemini';
export const label = 'Gemini';
export const free = true;
export const keyName = 'GEMINI_API_KEY';

export function configured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function model() {
  return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
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
  const response = await fetch(url('generateContent'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody({ system, messages, maxTokens })),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) throw await failure(response);

  const payload = await response.json();
  checkBlocked(payload);
  return textOf(payload).trim();
}

export async function* askStream({ system, messages, maxTokens = 4000 }) {
  const controller = new AbortController();
  const response = await fetch(url('streamGenerateContent', '&alt=sse'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody({ system, messages, maxTokens })),
    signal: controller.signal,
  });

  if (!response.ok) throw await failure(response);
  if (!response.body) throw new Error('Gemini returned no stream.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let split;
      while ((split = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);

        const line = chunk.split('\n').find((item) => item.startsWith('data:'));
        if (!line) continue;

        let payload;
        try { payload = JSON.parse(line.slice(5).trim()); } catch { continue; }

        checkBlocked(payload);
        const text = textOf(payload);
        if (text) yield text;
      }
    }
    finished = true;
  } finally {
    // The consumer hung up — stop pulling tokens we are not going to use.
    if (!finished) controller.abort();
    reader.cancel().catch(() => {});
  }
}
