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
const OVERFLOW_LIMIT = envNumber('CHAT_OVERFLOW_LIMIT', 20);
const WINDOW_MS = envNumber('CHAT_WINDOW_MINUTES', 30) * 60 * 1000;
const SWEEP_MS = 10 * 60 * 1000;

/**
 * Each provider in the chain gets its own allowance, so spending the primary's
 * moves traffic to the next one rather than cutting the visitor off. Only the
 * first tier uses the headline limit; the overflow gets its own.
 */
function limitFor(tier) {
  return tier === 0 ? LIMIT : OVERFLOW_LIMIT;
}

/** @type {Map<string, number[]>} "caller|tier" → timestamps of recent questions */
const hits = new Map();

const slot = (caller, tier) => `${caller}|${tier}`;

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
export function peek(caller, tier = 0, now = Date.now()) {
  const timestamps = prune(hits.get(slot(caller, tier)) || [], now);
  const limit = limitFor(tier);

  return {
    tier,
    limit,
    used: timestamps.length,
    remaining: Math.max(0, limit - timestamps.length),
    // When the oldest question ages out, one slot comes back.
    resetAt: timestamps.length >= limit ? timestamps[0] + WINDOW_MS : null,
    windowMinutes: WINDOW_MS / 60000,
  };
}

/** Take one slot in a tier. Returns the state after the attempt. */
export function consume(caller, tier = 0, now = Date.now()) {
  const key = slot(caller, tier);
  const timestamps = prune(hits.get(key) || [], now);

  if (timestamps.length >= limitFor(tier)) {
    hits.set(key, timestamps);
    return { ...peek(caller, tier, now), allowed: false };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { ...peek(caller, tier, now), allowed: true };
}

/** Give a slot back when a request fails before it costs anything. */
export function refund(caller, tier = 0) {
  const key = slot(caller, tier);
  const timestamps = hits.get(key);
  if (!timestamps?.length) return;
  timestamps.pop();
  if (timestamps.length) hits.set(key, timestamps);
  else hits.delete(key);
}

/** What the visitor has left across every tier — what the UI counts down. */
export function overall(caller, tiers, now = Date.now()) {
  const perTier = Array.from({ length: Math.max(tiers, 1) }, (_, tier) => peek(caller, tier, now));
  const remaining = perTier.reduce((total, item) => total + item.remaining, 0);
  const limit = perTier.reduce((total, item) => total + item.limit, 0);
  const resets = perTier.map((item) => item.resetAt).filter(Boolean);

  return {
    limit,
    remaining,
    used: limit - remaining,
    resetAt: remaining === 0 && resets.length ? Math.min(...resets) : null,
    windowMinutes: WINDOW_MS / 60000,
    tiers: perTier,
  };
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

export const QUOTA = { LIMIT, OVERFLOW_LIMIT, WINDOW_MS };
