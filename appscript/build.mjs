#!/usr/bin/env node
/**
 * Builds the Apps Script project in appscript/dist from the same sources the
 * Node server runs. Nothing under server/ or public/ is copied by hand or
 * edited for Apps Script; this script turns them into what Apps Script can
 * load, and appscript/src supplies the parts Apps Script lacks.
 *
 *   dist/server.js      every server module, inside one function (interpres_)
 *   dist/Code.js        the three entry points the browser may call
 *   dist/index.html     the page: markup, styles, every client module, and
 *                       the illustrations inlined as data URIs
 *
 * Apps Script has no modules, so each ES module becomes a function in a small
 * registry. Only the import and export forms this codebase uses are
 * understood; anything else stops the build rather than going out broken.
 *
 * Usage: node appscript/build.mjs   (or npm run appscript:build)
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DIST = path.join(HERE, 'dist');

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// ------------------------------------------------------------- server ----

/** Imports the Apps Script build answers with its own module. */
const SERVER_ALIASES = {
  express: 'appscript/src/modules/express.js',
  'server/providers/anthropic.js': 'appscript/src/modules/anthropic.js',
  'server/throttle.js': 'appscript/src/modules/throttle.js',
};

const cacheMap = (file, name = 'cache') => [
  `const ${name} = new Map();`,
  `const ${name} = persistentMap('${file.replace(/^server\//, '').replace(/\.js$/, '')}:${name}');`,
];

/**
 * Caches that have to outlive a single execution, moved onto CacheService.
 * Each `from` must appear in the file exactly once, so a refactor upstream
 * fails the build instead of quietly turning a persistent cache back into a
 * per-request one. Maps built from the site's own data (latinToCourse,
 * englishToLatin) are rebuilt each time and stay plain Maps.
 */
const SERVER_PATCHES = {
  'server/corpus.js': [cacheMap('server/corpus.js')],
  'server/latin.js': [cacheMap('server/latin.js')],
  'server/speech.js': [cacheMap('server/speech.js')],
  'server/routes/dictionary.js': [cacheMap('server/routes/dictionary.js')],
  'server/latin-lexicon.js': [
    cacheMap('server/latin-lexicon.js', 'synonymCache'),
    cacheMap('server/latin-lexicon.js', 'adjectiveCache'),
    cacheMap('server/latin-lexicon.js', 'wiktionaryCache'),
    cacheMap('server/latin-lexicon.js', 'definitionCache'),
    cacheMap('server/latin-lexicon.js', 'latinGlosses'),
    cacheMap('server/latin-lexicon.js', 'nounPartsCache'),
  ],
};

/** The routers are loaded lazily by app.js, so they are named here rather than imported. */
const SERVER_ENTRIES = [
  'appscript/src/modules/app.js',
  'server/routes/dictionary.js',
  'server/routes/speak.js',
];

// ------------------------------------------------------------- bundler ----

const IMPORT = /^import\s+([\s\S]*?)\s+from\s+'([^']+)';?[ \t]*$/gm;
const EXPORT_DECLARATION = /^export\s+(async\s+function\s*\*?|function\s*\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_LIST = /^export\s*\{([^}]*)\};?[ \t]*$/gm;

function resolve(specifier, importer, aliases) {
  let id = specifier;
  if (specifier.startsWith('.')) {
    id = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  }
  // An alias may import the module it replaces; that import is the real one.
  const alias = aliases[id];
  if (alias && alias !== importer) return alias;
  if (!specifier.startsWith('.') && !alias) throw new Error(`${importer}: no Apps Script module for '${specifier}'`);
  return id;
}

function names(list, file) {
  return list.split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
    const match = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(part);
    if (!match) throw new Error(`${file}: cannot read '${part}'`);
    return { from: match[1], to: match[2] || match[1] };
  });
}

function bindings(clause, holder, file) {
  const namespace = /^\*\s+as\s+([A-Za-z_$][\w$]*)$/.exec(clause);
  if (namespace) return `const ${namespace[1]} = ${holder};`;

  const match = /^(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([\s\S]*)\})?$/.exec(clause);
  if (!match || (!match[1] && match[2] === undefined)) throw new Error(`${file}: cannot read import '${clause}'`);
  const out = [];
  if (match[1]) out.push(`const ${match[1]} = ${holder}.default;`);
  if (match[2] !== undefined) {
    const list = names(match[2], file).map(({ from, to }) => (from === to ? from : `${from}: ${to}`));
    if (list.length) out.push(`const { ${list.join(', ')} } = ${holder};`);
  }
  return out.join(' ');
}

