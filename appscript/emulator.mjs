/**
 * Just enough of Apps Script to run the generated project under Node — for the
 * tests, and for `npm run appscript:preview`.
 *
 * Each call gets a fresh, bare V8 context (no fetch, URL, Buffer or timers,
 * as on Apps Script); script properties and the cache persist across calls,
 * as they do there. UrlFetchApp is whatever `urlFetch` is given.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const signed = (buffer) => Array.from(buffer, (byte) => (byte > 127 ? byte - 256 : byte));
const unsigned = (array) => Buffer.from(array.map((byte) => byte & 0xff));

function scriptCache() {
  const store = new Map();
  return {
    get: (key) => (store.has(key) ? store.get(key) : null),
    getAll: (keys) => Object.fromEntries(keys.filter((key) => store.has(key)).map((key) => [key, store.get(key)])),
    put(key, value) {
      if (Buffer.byteLength(value) > 100 * 1024) throw new Error('Argument too large: value');
      store.set(key, value);
    },
    putAll(values) { for (const [key, value] of Object.entries(values)) this.put(key, value); },
    remove: (key) => store.delete(key),
    removeAll: (keys) => keys.forEach((key) => store.delete(key)),
  };
}

/** A UrlFetchApp reply from plain parts. */
export function reply({ status = 200, headers = {}, body = '' }) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  return {
    getResponseCode: () => status,
    getHeaders: () => headers,
    getContent: () => signed(bytes),
  };
}

/**
 * @param {object} options
 * @param {string} options.dist           the built project
 * @param {object} [options.properties]   script properties
 * @param {(url: string, params: object) => object} options.urlFetch  returns a reply()
 * @param {object} [options.console]
 */
export function project({ dist, properties = {}, urlFetch, console: log = { log() {}, warn() {}, error() {} } }) {
  const props = { ...properties };
  const cache = scriptCache();
  const requests = [];
  const file = (name) => fs.readFileSync(path.join(dist, `${name}.html`), 'utf8');

  const services = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({ ...props }),
        setProperty: (key, value) => { props[key] = String(value); },
      }),
    },
    CacheService: { getScriptCache: () => cache },
    UrlFetchApp: {
      fetch(url, params = {}) {
        requests.push({ url, params });
        return urlFetch(url, params);
      },
    },
    Utilities: {
      sleep() {},
      getUuid: () => crypto.randomUUID(),
      newBlob: (data) => ({
        getBytes: () => signed(Buffer.from(String(data), 'utf8')),
        getDataAsString: () => unsigned(data).toString('utf8'),
      }),
      base64Encode: (data) => unsigned(data).toString('base64'),
      base64EncodeWebSafe: (data) => unsigned(data).toString('base64url'),
      base64Decode: (text) => signed(Buffer.from(text, 'base64')),
      computeDigest: (algorithm, text) => signed(crypto.createHash(algorithm).update(text, 'utf8').digest()),
      computeHmacSha256Signature: (value, key) => signed(crypto.createHmac('sha256', key).update(value, 'utf8').digest()),
      DigestAlgorithm: { MD5: 'md5', SHA_1: 'sha1', SHA_256: 'sha256', SHA_512: 'sha512' },
      Charset: { UTF_8: 'utf8' },
    },
    HtmlService: {
      createHtmlOutputFromFile: (name) => ({ getContent: () => file(name) }),
      createHtmlOutput(html) {
        const output = { html, setTitle: () => output, addMetaTag: () => output, setFaviconUrl: () => output };
        return output;
      },
    },
    ContentService: {
      MimeType: { JSON: 'application/json', TEXT: 'text/plain' },
      createTextOutput(text) {
        const output = {
          text: String(text),
          mimeType: 'text/plain',
          setMimeType(type) { output.mimeType = type; return output; },
          getContent: () => output.text,
        };
        return output;
      },
    },
    ScriptApp: {
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/EMULATED/exec' }),
      getOAuthToken: () => 'emulated-oauth-token',
    },
  };

  const code = ['server.js', 'Code.js'].map((name) => fs.readFileSync(path.join(dist, name), 'utf8'));

  /** A fresh execution, as each google.script.run call is. */
  function execution() {
    const context = vm.createContext({ console: log, ...services });
    for (const source of code) vm.runInContext(source, context);
    return context;
  }

  return { props, cache, requests, execution };
}
