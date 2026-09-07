/**
 * The teacher's lock.
 *
 * One switch, held on the server, that seals the site for everybody at once.
 * Anyone holding the passcode can throw it either way — that is the point: a
 * teacher locks the room, and unlocks it when the lesson resumes.
 *
 * It lives in memory, so a server restart clears it. That is a deliberate
 * failsafe: nobody can be locked out by a process nobody is watching.
 *
 * The same dialog carries a second passcode, and it works nothing like the
 * lock: it opens **French and Latin for the browser that typed it**, and for
 * nobody else. A visitor gets Spanish and English until they know the word.
 *
 * Per-browser is the whole point. The lock is a switch a teacher throws over a
 * room; this is a key a person is given. One student being shown French must
 * not put French in front of the other twenty-four.
 *
 * So the server holds no state for it at all. It only knows the word, which is
 * the one part that cannot live in the browser — the code ships to every
 * visitor, and a passcode checked in it is a passcode published in it. The
 * answer is `opened: true` and nothing else; where that is remembered is the
 * browser's business. See public/js/lib/restriction.js.
 */

import { Router } from 'express';

export const router = Router();

const PASSCODE = process.env.TEACHER_PASSCODE || 'AP_Lit';
// Opens French and Latin, for the browser that typed it. There is no word that
// closes them again: clearing the site's storage is how a browser gives the key
// back, and a second passcode to take the languages away would be a switch over
// other people's screens, which this deliberately is not.
const RELEASE_PASSCODE = process.env.RELEASE_PASSCODE || 'profe';

const lock = { locked: false, since: null };

/** Case-insensitive, and tolerant of the spaces a phone keyboard adds. */
const same = (value, passcode) =>
  String(value ?? '').trim().toLowerCase() === String(passcode).trim().toLowerCase();

const state = () => ({ locked: lock.locked, since: lock.since });

router.get('/', (_req, res) => {
  res.json(state());
});

router.post('/', (req, res) => {
  const passcode = req.body?.passcode;

  // Checked before the lock's word, and it changes nothing here: the answer
  // simply tells this one browser that it may have the other languages.
  if (same(passcode, RELEASE_PASSCODE)) {
    return res.json({ ...state(), opened: true });
  }

  if (!same(passcode, PASSCODE)) {
    // Deliberately vague, and no hint about which of the three was wrong.
    return res.status(403).json({ error: 'Código incorrecto.', ...state() });
  }

  const next = typeof req.body?.locked === 'boolean' ? req.body.locked : !lock.locked;
  lock.locked = next;
  lock.since = next ? Date.now() : null;

  console.log(`[lock] site ${next ? 'locked' : 'unlocked'}`);
  res.json(state());
});
