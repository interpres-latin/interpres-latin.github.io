/**
 * server/index.js, for Apps Script: one google.script.run call in, one
 * response out.
 *
 * The routers are loaded only when a request is for them. An execution serves
 * a single request and then the process is gone, so loading a router a
 * request does not need would be work thrown away every time.
 */

/* global __load */

import { Recorder } from './express.js';
import { chainInfo, hasProvider, providerInfo } from '../../../server/llm.js';

const MOUNTS = [
  ['/api/dictionary', 'server/routes/dictionary.js'],
];

const MAX_BODY = 256 * 1024; // as express.json({ limit: '256kb' })

function query(search) {
  const out = {};
  for (const [key, value] of new URLSearchParams(search)) {
    if (!(key in out)) out[key] = value;
    else out[key] = [].concat(out[key], value);
  }
  return out;
}

function lowerKeys(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) out[key.toLowerCase()] = String(value);
  return out;
}

function fail(status, error) {
  const res = new Recorder();
  return res.status(status).json({ error }).serialise();
}

/**
 * @param {{method?: string, url: string, headers?: object, body?: string}} request
 *   what the browser's fetch would have sent
 */
export async function handle(request) {
  const method = String(request?.method || 'GET').toUpperCase();
  const url = String(request?.url || '/');
  const at = url.indexOf('?');
  const path = at === -1 ? url : url.slice(0, at);
  const headers = lowerKeys(request?.headers);

  if (path === '/api/health') {
    const res = new Recorder();
    return res.json({ ok: true, ai: hasProvider(), provider: providerInfo(), chain: chainInfo(), runtime: 'apps-script' })
      .serialise();
  }

  const mount = MOUNTS.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  if (!mount) return fail(404, 'Not found.');

  let body = {};
  if (typeof request.body === 'string' && request.body) {
    if (request.body.length > MAX_BODY) return fail(413, 'The request is too large.');
    if (/json/i.test(headers['content-type'] || '')) {
      try { body = JSON.parse(request.body); } catch { return fail(400, 'Invalid JSON.'); }
    }
  }

  const req = {
    method,
    url: url.slice(mount[0].length) || '/',
    originalUrl: url,
    baseUrl: mount[0],
    path: path.slice(mount[0].length) || '/',
    query: query(at === -1 ? '' : url.slice(at + 1)),
    headers,
    body,
    socket: { remoteAddress: 'apps-script' },
    get(name) { return headers[String(name).toLowerCase()]; },
  };
  const res = new Recorder();

  try {
    const handled = await __load(mount[1]).router.handle(req, res);
    if (!handled) return fail(404, 'Not found.');
    if (!res.finished) res.end();
  } catch (error) {
    // As the error handler at the bottom of server/index.js.
    console.error('[server]', error);
    if (res.headersSent) {
      res.end();
    } else {
      return fail(error.status || 500, error.message || 'Internal server error.');
    }
  }
  return res.serialise();
}
