#!/usr/bin/env node
/**
 * Builds the GitHub Pages copy of the site into _site/.
 *
 *   node scripts/build-pages.mjs     (or npm run pages:build)
 *
 * GitHub Pages serves files and nothing else, so this is public/ with one
 * change, and the server half runs on the Apps Script web app:
 *
 *   - /api/… goes to the Apps Script web app named in pages/config.json.
 *     pages/client.js is inlined ahead of the app to do that.
 *
 * The site lives at the root of interpres-latin.github.io, so every root-relative
 * path in public/ stays as it is.
 *
 * Every route is a client-side route. Each one, old addresses included, gets
 * its own copy of the page (conjugacion.html is served at /conjugacion), so a
 * direct load answers 200; 404.html is a copy too, for anything else.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/**
 * The app's addresses other than the home page: ROUTES in public/js/app.js,
 * and the old ones in MOVED, which the app redirects itself.
 */
export const ROUTES = ['conjugacion', 'declinationes', 'diccionario', 'stadia', 'chat'];

/** Inside an inline <script>, the only sequence that matters is the one that ends it. */
const inlineSafe = (code) => code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`index.html: could not find ${label}`);
  return text.replace(from, () => to);
}

export function page(config) {
  const settings = JSON.stringify({ api: config.api }).replace(/</g, '\\u003c');
  return replaceOnce(
    read('public/index.html'),
    '<script type="module" src="/js/app.js"></script>',
    [
      `<script>window.__INTERPRES_PAGES__ = ${settings};</script>`,
      `<script>\n${inlineSafe(read('pages/client.js'))}\n</script>`,
      '<script type="module" src="/js/app.js"></script>',
    ].join('\n  '),
    'the app script',
  );
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

export function build({ out = path.join(ROOT, '_site'), config = JSON.parse(read('pages/config.json')), quiet = false } = {}) {
  if (!config.api || !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.api)) {
    throw new Error('pages/config.json needs "api": the Apps Script web app\'s /exec address');
  }

  for (const route of ROUTES) {
    if (!read('public/js/app.js').includes(`'/${route}'`)) throw new Error(`no route /${route} in public/js/app.js`);
  }

  fs.rmSync(out, { recursive: true, force: true });
  copyDir(path.join(ROOT, 'public'), out);

  const html = page(config);
  for (const name of ['index', '404', ...ROUTES]) fs.writeFileSync(path.join(out, `${name}.html`), html);
  // No Jekyll: it would skip files and folders it considers private.
  fs.writeFileSync(path.join(out, '.nojekyll'), '');

  if (!quiet) {
    let count = 0;
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
      .forEach((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : (count += 1)));
    walk(out);
    console.log(`_site ← ${count} files, API at ${new URL(config.api).host}`);
  }
  return { out };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    build();
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exit(1);
  }
}
