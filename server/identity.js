/**
 * Where a request came from.
 *
 * This was a per-browser identity once, signed into a cookie, because the chat
 * allowance had to be shared fairly in a room where thirty students sit behind
 * one router. There is no allowance any more, and the one thing left that needs
 * to know who is asking — the translator's report log — deliberately wants the
 * address rather than the browser: a cookie is something a client can decline
 * to send, which is no limit at all on a file that grows.
 */

/** Behind a proxy the socket address is the proxy's; only trust the header when told to. */
const TRUST_PROXY = /^(1|true|yes)$/i.test(process.env.TRUST_PROXY || '');

export function addressOf(req) {
  if (TRUST_PROXY) {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}
