/**
 * Server-sent-event framing.
 *
 * Providers disagree about line endings — Gemini separates events with CRLF,
 * most others with bare LF — so splitting on "\n\n" silently yields nothing
 * against half of them. Everything here tolerates both.
 */

const SEPARATOR = /\r?\n\r?\n/;

/**
 * Pull every complete event out of a growing buffer.
 * @returns {{events: string[], rest: string}} rest is the incomplete tail
 */
export function drainEvents(buffer) {
  const events = [];
  let rest = buffer;

  for (;;) {
    const match = SEPARATOR.exec(rest);
    if (!match) break;
    events.push(rest.slice(0, match.index));
    rest = rest.slice(match.index + match[0].length);
  }

  return { events, rest };
}

/** The `data:` payload of one event, or null if it carries none. */
export function dataOf(event) {
  for (const line of event.split(/\r?\n/)) {
    if (line.startsWith('data:')) return line.slice(5).trim();
  }
  return null;
}

/** How long to wait for the next byte before giving up on a stalled provider. */
const IDLE_MS = 45000;

/**
 * Read a fetch Response body as a sequence of `data:` payloads.
 *
 * Aborts if the consumer stops early, and also if the provider goes quiet: a
 * model under load can hold the connection open indefinitely, which would
 * otherwise leave the browser waiting forever with no error.
 */
export async function* readEventStream(response, controller) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  const withIdleTimeout = (promise) => {
    let timer;
    const idle = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('The model stopped responding. Try again.')), IDLE_MS);
    });
    return Promise.race([promise, idle]).finally(() => clearTimeout(timer));
  };

  try {
    for (;;) {
      const { value, done } = await withIdleTimeout(reader.read());
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const { events, rest } = drainEvents(buffer);
      buffer = rest;
      for (const event of events) {
        const data = dataOf(event);
        if (data !== null) yield data;
      }
    }

    // A final event with no trailing blank line still counts.
    const data = buffer.trim() ? dataOf(buffer) : null;
    if (data !== null) yield data;
    finished = true;
  } finally {
    if (!finished) controller?.abort();
    reader.cancel().catch(() => {});
  }
}
