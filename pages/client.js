/**
 * The browser half of the GitHub Pages build. Runs before the app, so that the
 * app's own code (the same files the Node server serves) finds what it
 * expects:
 *
 *   `fetch('/api/…')` answers. GitHub Pages serves files and nothing else, so
 *   API requests go to the Apps Script web app instead, which runs the same
 *   server code and holds the keys. See doPost in appscript/src/Code.js for
 *   the other half.
 *
 * It takes two requests. The first sends the call and gets an id back at
 * once, because Apps Script will not wait for the server's promise; the second
 * collects the response the server left in its cache under that id. If the
 * answer is not there yet, it asks again after a short pause.
 *
 * The request body is JSON sent as text/plain, so the browser makes a
 * "simple" request with no preflight, which Apps Script cannot answer.
 *
 * Responses come back as real Response objects, so the JSON helpers work
 * unchanged.
 */

(function () {
  const config = window.__INTERPRES_PAGES__ || {};
  const API = config.api;
  if (!API) return;

  const nativeFetch = window.fetch.bind(window);
  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

  function abortError() {
    return new DOMException('The operation was aborted.', 'AbortError');
  }

  function bodyOf(out) {
    if (out.status === 204 || out.status === 304) return null;
    if (typeof out.base64 === 'string') return Uint8Array.from(atob(out.base64), (char) => char.charCodeAt(0));
    return out.body ?? '';
  }

  async function call(path, init) {
    const request = {
      method: init.method || 'GET',
      url: path,
      headers: Object.fromEntries(new Headers(init.headers || {})),
      body: typeof init.body === 'string' ? init.body : undefined,
    };

    const started = await nativeFetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(request),
      redirect: 'follow',
    });
    if (!started.ok) throw new Error(`The server could not be reached (${started.status}).`);
    const { id, error } = await started.json();
    if (!id) throw new Error(error || 'The server did not accept the request.');

    // Usually there on the first try: the handler finishes as the first
    // request does. A cold Apps Script (first request after it has been idle,
    // or just after a redeploy) can take much longer, so keep collecting for
    // up to a minute before giving up.
    const deadline = Date.now() + 60000;
    for (let attempt = 0; attempt === 0 || Date.now() < deadline; attempt += 1) {
      const collected = await nativeFetch(`${API}?result=${encodeURIComponent(id)}`, { redirect: 'follow' });
      if (collected.ok) {
        const out = await collected.json();
        if (out && typeof out.status === 'number') {
          return new Response(bodyOf(out), { status: out.status, headers: out.headers || {} });
        }
      }
      await wait(Math.min(250 * (attempt + 1), 1500));
    }
    throw new Error('The server answered, but its reply was lost.');
  }

  window.fetch = function (input, init = {}) {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const target = new URL(url, window.location.href);
    if (target.origin !== window.location.origin || !target.pathname.startsWith('/api/')) {
      return nativeFetch(input, init);
    }

    const { signal } = init;
    if (signal && signal.aborted) return Promise.reject(abortError());

    // The server call cannot be cancelled, but the caller can stop waiting.
    const answer = call(target.pathname + target.search, init);
    if (!signal) return answer;
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(abortError()), { once: true });
      answer.then(resolve, reject);
    });
  };
})();
