/**
 * Light and dark themes.
 *
 * The choice is written onto <html data-theme> by an inline script in the page
 * head, before the first paint, so the site never flashes the wrong palette.
 * This module only handles changing it afterwards.
 *
 * Anything that paints outside CSS — the hero canvas — listens for the
 * `themechange` event and re-reads its colours.
 */

const KEY = 'profegpt:theme';

export function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private browsing, or storage blocked. The theme still applies for this visit.
  }
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
  return next;
}

export function toggleTheme() {
  return applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
}

/** Read a colour token off :root, for canvas painting. */
export function themeColour(name, fallback = 'transparent') {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Wire up the header button. */
export function mountThemeToggle(button) {
  const paint = () => {
    const dark = currentTheme() === 'dark';
    button.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    button.title = dark ? 'Modo claro' : 'Modo oscuro';
    button.textContent = dark ? '☾' : '☀';
  };

  button.addEventListener('click', () => { toggleTheme(); paint(); });
  window.addEventListener('themechange', paint);
  paint();
}