/** One ES module → one registry entry, plus the ids it depends on. */
function convert(id, source, { aliases, patches }) {
  let code = source;
  for (const [from, to] of patches[id] || []) {
    const count = code.split(from).length - 1;
    if (count !== 1) throw new Error(`${id}: expected '${from}' exactly once, found it ${count} times`);
    code = code.replace(from, to);
  }
  if (code.includes('import.meta')) throw new Error(`${id}: import.meta has no meaning in Apps Script`);

  const deps = [];
  let counter = 0;
  code = code.replace(IMPORT, (_all, clause, specifier) => {
    const dep = resolve(specifier, id, aliases);
    deps.push(dep);
    const holder = `__import${counter += 1}`;
    return `const ${holder} = __require(${JSON.stringify(dep)}); ${bindings(clause.trim(), holder, id)}`;
  });

  const exported = [];
  code = code.replace(EXPORT_DECLARATION, (_all, kind, name) => {
    exported.push({ from: name, to: name });
    return `${kind.replace(/\s*\*$/, '*')} ${name}`;
  });
  code = code.replace(EXPORT_LIST, (_all, list) => {
    exported.push(...names(list, id));
    return '';
  });

  const leftover = /^\s*(?:import\s|export\s)/m.exec(code);
  if (leftover) {
    const line = code.slice(0, leftover.index).split('\n').length;
    throw new Error(`${id}:${line}: unsupported import or export form`);
  }

  // Getters first, so a module caught mid-load in a cycle still exposes its
  // (hoisted) functions, and every export stays a live binding.
  const getters = exported
    .map(({ from, to }) => `  Object.defineProperty(exports, ${JSON.stringify(to)}, { enumerable: true, get: () => ${from} });`)
    .join('\n');

  return {
    deps,
    code: `__define(${JSON.stringify(id)}, function (exports) {\n'use strict';\n${getters}\n${code}\n});\n`,
  };
}

function bundle(entries, options = { aliases: {}, patches: {} }) {
  const seen = new Map();
  const visit = (id) => {
    if (seen.has(id)) return;
    seen.set(id, null);
    const converted = convert(id, read(id), options);
    seen.set(id, converted);
    converted.deps.forEach(visit);
  };
  entries.forEach(visit);

  const registry = `const __modules = {};
const __loaded = {};
function __define(id, factory) { __modules[id] = factory; }
function __require(id) {
  if (__loaded[id]) return __loaded[id];
  const factory = __modules[id];
  if (!factory) throw new Error('Module not bundled: ' + id);
  const exports = {};
  __loaded[id] = exports;
  factory(exports);
  return exports;
}
`;
  return { ids: [...seen.keys()], code: registry + [...seen.values()].map((module) => module.code).join('\n') };
}

/** Apps Script's V8 is not always the newest; numeric separators are the one newer syntax the server uses. */
function downlevel(code) {
  return code.replace(/(?<![\w$.])(\d+(?:_\d+)+)(?![\w$])/g, (literal) => literal.replace(/_/g, ''));
}

/** Index of the bracket closing the one at `open`, skipping strings and comments. */
function matching(code, open) {
  const pairs = { '(': ')', '{': '}', '[': ']' };
  const stack = [];
  for (let i = open; i < code.length; i += 1) {
    const char = code[i];
    if (char === '/' && code[i + 1] === '/') { i = code.indexOf('\n', i); continue; }
    if (char === '/' && code[i + 1] === '*') { i = code.indexOf('*/', i) + 1; continue; }
    if (char === '"' || char === "'" || char === '`') {
      for (i += 1; code[i] !== char; i += 1) if (code[i] === '\\') i += 1;
      continue;
    }
    if (pairs[char]) stack.push(pairs[char]);
    else if (char === stack.at(-1)) {
      stack.pop();
      if (!stack.length) return i;
    }
  }
  throw new Error(`unbalanced bracket at ${open}`);
}

/**
 * Apps Script refuses async generators at upload — its parser lags the V8 it
 * runs on. The server's few are only ever read with `for await`, and every
 * chunk they read is already in hand (UrlFetchApp returns whole bodies), so
 * each becomes an async function returning the array of what it would have
 * yielded, and each `for await (x of g())` becomes `for (x of await g())`.
 */
