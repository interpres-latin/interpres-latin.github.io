/**
 * The teacher's subject restriction.
 *
 * A separate switch from the padlock's lock, thrown through the same dialog:
 * one passcode narrows the site to Spanish, another opens it up again. Where
 * the lock stops the class working at all, this leaves everything working and
 * takes away the two languages that are not today's lesson.
 *
 * It lives on the server beside the lock, so a teacher throwing it reaches
 * every browser in the room rather than only their own.
 *
 * The flag is kept here rather than in lib/study.js because study.js is
 * imported by almost everything, including the modules that talk to the
 * server — putting a fetch behind it would tangle the imports.
 */

const listeners = new Set();

let restricted = false;

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
  if (value === restricted) return restricted;
  restricted = value;
  for (const listener of listeners) listener(restricted);
  window.dispatchEvent(new CustomEvent('restrictionchange', { detail: { restricted } }));
  return restricted;
}

export function onRestrictionChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
