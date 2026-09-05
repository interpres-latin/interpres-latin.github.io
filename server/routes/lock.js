/**
 * The teacher's lock.
 *
 * One switch, held on the server, that seals the site for everybody at once.
 * Anyone holding the passcode can throw it either way — that is the point: a
 * teacher locks the room, and unlocks it when the lesson resumes.
 *
 * It lives in memory, so a server restart clears it. That is a deliberate
 * failsafe: nobody can be locked out by a process nobody is watching.
 */

import { Router } from 'express';

export const router = Router();

const PASSCODE = process.env.TEACHER_PASSCODE || 'AP_Lit';

const lock = { locked: false, since: null };

/** Case-insensitive, and tolerant of the spaces a phone keyboard adds. */
function matches(value) {
  return String(value ?? '').trim().toLowerCase() === PASSCODE.trim().toLowerCase();
}

router.get('/', (_req, res) => {
  res.json({ locked: lock.locked, since: lock.since });
});

router.post('/', (req, res) => {
  if (!matches(req.body?.passcode)) {
    // Deliberately vague, and no hint about which half was wrong.
    return res.status(403).json({ error: 'Código incorrecto.', locked: lock.locked });
  }

  const next = typeof req.body?.locked === 'boolean' ? req.body.locked : !lock.locked;
  lock.locked = next;
  lock.since = next ? Date.now() : null;

  console.log(`[lock] site ${next ? 'locked' : 'unlocked'}`);
  res.json({ locked: lock.locked, since: lock.since });
});
