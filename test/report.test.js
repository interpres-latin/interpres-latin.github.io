/**
 * The report button's other end.
 *
 * A reader who hits a word the translator cannot turn into Latin can say so,
 * and what they say has to land somewhere a person will read it. These check
 * the three things that can go wrong with that: the record never arrives, it
 * arrives in a shape nothing can parse, or it arrives so often that the file is
 * useless.
 *
 * The router is mounted on a real express app, since that is the only way to
 * exercise the body parsing and the status codes it actually returns.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import express from 'express';

let checked = 0;
const failures = [];
function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

// The log goes to a throwaway directory rather than the project's own, which
// is what REPORT_LOG_DIR is for in a deployment too — Render mounts its disk
// somewhere other than the checkout.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'interpres-report-'));
process.env.REPORT_LOG_DIR = root;
const LOG = path.join(root, 'reports.txt');

const { router } = await import('../server/routes/report.js');

const app = express();
app.use(express.json());
app.use('/api/report', router);

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/report`;

const post = (body, headers = {}) => fetch(base, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

const read = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : '');
const before = read();

// --- a report is recorded --------------------------------------------------
let response = await post({
  source: 'the bicycle is broken',
  translation: 'bicycle fractus est',
  from: 'en',
  words: ['bicycle'],
  note: 'no Latin for bicycle',
});
ok('a report is accepted', response.status === 200, String(response.status));

let log = read().slice(before.length);
ok('and reaches the file', log.includes('bicycle'), log);
ok('with the word that failed', /^words: bicycle$/m.test(log), log);
ok('and the sentence it came from', /^source: the bicycle is broken$/m.test(log), log);
ok('and the reader\'s note', /^note: no Latin for bicycle$/m.test(log), log);
ok('and which way round it was going', /^direction: en→la$/m.test(log), log);
ok('and when', /^--- \d{4}-\d{2}-\d{2}T/m.test(log), log);

// --- the working, for the reports where the two sentences are not enough ----
//
// "Wrong grammar" is rarely diagnosable from the input and the output alone:
// what went wrong is usually one word the parser misread.
const workingMark = read().length;
await post({
  reason: 'wrong-grammar', from: 'la', source: 'Arma virumque cano',
  translation: 'I sing of arms and the man',
  check: 'differs (DIFFERENT), repaired',
  breakdown: ['Arma — arms [nom. pl.]', 'virumque — venom + "and" [gen. pl.]'],
});
const working = read().slice(workingMark);
ok('the check verdict is recorded', /^check: differs \(DIFFERENT\), repaired$/m.test(working), working);
ok('and the word-by-word breakdown', /^breakdown:$/m.test(working), working);
ok('indented under it, one word per line',
  /^ {2}virumque — venom \+ "and" \[gen\. pl\.\]$/m.test(working), working);
ok('and a report without one carries no empty heading',
  !/^breakdown:$/m.test(log), log);

// --- the other direction is recorded as such -------------------------------
const mark = read().length;
await post({ source: 'canis latrat', translation: 'the dog barks', from: 'la', words: ['latrat'] });
ok('a Latin-to-English report says so', /^direction: la→en$/m.test(read().slice(mark)), read().slice(mark));

// --- a report with nothing in it is refused --------------------------------
response = await post({ note: 'just complaining' });
ok('an empty report is refused', response.status === 400, String(response.status));

// --- newlines cannot break the record shape --------------------------------
//
// The file is read one block per report. A note carrying its own newlines could
// otherwise forge a second record, or a field that was never sent.
const injectionMark = read().length;
await post({
  source: 'a\nsource: forged\nnote',
  words: ['x'],
  note: 'line one\n--- 1999-01-01T00:00:00.000Z\ndirection: forged',
});
const injected = read().slice(injectionMark);
ok('newlines in a field are flattened',
  (injected.match(/^--- /gm) || []).length === 1, injected);
ok('and cannot forge a second field',
  (injected.match(/^source: /gm) || []).length === 1, injected);
ok('and cannot forge a direction',
  !/^direction: forged$/m.test(injected), injected);

// --- long fields are cut ---------------------------------------------------
const longMark = read().length;
await post({ source: 'x'.repeat(4000), words: ['y'.repeat(400)], note: 'z'.repeat(4000) });
const long = read().slice(longMark);
ok('a very long source is capped', /^source: x{500}$/m.test(long));
ok('a very long note is capped', /^note: z{1000}$/m.test(long));
ok('and a very long word is capped', /^words: y{60}$/m.test(long));

// --- too many, too fast ----------------------------------------------------
//
// The button costs nothing to press, which is exactly why the file needs a
// limit: an append-only text file is the easiest thing in the world to fill.
let refused = 0;
for (let i = 0; i < 20; i += 1) {
  // eslint-disable-next-line no-await-in-loop
  const attempt = await post({ source: `flood ${i}`, words: ['w'] });
  if (attempt.status === 429) refused += 1;
}
ok('a flood is cut off', refused > 0, `${refused} refused of 20`);

server.close();
fs.rmSync(root, { recursive: true, force: true });

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} report checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} report checks passed`);
