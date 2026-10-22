/**
 * The parts of Node and the browser that the server code expects and Apps
 * Script does not have.
 *
 * This file is not loaded on its own. The build pastes it inside the function
 * that holds the whole server bundle, so everything here is a local of that
 * function rather than a global. That matters more than tidiness: every
 * top-level function in an Apps Script project can be called by name from any
 * browser through google.script.run, and a global `fetch` would be an open
 * proxy running on the owner's account.
 *
 * What changes in meaning, rather than just in plumbing:
 *
 *   - Every request is a fresh process. Nothing at module level survives from
 *     one call to the next, so the caches that save repeat lookups (Whitaker's,
 *     Wiktionary, Tatoeba, the spoken clips) are rebuilt on CacheService (see
 *     persistentMap below). CacheService forgets after six hours at most.
 *
 *   - `fetch` is UrlFetchApp, which is synchronous. The returned promise is
 *     already settled, so Promise.all over requests runs them one after
 *     another, and a timeout cannot be shortened below UrlFetchApp's own.
 *
 *   - There is no event loop to run a timer on. A short delay (a retry
 *     backoff) sleeps and then runs; a long one is a watchdog for a request
 *     that has, by the time it could fire, already finished — it never runs.
 */

/* global UrlFetchApp, Utilities, PropertiesService, CacheService */

// ---------------------------------------------------------------- bytes ----

/** Apps Script hands bytes around as signed Java-style arrays. */
function toSigned(bytes) {
  const out = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) out[i] = bytes[i] > 127 ? bytes[i] - 256 : bytes[i];
  return out;
}

function toUnsigned(signed) {
  const out = new Uint8Array(signed.length);
  for (let i = 0; i < signed.length; i += 1) out[i] = signed[i] & 0xff;
  return out;
}

function utf8Encode(text) {
  return toUnsigned(Utilities.newBlob(String(text)).getBytes());
}

function utf8Decode(bytes) {
  if (!bytes || !bytes.length) return '';
  return Utilities.newBlob(toSigned(bytes)).getDataAsString('UTF-8');
}

