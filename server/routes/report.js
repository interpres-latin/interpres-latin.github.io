import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { ROOT } from '../env.js';
import { addressOf } from '../identity.js';

export const router = Router();

/**
 * Words the translator could not turn into Latin, reported by the reader.
 *
 * The translator used to strike these through and leave it at that, which tells
 * a student their sentence is wrong without giving anyone a way to fix it. A
 * word it does not know is a gap in the lexicon, and the person who found the
 * gap is the one best placed to say so — so the strike-through is gone and this
 * is what replaces it.
 *
 * A plain text file rather than a database, deliberately. The whole point is
 * that somebody reads it and adds the words: a file that can be opened, sorted
 * and grepped is exactly the right shape for a list a human works through, and
 * it needs no service to be running for a report to survive.
 */
const LOG_DIR = process.env.REPORT_LOG_DIR || path.join(ROOT, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'reports.txt');

/**
 * What can be wrong with a translation, as the reader sees it.
 *
 * A free-text box alone produces a log nobody can sort. These are the five
 * shapes a complaint actually takes, and having them on the record means the
 * log can be read as "eleven wrong-word reports and one formatting one" rather
 * than as twelve paragraphs.
 *
 * Anything not on this list is filed as `other`, which is also what the reader
 * is offered when none of the rest fits.
 */
const REASONS = new Set(['untranslated', 'formatting', 'wrong-word', 'wrong-grammar', 'other']);

const MAX_FIELD = 500;
const MAX_NOTE = 1000;
const MAX_WORDS = 30;

/**
 * The working behind the sentence, for the reports where it is the point.
 *
 * "Wrong grammar" on a Latin→English translation is not diagnosable from the
 * two sentences alone: what went wrong is almost always a word the parser
 * misread, and that is in the breakdown rather than in the output. The record
 * carries it so an entry stands on its own, which is the whole reason the
 * source and the translation are in there too.
 */
const MAX_BREAKDOWN = 40;

/**
 * A report costs nothing to send, which is exactly why it needs a limit: the
 * button sits next to a translator anyone can use, and an append-only file is
 * the easiest thing in the world to fill up.
 *
 * Keyed on the address rather than on the browser identity the rest of the site
 * uses. That identity lives in a cookie, and a client that simply declines to
 * send one back is a new visitor on every request — which is a fine way to
 * count questions honestly asked, and no limit at all on the one thing here
 * that has to be protected, a file on disk. A classroom shares an address and
 * so shares this allowance; ten reports a minute is more than a room of
 * twenty-five will ever legitimately need.
 */
const WINDOW_MS = 60_000;
const PER_WINDOW = 10;
const seen = new Map();

function allowed(caller) {
  const now = Date.now();
  const recent = (seen.get(caller) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= PER_WINDOW) { seen.set(caller, recent); return false; }
  recent.push(now);
  seen.set(caller, recent);

  // The map would otherwise grow one entry per visitor for the life of the
  // process. Anything with nothing left in its window is no longer holding a
  // limit open, so it can go.
  if (seen.size > 500) {
    for (const [key, times] of seen) {
      if (!times.some((at) => now - at < WINDOW_MS)) seen.delete(key);
    }
  }
  return true;
}

/** Newlines would break the one-record-per-block shape the file relies on. */
function clean(value, limit) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

router.post('/', (req, res) => {
  const caller = addressOf(req);
  if (!allowed(caller)) {
    return res.status(429).json({ error: 'Too many reports just now. Try again in a minute.' });
  }

  const reason = REASONS.has(req.body?.reason) ? req.body.reason : 'other';
  const source = clean(req.body?.source, MAX_FIELD);
  const translation = clean(req.body?.translation, MAX_FIELD);
  const note = clean(req.body?.note, MAX_NOTE);
  const words = (Array.isArray(req.body?.words) ? req.body.words : [])
    .slice(0, MAX_WORDS)
    .map((word) => clean(word, 60))
    .filter(Boolean);

  // Every word with its meaning and its grammar, as the page showed it.
  const breakdown = (Array.isArray(req.body?.breakdown) ? req.body.breakdown : [])
    .slice(0, MAX_BREAKDOWN)
    .map((line) => clean(line, 120))
    .filter(Boolean);

  // What the two-reading check made of the sentence.
  const check = clean(req.body?.check, 120);

  // A report with neither a sentence nor a word in it says nothing at all.
  if (!source && !words.length) {
    return res.status(400).json({ error: 'Nothing to report.' });
  }

  const record = [
    `--- ${new Date().toISOString()}`,
    `reason: ${reason}`,
    `direction: ${req.body?.from === 'la' ? 'la→en' : 'en→la'}`,
    `words: ${words.join(', ') || '(none flagged)'}`,
    `source: ${source}`,
    `translation: ${translation}`,
    check ? `check: ${check}` : null,
    note ? `note: ${note}` : null,
    ...(breakdown.length ? ['breakdown:', ...breakdown.map((line) => `  ${line}`)] : []),
    '',
  ].filter((line) => line !== null).join('\n');

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `${record}\n`, 'utf8');
  } catch (error) {
    console.error('[report] could not write the log:', error.message);
    return res.status(500).json({ error: 'The report could not be saved.' });
  }

  return res.json({ ok: true });
});
