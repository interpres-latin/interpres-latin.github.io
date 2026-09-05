/**
 * The photograph behind the top of a page.
 *
 * Gran Vía at night in dark mode, the Plaza de Cibeles by day in light mode —
 * chosen in CSS, so the theme switch needs no help from here. It is fully up at
 * the top of the page and fades out as the element you hand it rises into view,
 * which is what keeps it to the hero and translator on the home page and to a
 * band behind the header on the inner ones.
 *
 * A theme-coloured scrim sits over the photo so text in front stays readable.
 */

import { el } from './dom.js';

const clamp = (value) => Math.min(Math.max(value, 0), 1);

/** The layer itself, for a view to put at the top of its tree. */
export function wallpaperLayer({ band = false, strong = false } = {}) {
  const modifiers = `${band ? ' wallpaper--band' : ''}${strong ? ' wallpaper--strong' : ''}`;
  return el('div', { class: `wallpaper${modifiers}`, 'aria-hidden': 'true' },
    el('div', { class: 'wallpaper__photo' }),
    el('div', { class: 'wallpaper__scrim' }));
}

/**
 * @param {HTMLElement} layer  the element returned by wallpaperLayer()
 * @param {HTMLElement} until  fades out as this rises through the viewport
 */
export function startWallpaper(layer, until) {
  const photo = layer.querySelector('.wallpaper__photo');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let queued = false;
  let strength = readStrength();

  function readStrength() {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--wallpaper-strength');
    return Number(value) || 1;
  }

  function update() {
    queued = false;
    const viewport = window.innerHeight;
    const edge = until?.getBoundingClientRect().top ?? Infinity;

    // Full at the top of the page, gone by the time `until` is well in view.
    const leaving = clamp((viewport * 0.85 - edge) / (viewport * 0.5));

    layer.style.opacity = ((1 - leaving) * strength).toFixed(3);
    if (!reduced) photo.style.transform = `translate3d(0, ${(-window.scrollY * 0.12).toFixed(1)}px, 0) scale(1.06)`;
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  const onThemeChange = () => { strength = readStrength(); update(); };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('themechange', onThemeChange);

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    window.removeEventListener('themechange', onThemeChange);
  };
}
