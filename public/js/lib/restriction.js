/**
 * The teacher's subject restriction.
 *
 * A separate switch from the padlock's lock, thrown through the same dialog:
 * one passcode opens the site up to French and Latin, another puts them away
 * again. Where the lock stops the class working at all, this leaves everything
 * working and offers only the language that is today's lesson.
 *
 * It lives on the server beside the lock, so a teacher throwing it reaches
 * every browser in the room rather than only their own.
 *
 * The flag is kept here rather than in lib/study.js because study.js is
 * imported by almost everything, including the modules that talk to the
 * server — putting a fetch behind it would tangle the imports. The dependency
 * runs the other way, which is safe: study.js imports nothing.
 */

import { setStudyLang, studyLang } from './study.js';

const listeners = new Set();

/**
 * Remembered so the *next* page load can pick its wallpaper and its subject
 * before the server answers.
 *
 * Without it a returning reader whose stored subject is Latin gets a beat of
 * the Colosseum before being put back to Spanish. This is a hint for painting,
 * never the authority: the server decides, and says so a moment later.
 */
const REMEMBERED = 'profegpt:restricted';

export function rememberedRestriction() {
  try {
    return localStorage.getItem(REMEMBERED) !== 'false';
  } catch {
    return true;
  }
}

/**
 * Starts closed, and stays closed until the server says otherwise.
 *
 * The server's answer arrives a moment after the page does, and for that moment
 * something has to be assumed. Assuming "open" would show French and Latin to
 * every visitor for a beat before taking them away, which is both a flicker and
 * the wrong way round for a default whose whole point is that access is
 * granted rather than removed.
 */
let restricted = true;

/** The subjects the site will currently offer. */
export function allowedSubjects() {
  return restricted ? ['es'] : ['es', 'fr', 'la'];
}

export function isRestricted() {
  return restricted;
}

export function subjectAllowed(code) {
  return allowedSubjects().includes(code);
}

/** Called by lib/site-lock.js as the server's answer comes back. */
export function setRestricted(next) {
  const value = Boolean(next);
  try { localStorage.setItem(REMEMBERED, String(value)); } catch { /* private window */ }

  if (value === restricted) return restricted;
  restricted = value;

  // Somebody may be reading the Latin side when it is taken away. Enforcing it
  // here rather than at the caller means no future caller can forget to.
  if (!subjectAllowed(studyLang())) setStudyLang('es');

  for (const listener of listeners) listener(restricted);
  window.dispatchEvent(new CustomEvent('restrictionchange', { detail: { restricted } }));
  return restricted;
}

export function onRestrictionChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