/** Just enough of Node's Buffer for speech.js and for sending audio back. */
class Buffer extends Uint8Array {
  static from(value, encoding) {
    if (value instanceof ArrayBuffer) return new Buffer(value.slice(0));
    if (ArrayBuffer.isView(value)) return new Buffer(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    if (Array.isArray(value)) return new Buffer(value.map((byte) => byte & 0xff));
    const text = String(value);
    if (encoding === 'base64' || encoding === 'base64url') {
      return new Buffer(toUnsigned(Utilities.base64Decode(text.replace(/-/g, '+').replace(/_/g, '/'))).buffer);
    }
    if (encoding === 'hex') {
      const out = new Buffer(text.length >> 1);
      for (let i = 0; i < out.length; i += 1) out[i] = parseInt(text.substr(i * 2, 2), 16);
      return out;
    }
    return new Buffer(utf8Encode(text).buffer);
  }

  static isBuffer(value) { return value instanceof Buffer; }

  static concat(list) {
    const out = new Buffer(list.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of list) { out.set(part, offset); offset += part.length; }
    return out;
  }

  toString(encoding = 'utf8') {
    if (encoding === 'base64') return Utilities.base64Encode(toSigned(this));
    if (encoding === 'base64url') return Utilities.base64EncodeWebSafe(toSigned(this)).replace(/=+$/, '');
    if (encoding === 'hex') return Array.from(this, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return utf8Decode(this);
  }

  /** So a cached clip survives the trip through JSON. See revive(). */
  toJSON() { return { __buffer: this.toString('base64') }; }
}

class TextDecoder {
  decode(bytes) { return bytes ? utf8Decode(bytes) : ''; }
}

class TextEncoder {
  encode(text) { return utf8Encode(text); }
}

// ------------------------------------------------------------------ env ----

let envCache = null;

/**
 * Script properties stand in for the .env file. Project Settings → Script
 * properties in the editor, one row per variable (GROQ_API_KEY,
 * ELEVENLABS_API_KEY, and so on, as in .env.example).
 */
function loadEnv() {
  if (envCache) return envCache;
  envCache = PropertiesService.getScriptProperties().getProperties();
  return envCache;
}

const process = {
  get env() { return loadEnv(); },
  platform: 'apps-script',
  versions: {},
  exit() {},
  on() {},
};

// --------------------------------------------------------------- timers ----

/** Longest delay that is honoured by sleeping. See the header. */
const SLEEP_LIMIT_MS = 5000;

function setTimeout(callback, ms = 0, ...args) {
  if (ms > SLEEP_LIMIT_MS) return 0;
  if (ms > 0) Utilities.sleep(ms);
  callback(...args);
  return 0;
}

function clearTimeout() {}
function setInterval() { return 0; }
function clearInterval() {}

// ---------------------------------------------------------------- abort ----

function makeSignal() {
  return {
    aborted: false,
    reason: undefined,
    addEventListener() {},
    removeEventListener() {},
    throwIfAborted() {},
  };
}

class AbortController {
  constructor() { this.signal = makeSignal(); }
  abort(reason) { this.signal.aborted = true; this.signal.reason = reason; }
}

const AbortSignal = {
  timeout() { return makeSignal(); },
  any() { return makeSignal(); },
};

// ------------------------------------------------------------------ URL ----

function encodeQueryPart(text) {
  return encodeURIComponent(text).replace(/%20/g, '+');
}

function decodeQueryPart(text) {
  try { return decodeURIComponent(text.replace(/\+/g, ' ')); } catch { return text; }
}

class URLSearchParams {
  constructor(init = '') {
    this.list = [];
    if (typeof init === 'string') {
      for (const pair of init.replace(/^\?/, '').split('&')) {
        if (!pair) continue;
        const at = pair.indexOf('=');
        const key = at === -1 ? pair : pair.slice(0, at);
        const value = at === -1 ? '' : pair.slice(at + 1);
        this.list.push([decodeQueryPart(key), decodeQueryPart(value)]);
      }
    } else if (init instanceof URLSearchParams) {
      this.list = init.list.map(([key, value]) => [key, value]);
    } else if (Array.isArray(init)) {
      this.list = init.map(([key, value]) => [String(key), String(value)]);
    } else if (init) {
      this.list = Object.keys(init).map((key) => [key, String(init[key])]);
    }
    this.onChange = null;
  }

  changed() { if (this.onChange) this.onChange(); }
  get(key) { const hit = this.list.find(([name]) => name === key); return hit ? hit[1] : null; }
  getAll(key) { return this.list.filter(([name]) => name === key).map(([, value]) => value); }
  has(key) { return this.list.some(([name]) => name === key); }
  append(key, value) { this.list.push([String(key), String(value)]); this.changed(); }
  delete(key) { this.list = this.list.filter(([name]) => name !== key); this.changed(); }

  set(key, value) {
    const at = this.list.findIndex(([name]) => name === key);
    if (at === -1) this.list.push([String(key), String(value)]);
    else {
      this.list[at] = [String(key), String(value)];
      this.list = this.list.filter(([name], index) => name !== key || index === at);
    }
    this.changed();
  }

  forEach(callback) { for (const [key, value] of this.list) callback(value, key, this); }
  keys() { return this.list.map(([key]) => key)[Symbol.iterator](); }
  values() { return this.list.map(([, value]) => value)[Symbol.iterator](); }
  entries() { return this.list.map((pair) => pair.slice())[Symbol.iterator](); }
  [Symbol.iterator]() { return this.entries(); }
  get size() { return this.list.length; }
  toString() { return this.list.map(([key, value]) => `${encodeQueryPart(key)}=${encodeQueryPart(value)}`).join('&'); }
}

const URL_PATTERN = /^([a-z][a-z0-9+.-]*:)\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i;

/** Absolute http(s) URLs are all the server ever builds. */
class URL {
  constructor(input, base) {
    let text = String(input instanceof URL ? input.href : input);
    if (!URL_PATTERN.test(text) && base !== undefined) {
      const root = new URL(base);
      if (text.startsWith('//')) text = root.protocol + text;
      else if (text.startsWith('/')) text = root.origin + text;
      else if (text.startsWith('?')) text = root.origin + root.pathname + text;
      else text = root.origin + root.pathname.replace(/[^/]*$/, '') + text;
    }
    const match = URL_PATTERN.exec(text);
    if (!match) throw new TypeError(`Invalid URL: ${text}`);
    this.protocol = match[1].toLowerCase();
    this.host = match[2];
    this.pathname = match[3] || '/';
    this.hash = match[5] || '';
    this.searchParams = new URLSearchParams(match[4] || '');
  }

  get hostname() { return this.host.replace(/:\d+$/, ''); }
  get port() { const match = /:(\d+)$/.exec(this.host); return match ? match[1] : ''; }
  get origin() { return `${this.protocol}//${this.host}`; }
  get search() { const query = this.searchParams.toString(); return query ? `?${query}` : ''; }
  set search(value) { this.searchParams = new URLSearchParams(String(value)); }
  get href() { return this.origin + this.pathname + this.search + this.hash; }
  toString() { return this.href; }
  toJSON() { return this.href; }
}

// ---------------------------------------------------------------- fetch ----

class Headers {
  constructor(init = {}) {
    this.map = {};
    const entries = init instanceof Headers ? Object.entries(init.map)
      : Array.isArray(init) ? init : Object.entries(init || {});
    for (const [key, value] of entries) this.map[String(key).toLowerCase()] = String(value);
  }

  get(key) { const value = this.map[String(key).toLowerCase()]; return value === undefined ? null : value; }
  has(key) { return String(key).toLowerCase() in this.map; }
  set(key, value) { this.map[String(key).toLowerCase()] = String(value); }
  forEach(callback) { for (const key of Object.keys(this.map)) callback(this.map[key], key, this); }
  entries() { return Object.entries(this.map)[Symbol.iterator](); }
  [Symbol.iterator]() { return this.entries(); }
}

class Response {
  constructor(bytes, { status = 200, headers = {}, url = '' } = {}) {
    this.bytes = bytes;
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.statusText = '';
    this.headers = new Headers(headers);
    this.url = url;
    this.bodyUsed = false;
    const response = this;
    // The whole body, as one chunk. Enough for every SSE reader here, which
    // only ever needs the events in order, not as they happen.
    this.body = {
      getReader() {
        let sent = false;
        return {
          read() {
            if (sent) return Promise.resolve({ done: true, value: undefined });
            sent = true;
            return Promise.resolve({ done: false, value: response.bytes });
          },
          cancel() { return Promise.resolve(); },
          releaseLock() {},
        };
      },
      cancel() { return Promise.resolve(); },
    };
  }

  text() {
    this.bodyUsed = true;
    return Promise.resolve(utf8Decode(this.bytes));
  }

  json() {
    return this.text().then((text) => JSON.parse(text));
  }

  arrayBuffer() {
    this.bodyUsed = true;
    return Promise.resolve(this.bytes.buffer.slice(this.bytes.byteOffset, this.bytes.byteOffset + this.bytes.byteLength));
  }

  clone() {
    return new Response(this.bytes, { status: this.status, headers: this.headers, url: this.url });
  }
}

/** Headers UrlFetchApp sets itself, or refuses to be given. */
const MANAGED_HEADERS = new Set(['content-type', 'content-length', 'host', 'connection', 'accept-encoding']);

function fetch(input, init = {}) {
  try {
    const url = String(input instanceof URL ? input.href : (input && input.url) || input);
    const headers = new Headers(init.headers);
    const params = {
      method: String(init.method || 'GET').toLowerCase(),
      muteHttpExceptions: true,
      followRedirects: init.redirect !== 'manual',
      headers: {},
    };
    headers.forEach((value, key) => { if (!MANAGED_HEADERS.has(key)) params.headers[key] = value; });

    let body = init.body;
    if (body instanceof URLSearchParams) {
      if (!headers.has('content-type')) headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
      body = body.toString();
    }
    if (body !== undefined && body !== null) {
      params.payload = ArrayBuffer.isView(body) ? toSigned(body) : String(body);
      params.contentType = headers.get('content-type') || 'text/plain;charset=UTF-8';
    }

    const reply = UrlFetchApp.fetch(url, params);
    return Promise.resolve(new Response(toUnsigned(reply.getContent()), {
      status: reply.getResponseCode(),
      headers: reply.getHeaders(),
      url,
    }));
  } catch (error) {
    // fetch rejects with a TypeError on a network failure; keep the message.
    return Promise.reject(Object.assign(new TypeError(error.message), { cause: error }));
  }
}

// ------------------------------------------------------- persistent state ----

const CACHE_TTL_S = 6 * 60 * 60; // CacheService's ceiling
const MISSING = Symbol('missing');

function digest(text) {
  return Buffer.from(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text, Utilities.Charset.UTF_8)).toString('hex');
}

function revive(_key, value) {
  return value && typeof value === 'object' && typeof value.__buffer === 'string'
    ? Buffer.from(value.__buffer, 'base64')
    : value;
}

/**
 * A Map that outlives the request, on CacheService.
 *
 * Swapped in by the build for the module-level Maps that hold caches. Reads are remembered for the rest of the request, so the
 * read-modify-write the modules already do works unchanged; size and
 * iteration only see what this request touched, which is all the eviction
 * code that uses them needs (CacheService evicts on its own).
 *
 * A value over CacheService's 100KB limit is simply not kept — it was a cache.
 */
class PersistentMap {
  constructor(name) {
    this.name = name;
    this.memo = new Map();
    this.store = CacheService.getScriptCache();
    this.generation = this.store.get(`gen:${name}`) || '0';
  }

