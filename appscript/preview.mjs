#!/usr/bin/env node
/**
 * The Apps Script build, served locally, before it goes anywhere near Google.
 *
 * The page is the built index.html. google.script.run is a small stand-in that
 * posts to this server, which runs the call in appscript/emulator.mjs — the
 * generated server code in a bare V8 context, with curl as UrlFetchApp, so the
 * dictionaries, translators and models are the real ones. Script properties
 * are read from .env, as the Node server reads them.
 *
 *   npm run appscript:preview                    http://localhost:4100
 *   npm run appscript:preview -- --no-unwrap     as if the runtime handed the
 *                                                browser a promise, to exercise
 *                                                the apiResult() fallback
 *
 * What it cannot show: the iframe Apps Script puts the page in, and the real
 * runtime's limits. Push and open the deployment for those.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { project, reply } from './emulator.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PREVIEW_PORT) || 4100;
const UNWRAP = !process.argv.includes('--no-unwrap');

function readEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match || !match[2].trim()) continue;
    out[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/** UrlFetchApp is synchronous, so the stand-in is too. */
function curl(url, params) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'interpres-gas-'));
  try {
    const headerFile = path.join(dir, 'headers');
    const bodyFile = path.join(dir, 'body');
    const args = ['-sS', '-X', String(params.method || 'get').toUpperCase(), '-D', headerFile, '-o', bodyFile,
      '-w', '%{http_code}', '--max-time', '60'];
    if (params.followRedirects !== false) args.push('-L');
    for (const [name, value] of Object.entries(params.headers || {})) args.push('-H', `${name}: ${value}`);
    if (params.payload !== undefined) {
      const payloadFile = path.join(dir, 'payload');
      fs.writeFileSync(payloadFile, Array.isArray(params.payload)
        ? Buffer.from(params.payload.map((byte) => byte & 0xff))
        : String(params.payload));
      args.push('-H', `Content-Type: ${params.contentType}`, '--data-binary', `@${payloadFile}`);
    }
    args.push(url);

    let status;
    try {
      status = Number(execFileSync('curl', args, { encoding: 'utf8' }));
    } catch (error) {
      throw new Error(`Address unavailable: ${url} (${String(error.stderr || error.message).trim()})`);
    }

    // After redirects, the last block of headers is the one that counts.
    const blocks = fs.readFileSync(headerFile, 'utf8').split(/\r?\n\r?\n/).filter((block) => block.trim());
    const headers = {};
    for (const line of (blocks.at(-1) || '').split(/\r?\n/).slice(1)) {
      const at = line.indexOf(':');
      if (at > 0) headers[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
    return reply({ status, headers, body: fs.readFileSync(bodyFile) });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** google.script.run and google.script.history, posting to this server. */
const STAND_IN = `<script>
window.google = { script: {
  run: (function make(success, failure) {
    return new Proxy({}, { get(_target, name) {
      if (name === 'withSuccessHandler') return (handler) => make(handler, failure);
      if (name === 'withFailureHandler') return (handler) => make(success, handler);
      return (...args) => {
        fetch('/__gas/' + name, { method: 'POST', body: JSON.stringify(args) })
          .then((response) => response.json())
          .then((out) => {
            if (out.error) { if (failure) failure(new Error(out.error)); }
            else if (success) success(out.result);
          });
      };
    } });
  })(),
  history: { push() {}, replace() {}, setChangeHandler() {} },
} };
</script>`;

const { dist } = build();
const app = project({
  dist,
  properties: readEnv(),
  urlFetch: curl,
  console: {
    log: (...args) => console.log('  [gas]', ...args),
    warn: (...args) => console.warn('  [gas]', ...args),
    error: (...args) => console.error('  [gas]', ...args),
  },
});

async function run(name, args) {
  const context = app.execution();
  if (typeof context[name] !== 'function' || name.endsWith('_')) throw new Error(`Script function not found: ${name}`);
  const result = context[name](...args);
  if (result && typeof result.then === 'function') {
    const settled = await result;
    // Promises do not survive google.script.run in this mode; apiResult() has the answer.
    return UNWRAP ? settled : null;
  }
  return result;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'POST' && url.pathname.startsWith('/__gas/')) {
    let body = '';
    for await (const chunk of req) body += chunk;
    const name = url.pathname.slice('/__gas/'.length);
    const started = Date.now();
    try {
      const result = await run(name, JSON.parse(body || '[]'));
      const label = name === 'api' ? `${JSON.parse(body)[0]?.method || 'GET'} ${JSON.parse(body)[0]?.url}` : name;
      console.log(`${label} → ${result?.status ?? 'ok'} (${Date.now() - started} ms)`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result: result ?? null }));
    } catch (error) {
      console.error(`${name} failed:`, error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  if (req.method !== 'GET' || url.pathname === '/favicon.ico') {
    res.writeHead(404);
    res.end();
    return;
  }

  const output = app.execution().doGet({
    pathInfo: url.pathname.replace(/^\/+/, ''),
    parameter: Object.fromEntries(url.searchParams),
  });
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(output.html.replace('<head>', `<head>\n${STAND_IN}`));
});

server.listen(PORT, () => {
  console.log(`Apps Script preview → http://localhost:${PORT}${UNWRAP ? '' : '  (promises not unwrapped)'}`);
});
