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
 * The same dialog carries a second, softer switch: a **subject restriction**
 * that narrows the site to Spanish and takes the French and Latin sides away.
 * Where the lock stops the class working, this leaves everything working and
 * removes what is not today's lesson.
 *
 * **It starts on.** A visitor gets Spanish and English until somebody types the
 * passcode; French and Latin are the thing being unlocked rather than the thing
 * being taken away. That is the safe default for a site a class can reach from
 * anywhere: the worst a stranger finds is the Spanish lesson.
 *
 * A restart therefore closes the site back down rather than opening it, which
 * is the opposite of how the lock behaves and deliberately so. The lock's
 * failsafe is that nobody can be shut out by a process nobody is watching; this
 * one's is that nothing is left open by one.
 */

import { Router } from 'express';

export const router = Router();

const PASSCODE = process.env.TEACHER_PASSCODE || 'AP_Lit';
// `profe` opens the other languages; `walsh` puts them away again.
const RELEASE_PASSCODE = process.env.RELEASE_PASSCODE || 'profe';
const RESTRICT_PASSCODE = process.env.RESTRICT_PASSCODE || 'walsh';

const lock = { locked: false, since: null, restricted: true };

/** Case-insensitive, and tolerant of the spaces a phone keyboard adds. */
const same = (value, passcode) =>
  String(value ?? '').trim().toLowerCase() === String(passcode).trim().toLowerCase();

const state = () => ({ locked: lock.locked, since: lock.since, restricted: lock.restricted });

router.get('/', (_req, res) => {
  res.json(state());
});

router.post('/', (req, res) => {
  const passcode = req.body?.passcode;

  // The restriction has its own two words, checked before the lock's, so a
  // teacher can open or narrow the site without sealing it.
  if (same(passcode, RESTRICT_PASSCODE) || same(passcode, RELEASE_PASSCODE)) {
    lock.restricted = same(passcode, RESTRICT_PASSCODE);
    console.log(`[lock] subjects ${lock.restricted ? 'restricted to Spanish' : 'opened'}`);
    return res.json(state());
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