function flattenAsyncGenerators(code) {
  let out = code;
  for (let at = out.search(/async function\s*\*/); at !== -1; at = out.search(/async function\s*\*/)) {
    const paramsOpen = out.indexOf('(', at);
    const bodyOpen = out.indexOf('{', matching(out, paramsOpen));
    const bodyClose = matching(out, bodyOpen);
    const body = out.slice(bodyOpen + 1, bodyClose)
      .replace(/\byield\s+([^;]+);/g, '__yielded.push($1);')
      .replace(/\breturn;/g, 'return __yielded;');
    if (/\byield\b/.test(body)) throw new Error('an async generator yields in a form the build cannot flatten');
    const head = out.slice(at, bodyOpen).replace(/async function\s*\*\s*/, 'async function ');
    out = `${out.slice(0, at)}${head}{\nconst __yielded = [];${body}return __yielded;\n}${out.slice(bodyClose + 1)}`;
  }

  for (let at = out.search(/for await \(/); at !== -1; at = out.search(/for await \(/)) {
    const open = out.indexOf('(', at);
    const close = matching(out, open);
    const header = /^\(\s*(const|let)\s+([\s\S]+?)\s+of\s+([\s\S]+)\)$/.exec(out.slice(open, close + 1));
    if (!header) throw new Error('a for await loop the build cannot flatten');
    out = `${out.slice(0, at)}for (${header[1]} ${header[2]} of await (${header[3]}))${out.slice(close + 1)}`;
  }
  return out;
}

/** Inside an inline <script>, the only sequence that matters is the one that ends it. */
const inlineSafe = (code) => code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// ---------------------------------------------------------------- page ----

/**
 * Apps Script serves one HTML file and nothing beside it, so every
 * illustration the page, the styles or the views name by path is inlined as a
 * data URI. The art is a few kilobytes of SVG each.
 */
function inlineArt(text) {
  const dir = path.join(ROOT, 'public/assets/art');
  const used = new Set();
  const out = text.replace(/\/assets\/art\/([\w-]+)\.svg/g, (_all, name) => {
    const file = path.join(dir, `${name}.svg`);
    if (!fs.existsSync(file)) throw new Error(`no illustration called ${name}.svg`);
    used.add(name);
    return `data:image/svg+xml;base64,${fs.readFileSync(file).toString('base64')}`;
  });
  if (out.includes('/assets/')) throw new Error('index.html: an asset path was not inlined for Apps Script');
  return { html: out, art: [...used].sort() };
}

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`index.html: could not find ${label}`);
  return text.replace(from, () => to);
}

function page(clientBundle) {
  let html = read('public/index.html');
  html = replaceOnce(html, '<link rel="stylesheet" href="/styles.css" />', `<style>\n${read('public/styles.css')}\n</style>`, 'the stylesheet');
  // doGet sets the favicon; Apps Script ignores one in the page.
  html = replaceOnce(html, '  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />\n', '', 'the favicon');
  html = replaceOnce(html, '  <link rel="apple-touch-icon" href="/favicon.svg" />\n', '', 'the touch icon');

  html = replaceOnce(
    html,
    '<script type="module" src="/js/app.js"></script>',
    [
      '<script>window.__INTERPRES__ = "__INTERPRES_BOOT__";</script>',
      `<script>\n${inlineSafe(read('appscript/src/client.js'))}\n</script>`,
      `<script>\n(function () {\n'use strict';\n${inlineSafe(clientBundle)}\n__require('public/js/app.js');\n})();\n</script>`,
    ].join('\n  '),
    'the app script',
  );
  return inlineArt(html);
}

// ---------------------------------------------------------------- main ----

function check(label, code) {
  try {
    new vm.Script(code, { filename: label });
  } catch (error) {
    throw new Error(`${label} does not parse: ${error.message}`);
  }
}

export function build({ quiet = false } = {}) {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const server = bundle(SERVER_ENTRIES, { aliases: SERVER_ALIASES, patches: SERVER_PATCHES });
  const serverJs = `/**
 * Interpres's server, generated by appscript/build.mjs from server/ and
 * appscript/src/. Do not edit; edit those and rebuild.
 *
 * Everything is inside interpres_() so that none of it can be called from a
 * browser. The trailing underscore keeps interpres_ itself private too.
 */
function interpres_() {
'use strict';
if (interpres_.instance) return interpres_.instance;

${read('appscript/src/shim.js')}

${flattenAsyncGenerators(downlevel(server.code))}
const __load = __require;

interpres_.instance = {
  handle: (request) => __require('appscript/src/modules/app.js').handle(request),
  require: __require,
};
return interpres_.instance;
}
`;
  check('server.js', serverJs);
  if (/async function\s*\*|for await\s*\(/.test(serverJs)) throw new Error('server.js: an async generator survived flattening');

  const client = bundle(['public/js/app.js']);
  check('client bundle', client.code);

  const { html, art } = page(client.code);
  for (const [index, script] of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries()) {
    check(`index.html script ${index + 1}`, script[1]);
  }

  fs.writeFileSync(path.join(DIST, 'server.js'), serverJs);
  fs.writeFileSync(path.join(DIST, 'Code.js'), read('appscript/src/Code.js'));
  fs.writeFileSync(path.join(DIST, 'index.html'), html);
  fs.copyFileSync(path.join(HERE, 'appsscript.json'), path.join(DIST, 'appsscript.json'));

  if (!quiet) {
    const size = (file) => `${(fs.statSync(path.join(DIST, file)).size / 1024).toFixed(0)} KB`;
    console.log(`appscript/dist ← ${server.ids.length} server modules, ${client.ids.length} client modules`);
    console.log(`  server.js   ${size('server.js')}`);
    console.log(`  index.html  ${size('index.html')} (${art.length} illustrations inlined)`);
  }
  return { dist: DIST, server: server.ids, client: client.ids };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    build();
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exit(1);
  }
}
