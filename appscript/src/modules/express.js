/**
 * The slice of Express the routes use, without a server under it.
 *
 * On Render a route answers an HTTP request. Here it answers a google.script.run
 * call, so `req` is built from the call's arguments and `res` records what the
 * route did, to be handed back to the browser in one piece. The routes
 * themselves are the same files, unchanged.
 */

/** Express is not strict about a trailing slash, and neither are the routes. */
const normalise = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path) || '/';

export function Router() {
  const routes = [];
  const add = (method) => (path, ...handlers) => {
    if (path.includes(':')) throw new Error(`Route parameters are not supported here: ${path}`);
    routes.push({ method, path: normalise(path), handlers });
    return router;
  };

  const router = {
    get: add('GET'),
    post: add('POST'),

    /** Resolves true once a route has run, false if none matched. */
    async handle(req, res) {
      const path = normalise(req.path);
      const method = req.method === 'HEAD' ? 'GET' : req.method;
      const route = routes.find((candidate) => candidate.method === method && candidate.path === path);
      if (!route) return false;

      for (const handler of route.handlers) {
        let next = false;
        await handler(req, res, (error) => {
          if (error) throw error;
          next = true;
        });
        if (!next) break;
      }
      return true;
    },
  };
  return router;
}

/** What a route did to its response, ready to be sent back over google.script.run. */
export class Recorder {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.chunks = [];
    this.cookies = [];
    this.finished = false;
    this.headersSent = false;
    this.listeners = {};
  }

  status(code) { this.statusCode = code; return this; }
  setHeader(name, value) { this.headers[String(name).toLowerCase()] = String(value); return this; }
  set(name, value) { return this.setHeader(name, value); }
  getHeader(name) { return this.headers[String(name).toLowerCase()]; }
  type(value) { return this.setHeader('content-type', value); }

  writeHead(code, headers = {}) {
    this.statusCode = code;
    for (const [name, value] of Object.entries(headers)) this.setHeader(name, value);
    this.headersSent = true;
    return this;
  }

  write(chunk) {
    this.headersSent = true;
    this.chunks.push(chunk);
    return true;
  }

  end(chunk) {
    if (this.finished) return this;
    if (chunk !== undefined && chunk !== null) this.chunks.push(chunk);
    this.finished = true;
    this.headersSent = true;
    this.emit('finish');
    this.emit('close');
    return this;
  }

  json(value) {
    if (!this.getHeader('content-type')) this.setHeader('content-type', 'application/json; charset=utf-8');
    return this.end(JSON.stringify(value));
  }

  send(value) {
    if (value !== null && typeof value === 'object' && !ArrayBuffer.isView(value)) return this.json(value);
    return this.end(value);
  }

  /** Becomes an entry in the browser's cookie jar. See src/client.js. */
  cookie(name, value, options = {}) {
    this.cookies.push({ name, value: String(value), maxAge: options.maxAge ?? null });
    return this;
  }

  on(event, listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
    return this;
  }
  once(event, listener) { return this.on(event, listener); }
  emit(event) { for (const listener of this.listeners[event] || []) listener(); }

  /**
   * Text goes back as text; anything with a byte in it goes back as base64,
   * since google.script.run only carries plain values.
   */
  serialise() {
    const binary = this.chunks.some((chunk) => ArrayBuffer.isView(chunk));
    const out = { status: this.statusCode, headers: this.headers, cookies: this.cookies };
    if (binary) {
      const parts = this.chunks.map((chunk) => (ArrayBuffer.isView(chunk) ? Buffer.from(chunk) : Buffer.from(String(chunk))));
      out.base64 = Buffer.concat(parts).toString('base64');
    } else {
      out.body = this.chunks.join('');
    }
    return out;
  }
}
