/**
 * The browser half of the Apps Script build. Runs before the app, so that the
 * app's own code — the same files the Node server serves — finds what it
 * expects:
 *
 *   - `fetch('/api/…')` answers, through google.script.run instead of HTTP.
 *     Responses come back as real Response objects, so the JSON helpers work
 *     unchanged.
 *
 *   - Routes are paths, as on the Node server. The page lives in an iframe on
 *     another host, so the path is changed in place there and mirrored into
 *     the real address bar as `?page=…`, which is also what doGet() reads when
 *     a link is opened fresh. Back and forward come back through
 *     google.script.history.
 */

/* global google */

(function () {
  const given = window.__INTERPRES__;
  const boot = given && typeof given === 'object' ? given : { path: '/', search: '', url: '' };
  const script = window.google && google.script;

  // ------------------------------------------------------------- server ----

  function call(name, ...args) {
    return new Promise((resolve, reject) => {
      script.run.withSuccessHandler(resolve).withFailureHandler(reject)[name](...args);
    });
  }

  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

  /** Whether the runtime hands back what api() resolves to. See Code.js. */
  let unwrapped = false;

  function requestId() {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function collect(id) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await call('apiResult', id);
      if (result) return result;
      await wait(250 * (attempt + 1));
    }
    throw new Error('The server answered, but its reply was lost.');
  }

  // --------------------------------------------------------------- fetch ----

  const nativeFetch = window.fetch.bind(window);

  function abortError() {
    return new DOMException('The operation was aborted.', 'AbortError');
  }

  function bodyOf(out) {
    if (out.status === 204 || out.status === 304) return null;
    if (typeof out.base64 === 'string') return Uint8Array.from(atob(out.base64), (char) => char.charCodeAt(0));
    return out.body ?? '';
  }

  async function viaServer(target, init) {
    const request = {
      id: requestId(),
      unwrapped,
      method: init.method || 'GET',
      url: target.pathname + target.search,
      headers: Object.fromEntries(new Headers(init.headers || {})),
      body: typeof init.body === 'string' ? init.body : undefined,
    };

    let out = await call('api', request);
    if (out && typeof out.status === 'number') unwrapped = true;
    else out = await collect(request.id);

    return new Response(bodyOf(out), { status: out.status, headers: out.headers || {} });
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
    const answer = viaServer(target, init);
    if (!signal) return answer;
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(abortError()), { once: true });
      answer.then(resolve, reject);
    });
  };

  // ------------------------------------------------------------- routing ----

  const nativeReplace = history.replaceState.bind(history);

  /** `/conjugacion?v=amo#top` → the top window's `?page=conjugacion&v=amo#top`. */
  function toTop(url) {
    const target = new URL(url, window.location.href);
    const parameters = {};
    const page = target.pathname.replace(/^\/+|\/+$/g, '');
    if (page) parameters.page = page;
    target.searchParams.forEach((value, key) => { if (key !== 'page') parameters[key] = value; });
    return { parameters, hash: target.hash.replace(/^#/, '') };
  }

  function fromTop(location) {
    const parameters = Object.assign({}, location.parameter || {});
    const page = parameters.page || '';
    delete parameters.page;
    const search = new URLSearchParams(parameters).toString();
    return `/${page}${search ? `?${search}` : ''}${location.hash ? `#${location.hash}` : ''}`;
  }

  /** A link that works outside this frame, for opening in a new tab. */
  function topUrl(url) {
    const { parameters, hash } = toTop(url);
    const search = new URLSearchParams(parameters).toString();
    return `${boot.url}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`;
  }

  function mirror(kind, url) {
    if (!script || !script.history || url === undefined || url === null) return;
    const { parameters, hash } = toTop(url);
    script.history[kind](null, parameters, hash);
  }

  try { nativeReplace({}, '', boot.path + boot.search); } catch { /* stays on / */ }

  // The frame's own history never grows: the entry belongs to the top window,
  // where the back button is.
  history.pushState = function (state, title, url) {
    nativeReplace(state, title, url);
    mirror('push', url);
  };
  history.replaceState = function (state, title, url) {
    nativeReplace(state, title, url);
    mirror('replace', url);
  };

  // If doGet's route never arrived, the address bar still has it.
  if (given !== boot && script && script.url) {
    script.url.getLocation((location) => {
      const target = fromTop(location);
      if (target === '/') return;
      nativeReplace({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });
  }

  if (script && script.history) {
    script.history.setChangeHandler((event) => {
      nativeReplace(event.state, '', fromTop(event.location));
      window.dispatchEvent(new PopStateEvent('popstate', { state: event.state }));
    });
  }

  // Internal links the app does not route itself would otherwise load the
  // frame's host at that path, which is nothing. Modified clicks open a real
  // address in a new tab instead of a dead one.
  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href.startsWith('/') || href.startsWith('//')) return;

    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      event.preventDefault();
      window.open(topUrl(href), '_blank', 'noopener');
      return;
    }
    if (!link.hasAttribute('data-link') && !link.target) link.setAttribute('data-link', '');
  }, true);
})();
