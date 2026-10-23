/**
 * Interpres on Google Apps Script — the entry points.
 *
 * Every top-level function in this project without a trailing underscore can
 * be called by any visitor's browser through google.script.run, so there are
 * exactly four: the page, the API, the API's fallback, and the same API over
 * plain HTTP for the site on GitHub Pages (doPost, with doGet collecting its
 * answers). Everything else lives inside interpres_(), in the generated
 * server.js.
 *
 * This folder is generated: edit appscript/src/ and run `npm run appscript:build`.
 */

/* global interpres_, HtmlService, CacheService, ScriptApp, ContentService, Utilities */

/** Served by jsDelivr from the public repository, since Apps Script has no static files. */
const FAVICON_ = 'https://cdn.jsdelivr.net/gh/yuzhe-chen/interpres@main/public/favicon.svg';

/**
 * The page. Any path or query the visitor arrived with becomes the first route.
 *
 * `?result=<id>` is not a page: it is the second half of doPost, below.
 */
function doGet(e) {
  const parameters = Object.assign({}, (e && e.parameter) || {});
  if (parameters.result !== undefined) return json_(apiResult(parameters.result) || { pending: true });
  const page = String((e && e.pathInfo) || parameters.page || '').replace(/^\/+|\/+$/g, '');
  delete parameters.page;

  const search = Object.keys(parameters)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(parameters[key])}`)
    .join('&');

  const boot = {
    path: `/${page}`,
    search: search ? `?${search}` : '',
    url: ScriptApp.getService().getUrl(),
  };

  // A string, not a comment: HtmlService strips comments from the file before
  // getContent() returns it. `<` is escaped so nothing in a query string can
  // close the script tag.
  const html = HtmlService.createHtmlOutputFromFile('index')
    .getContent()
    .replace('"__INTERPRES_BOOT__"', JSON.stringify(boot).replace(/</g, '\\u003c'));

  const output = HtmlService.createHtmlOutput(html)
    .setTitle('Interpres')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  try {
    output.setFaviconUrl(FAVICON_);
  } catch (error) {
    // The browser's default icon is fine; the page is not.
  }
  return output;
}

/**
 * Everything the browser would have fetched from /api/… on the Node server.
 * See src/client.js for the other half.
 *
 * The handler is asynchronous and the result is a promise. In case the
 * runtime hands the browser the promise rather than what it settles to, the
 * response is also left in the cache under the request's id, where apiResult()
 * can collect it — until the browser reports that it got the real thing.
 */
function api(request) {
  return interpres_().handle(request).then((response) => {
    if (request && request.id && !request.unwrapped) stashResponse_(request.id, response);
    return response;
  });
}

/** The fallback half of api(). Null if there is nothing (yet) under that id. */
function apiResult(id) {
  if (!validId_(id)) return null;
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get(`r:${id}`));
  if (!count) return null;

  const keys = Array.from({ length: count }, (_, index) => `r:${id}:${index}`);
  const parts = cache.getAll(keys);
  if (keys.some((key) => parts[key] === undefined || parts[key] === null)) return null;

  cache.removeAll(keys.concat(`r:${id}`));
  return JSON.parse(keys.map((key) => parts[key]).join(''));
}

/** The only API routes the Pages site may call, as on the Node server. */
const HTTP_ROUTES_ = ['/api/dictionary', '/api/speak', '/api/health'];

function allowedRoute_(url) {
  if (typeof url !== 'string' || url.length > 2048) return false;
  const path = url.split('?')[0];
  return HTTP_ROUTES_.some((route) => path === route || path.indexOf(`${route}/`) === 0);
}

/**
 * The API over plain HTTP, for the copy of the site on GitHub Pages
 * (pages/client.js is the other half).
 *
 * Apps Script does not wait for a promise returned from doPost, so a doPost
 * that returned the handler's promise would hand back nothing. So this
 * starts the request and answers at once with an id; the handler settles a
 * moment later (everything it awaits is already synchronous here) and
 * leaves its response in the cache, where `doGet(?result=id)` collects it.
 * The same stash api() falls back on.
 *
 * The body is JSON sent as text/plain, which keeps the browser's request
 * "simple": no preflight, which Apps Script cannot answer. Its responses are
 * served from googleusercontent.com with CORS open to every origin.
 */
function doPost(e) {
  let request = null;
  try {
    const contents = (e && e.postData && e.postData.contents) || 'null';
    request = contents.length > 300 * 1024 ? null : JSON.parse(contents);
  } catch (error) {
    request = null;
  }
  if (!request || typeof request !== 'object' || !allowedRoute_(request.url)) {
    return json_({ error: 'Expected { method, url: "/api/dictionary…" or "/api/speak…", headers, body }.' });
  }

  const id = Utilities.getUuid().replace(/-/g, '');
  const failed = (error) => ({
    status: 500,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ error: String((error && error.message) || error) }),
  });

  interpres_().handle({
    method: String(request.method || 'GET').toUpperCase(),
    url: request.url,
    headers: request.headers && typeof request.headers === 'object' ? request.headers : {},
    body: typeof request.body === 'string' ? request.body : undefined,
  }).then((response) => stashResponse_(id, response), (error) => stashResponse_(id, failed(error)));

  return json_({ id });
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------

/** CacheService holds at most 100KB a value, so long responses go in pieces. */
const STASH_PIECE_ = 30 * 1024; // characters, so even three bytes each stays under

function stashResponse_(id, response) {
  if (!validId_(id)) return;
  const text = JSON.stringify(response);
  const pieces = {};
  let count = 0;
  for (let offset = 0; offset < text.length; offset += STASH_PIECE_) {
    pieces[`r:${id}:${count}`] = text.slice(offset, offset + STASH_PIECE_);
    count += 1;
  }
  pieces[`r:${id}`] = String(count || 1);
  if (!count) pieces[`r:${id}:0`] = text;

  try {
    CacheService.getScriptCache().putAll(pieces, 120);
  } catch (error) {
    console.warn('[api] could not stash response:', error.message);
  }
}

function validId_(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}
