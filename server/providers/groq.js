/**
 * Groq — an OpenAI-compatible endpoint with a free tier.
 *
 * Second choice after Gemini. Get a key at https://console.groq.com/keys.
 */

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

        const data = line.slice(5).trim();
        if (data === '[DONE]') { finished = true; return; }

        let payload;
        try { payload = JSON.parse(data); } catch { continue; }

        const text = payload.choices?.[0]?.delta?.content;
        if (text) yield text;
      }
    }
    finished = true;
  } finally {
    if (!finished) controller.abort();
    reader.cancel().catch(() => {});
  }
}
