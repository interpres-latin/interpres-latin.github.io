/**
 * Interpres on Google Apps Script — the entry points.
 *
 * Every top-level function in this project without a trailing underscore can
 * be called by any visitor's browser through google.script.run, so there are
 * exactly three: the page, the API, and the API's fallback. Everything else
 * lives inside interpres_(), in the generated server.js.
 *
 * This folder is generated: edit appscript/src/ and run `npm run appscript:build`.
 */

/* global interpres_, HtmlService, CacheService, ScriptApp */

/** Served by jsDelivr from the public repository, since Apps Script has no static files. */
const FAVICON_ = 'https://cdn.jsdelivr.net/gh/yuzhe-chen/interpres@main/public/favicon.svg';

/** The page. Any path or query the visitor arrived with becomes the first route. */
function doGet(e) {
  const parameters = Object.assign({}, (e && e.parameter) || {});
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
