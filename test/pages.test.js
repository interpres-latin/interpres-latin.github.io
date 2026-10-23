/**
 * The GitHub Pages build: public/ at the root of interpres-latin.github.io, talking
 * to Apps Script. Built into a scratch directory and checked as files.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, ROUTES } from '../scripts/build-pages.mjs';

let passed = 0;
function test(name, run) {
  try {
    run();
    passed += 1;
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const config = { api: 'https://script.google.com/macros/s/TEST/exec' };
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'interpres-pages-'));
build({ out, config, quiet: true });
const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');

test('the API client runs before the app, with the Apps Script address', () => {
  const settings = html.indexOf('window.__INTERPRES_PAGES__');
  const client = html.indexOf('window.fetch = function');
  const app = html.indexOf('<script type="module" src="/js/app.js">');
  assert.ok(settings > 0 && client > settings && app > client);
  assert.ok(html.includes(config.api));
});

test('every route answers with the app, and so does a missing page', () => {
  for (const name of ['404', ...ROUTES]) {
    assert.equal(fs.readFileSync(path.join(out, `${name}.html`), 'utf8'), html, name);
  }
});

test('Jekyll is switched off, and the styles, scripts and drawings are shipped', () => {
  assert.ok(fs.existsSync(path.join(out, '.nojekyll')));
  for (const file of ['styles.css', 'favicon.svg', 'js/app.js', 'assets/art/logo.svg', 'assets/art/colosseum.svg']) {
    assert.ok(fs.existsSync(path.join(out, file)), file);
  }
});

test('no server code and no key is in the site', () => {
  const files = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .forEach((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : files.push(path.join(dir, entry.name))));
  walk(out);
  assert.ok(!files.some((file) => file.includes(`${path.sep}server${path.sep}`) || file.endsWith('.env')));
  for (const file of files.filter((name) => /\.(?:js|html|css|json)$/.test(name))) {
    assert.ok(!/sk_[a-f0-9]{20,}|sk-ant-|gsk_\w{20,}|AIza[\w-]{30,}/.test(fs.readFileSync(file, 'utf8')), file);
  }
});

fs.rmSync(out, { recursive: true, force: true });
console.log(`✓ all ${passed} Pages checks passed`);
