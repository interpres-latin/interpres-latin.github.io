/**
 * The teacher's subject restriction.
 *
 * Which subjects this browser may have.
 *
 * The site offers Spanish and English to everybody. French and Latin are behind
 * a passcode typed into the padlock, and opening them opens them **here only** —
 * for the browser that typed the word, not for the room. That is the difference
 * from the lock next door: the lock is a switch a teacher throws over everyone,
 * this is a key a person is given. One student being shown French must not put
 * French in front of the other twenty-four.
 *
 * So it lives in this browser's storage rather than on the server. The server
 * knows only the word — a passcode checked in code that ships to every visitor
 * is a passcode published to every visitor — and answers `opened: true` without
 * recording anything.
 *
 * Clearing the site's storage is how a browser gives the key back. There is no
 * passcode that takes the languages away again, because that would be a switch
 * over other people's screens.
 *
 * The flag is kept here rather than in lib/study.js because study.js is
 * imported by almost everything, including the modules that talk to the
 * server — putting a fetch behind it would tangle the imports. The dependency
 * runs the other way, which is safe: study.js imports nothing.
 */

import { setStudyLang, studyLang } from './study.js';

const listeners = new Set();

/**
 * Where the key is kept, and read straight back on the next visit — including
 * by the pre-paint script in index.html, which needs the subject before the
 * first frame so a returning Latin reader does not get a beat of the Colosseum.
 */
const REMEMBERED = 'profegpt:restricted';

function readRemembered() {
  try {
    return localStorage.getItem(REMEMBERED) !== 'false';
  } catch {
    // A private window, or storage switched off. Closed is the safe answer.
    return true;
  }
}

/** Closed unless this browser has been given the key before. */
let restricted = readRemembered();

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

/** Called by lib/site-lock.js when the passcode is accepted. */
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