  slot(key) { return `m:${this.name}:${this.generation}:${digest(JSON.stringify(key))}`; }

  read(key) {
    if (this.memo.has(key)) return this.memo.get(key);
    let value = MISSING;
    try {
      const raw = this.store.get(this.slot(key));
      if (raw !== null) value = JSON.parse(raw, revive);
    } catch {
      value = MISSING;
    }
    this.memo.set(key, value);
    return value;
  }

  get(key) { const value = this.read(key); return value === MISSING ? undefined : value; }
  has(key) { return this.read(key) !== MISSING; }

  set(key, value) {
    this.memo.set(key, value);
    try {
      this.store.put(this.slot(key), JSON.stringify(value), CACHE_TTL_S);
    } catch (error) {
      console.warn(`[cache] ${this.name}: not kept (${error.message})`);
    }
    return this;
  }

  delete(key) {
    const had = this.has(key);
    this.memo.set(key, MISSING);
    try { this.store.remove(this.slot(key)); } catch { /* already gone */ }
    return had;
  }

  /** Moving to a new generation orphans every old entry at once. */
  clear() {
    this.memo.clear();
    this.generation = String(Number(this.generation) + 1);
    this.store.put(`gen:${this.name}`, this.generation, CACHE_TTL_S);
  }

  known() { return [...this.memo].filter(([, value]) => value !== MISSING); }
  get size() { return this.known().length; }
  keys() { return this.known().map(([key]) => key)[Symbol.iterator](); }
  values() { return this.known().map(([, value]) => value)[Symbol.iterator](); }
  entries() { return this.known()[Symbol.iterator](); }
  [Symbol.iterator]() { return this.entries(); }
  forEach(callback) { for (const [key, value] of this.known()) callback(value, key, this); }
}

function persistentMap(name) {
  return new PersistentMap(name);
}

// ------------------------------------------------------- language gaps ----

/**
 * A web API rather than a language feature, so Apps Script lacks it. The Latin
 * decliner, shared with the browser, clones its ending tables with it.
 */
function structuredClone(value, seen = new Map()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (ArrayBuffer.isView(value)) return value.slice();

  let copy;
  if (value instanceof Map) {
    copy = new Map();
    seen.set(value, copy);
    for (const [key, item] of value) copy.set(structuredClone(key, seen), structuredClone(item, seen));
    return copy;
  }
  if (value instanceof Set) {
    copy = new Set();
    seen.set(value, copy);
    for (const item of value) copy.add(structuredClone(item, seen));
    return copy;
  }
  copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const key of Object.keys(value)) copy[key] = structuredClone(value[key], seen);
  return copy;
}

// Newer built-ins the server uses, in case the runtime predates them.
if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', {
    value(index) { const i = Math.trunc(index) || 0; return this[i < 0 ? this.length + i : i]; },
    configurable: true,
    writable: true,
  });
}
if (!String.prototype.at) {
  Object.defineProperty(String.prototype, 'at', {
    value(index) { const i = Math.trunc(index) || 0; return this[i < 0 ? this.length + i : i]; },
    configurable: true,
    writable: true,
  });
}
