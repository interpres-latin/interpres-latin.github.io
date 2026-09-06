/**
 * The language the site is *about*.
 *
 * ProfeGPT is a Spanish site. Typing `mode: french` into the translator turns
 * it into a French one — the same pages, the same engines, the same allowance,
 * pointed at a different language — and `mode: latin` into a Latin one, which
 * additionally grows two pages the modern languages have no use for.
 * Everything that reads as content (verb forms, dictionary headwords, grammar
 * notes, the tutor's answers) comes from whichever pack this returns.
 *
 * It is deliberately not in the navigation. The French side is behind the
 * Spanish one, found by knowing the phrase rather than by clicking.
 *
 * Distinct from lib/i18n.js, which is the language of the *chrome*. The two
 * are related but not the same: in French mode the interface is French or
 * English, in Spanish mode Spanish or English.
 */

const STUDY_KEY = 'profegpt:study';

export const STUDY_LANGUAGES = ['es', 'fr', 'la'];

function read() {
  try { return localStorage.getItem(STUDY_KEY); } catch { return null; }
}

function write(value) {
  try {
    if (value === 'es') localStorage.removeItem(STUDY_KEY);
    else localStorage.setItem(STUDY_KEY, value);
  } catch {
    // Storage blocked — the choice still applies for this visit.
  }
}

function valid(value) {
  return STUDY_LANGUAGES.includes(value) ? value : 'es';
}

let current = valid(read());

/** @returns {'es'|'fr'|'la'} */
export function studyLang() {
  return current;
}

export function isFrench() {
  return current === 'fr';
}

export function isLatin() {
  return current === 'la';
}

/**
 * Switch the site's subject language.
 *
 * Fires `studychange` so the router can rebuild the current view. Callers are
 * responsible for moving the interface language across — see the trigger in
 * views/home.js — because the two axes are independent: someone reading the
 * site in English stays in English.
 */
export function setStudyLang(next) {
  const value = valid(next);
  if (value === current) return current;
  current = value;
  write(current);
  // The wallpaper is chosen in CSS off this attribute, so it has to move with
  // the subject rather than waiting for a view to re-render.
  document.documentElement.dataset.study = current;
  window.dispatchEvent(new CustomEvent('studychange', { detail: { study: current } }));
  return current;
}

/**
 * The phrase that opens the French side, and the one that closes it again.
 *
 * Matched on the whole input rather than inside a sentence: this is a command
 * typed on its own, not something to trip over mid-translation. Accents are
 * optional because it is typed on an English keyboard as often as not.
 */
const MODE_COMMANDS = [
  [/^\s*mode\s*:?\s*(?:french|fran[cç]ais)\s*[.!]?\s*$/i, 'fr'],
  [/^\s*mode\s*:?\s*(?:latin|latine?|latina)\s*[.!]?\s*$/i, 'la'],
  [/^\s*mode\s*:?\s*(?:spanish|espa[nñ]ol|espagnol)\s*[.!]?\s*$/i, 'es'],
];

/**
 * The study language a piece of translator input is asking for, or null.
 * @returns {'es'|'fr'|'la'|null}
 */
export function modeCommand(text) {
  for (const [pattern, value] of MODE_COMMANDS) {
    if (pattern.test(String(text ?? ''))) return value;
  }
  return null;
}
