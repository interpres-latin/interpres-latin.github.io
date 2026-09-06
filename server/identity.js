/**
 * Who a visitor is, for the purpose of the allowance.
 *
 * Not their IP address. A classroom sits behind one router, so an address
 * identifies the room rather than the student — thirty people would share five
 * questions between them, and the first one to ask would spend everyone's.
 *
 * Each browser gets its own opaque id in a cookie instead. It is signed, so a
 * client cannot mint itself a new identity by inventing one; clearing cookies
 * still earns a fresh allowance, which is the right trade for a classroom —
 * this is about sharing fairly, not about resisting attack.
 *
 * The IP remains a fallback for anything that cannot hold a cookie.
 */

import crypto from 'node:crypto';

const COOKIE = 'profegpt_id';
const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * A stable secret keeps identities across restarts; without one they are
 * regenerated per boot, which simply hands everyone a fresh allowance.
 */
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function sign(id) {
  return crypto.createHmac('sha256', SECRET).update(id).digest('base64url').slice(0, 24);
}

function verify(id, signature) {
  const expected = sign(id);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function readCookie(header, name) {
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

/** Behind a proxy the socket address is the proxy's; only trust the header when told to. */
const TRUST_PROXY = /^(1|true|yes)$/i.test(process.env.TRUST_PROXY || '');

export function addressOf(req) {
  if (TRUST_PROXY) {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * The id this browser is known by, minting and setting one if needed.
 * Falls back to the address when no response is available to set a cookie on.
 */
export function identify(req, res) {
  const raw = readCookie(req.headers?.cookie, COOKIE);
  if (raw) {
    const split = raw.lastIndexOf('.');
    if (split > 0) {
      const id = raw.slice(0, split);
      const signature = raw.slice(split + 1);
      try {
        if (verify(id, signature)) return `b:${id}`;
      } catch {
        // Malformed signature — fall through and issue a fresh identity.
      }
    }
  }

  if (!res || typeof res.cookie !== 'function') return `ip:${addressOf(req)}`;

  const id = crypto.randomUUID();
  res.cookie(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
    secure: process.env.NODE_ENV === 'production',
  });
  return `b:${id}`;
}
