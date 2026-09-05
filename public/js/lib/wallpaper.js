/**
 * The wallpaper behind the middle of the home page.
 *
 * A photograph of the Plaza de Cibeles that parallaxes against the scroll,
 * fades in as the translator arrives and fades back out as the dictionary
 * search takes over. A theme-coloured scrim sits on top of it so the text in
 * front stays readable in either palette.
 */

const IMAGE = '/assets/madrid';

const clamp = (value) => Math.min(Math.max(value, 0), 1);

/**
 * @param {HTMLElement} layer  the fixed element to paint
 * @param {HTMLElement} from   section where the wallpaper fades in
 * @param {HTMLElement} to     section where it fades back out
 */
export function startWallpaper(layer, from, to) {
  // WebP where it is understood, JPEG everywhere else. The plain url() first is
  // the fallback for browsers that do not know image-set at all.
  const photo = layer.querySelector('.wallpaper__photo') || layer;
  photo.style.backgroundImage = `url("${IMAGE}.jpg")`;
  photo.style.backgroundImage = `image-set(url("${IMAGE}.webp") type("image/webp"), url("${IMAGE}.jpg") type("image/jpeg"))`;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let queued = false;

  // How strongly the photo reads through its scrim, per theme.
  let strength = readStrength();

  function readStrength() {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--wallpaper-strength');
    return Number(value) || 0.5;
  }

  function update() {
    queued = false;
    const viewport = window.innerHeight;
    const start = from.getBoundingClientRect().top;
    const end = to.getBoundingClientRect().top;

    // Starts arriving while the hero is still on screen, so the two sections
    // dissolve into each other rather than cutting.
    const arriving = clamp((viewport * 1.05 - start) / (viewport * 0.6));
    const leaving = clamp((viewport * 0.8 - end) / (viewport * 0.45));

    layer.style.opacity = (arriving * (1 - leaving) * strength).toFixed(3);
    if (!reduced) photo.style.transform = `translate3d(0, ${(-window.scrollY * 0.12).toFixed(1)}px, 0) scale(1.12)`;
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
