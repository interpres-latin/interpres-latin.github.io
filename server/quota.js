/**
 * Sliding-window quota for the questions that fall through to Claude.
 *
 * Spanish questions are answered by the tutor from the site's own data and cost
 * nothing, so they never reach here. Only the off-topic ones are metered, which
 * is what keeps the bill bounded.
 *
 * Enforced on the server because a client-side counter is decoration: the point
 * is to cap real spend, not to nudge the visitor.
 */

/** `Number(x) || fallback` would turn a deliberate 0 back into the default. */
function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

const LIMIT = envNumber('CHAT_FREE_LIMIT', 10);
const WINDOW_MS = envNumber('CHAT_WINDOW_MINUTES', 30) * 60 * 1000;
const SWEEP_MS = 10 * 60 * 1000;

/** @type {Map<string, number[]>} caller → timestamps of their recent questions */
const hits = new Map();

function prune(timestamps, now) {
  const cutoff = now - WINDOW_MS;
  let index = 0;
  while (index < timestamps.length && timestamps[index] <= cutoff) index += 1;
  return index ? timestamps.slice(index) : timestamps;
}

/** Behind a proxy the socket address is the proxy, so prefer the forwarded IP. */
export function callerOf(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/** Read-only: pruning is left to consume() and the sweep, so this has no side effects. */
export function peek(caller, now = Date.now()) {
  const timestamps = prune(hits.get(caller) || [], now);

  return {
    limit: LIMIT,
    used: timestamps.length,
    remaining: Math.max(0, LIMIT - timestamps.length),
    // When the oldest question ages out, one slot comes back.
    resetAt: timestamps.length >= LIMIT ? timestamps[0] + WINDOW_MS : null,
    windowMinutes: WINDOW_MS / 60000,
  };
}

/** Take one slot. Returns the state after the attempt, and whether it was allowed. */
export function consume(caller, now = Date.now()) {
  const timestamps = prune(hits.get(caller) || [], now);

  if (timestamps.length >= LIMIT) {
    hits.set(caller, timestamps);
    return { ...peek(caller, now), allowed: false };
  }

  timestamps.push(now);
  hits.set(caller, timestamps);
  return { ...peek(caller, now), allowed: true };
}

/** Give a slot back when a request fails before it costs anything. */
export function refund(caller) {
  const timestamps = hits.get(caller);
  if (!timestamps?.length) return;
  timestamps.pop();
  if (timestamps.length) hits.set(caller, timestamps);
  else hits.delete(caller);
}

// Callers who never come back would otherwise sit in the map forever.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [caller, timestamps] of hits) {
    const kept = prune(timestamps, now);
    if (kept.length) hits.set(caller, kept);
    else hits.delete(caller);
  }
}, SWEEP_MS);
sweep.unref?.();

export const QUOTA = { LIMIT, WINDOW_MS };
