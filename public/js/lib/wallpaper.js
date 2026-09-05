/**
 * The wallpaper behind the middle of the home page.
 *
 * An Andalusian azulejo tiling — octagons with small diamonds in the gaps —
 * drawn as a repeating SVG so there is no binary asset to ship. It parallaxes
 * against the scroll, fades in as the translator arrives and fades back out as
 * the dictionary search takes over.
 */

const TILE = 120;
const HALF = TILE / 4;                 // half a cell: four octagons per tile
const CUT = HALF / (1 + Math.SQRT2);   // octagon vertex offset
const DIAMOND = HALF - CUT;            // half-diagonal of the gap diamonds

function octagon(cx, cy) {
  const points = [
    [cx - HALF, cy - CUT], [cx - CUT, cy - HALF], [cx + CUT, cy - HALF], [cx + HALF, cy - CUT],
    [cx + HALF, cy + CUT], [cx + CUT, cy + HALF], [cx - CUT, cy + HALF], [cx - HALF, cy + CUT],
  ];
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

function diamond(cx, cy) {
  return [[cx, cy - DIAMOND], [cx + DIAMOND, cy], [cx, cy + DIAMOND], [cx - DIAMOND, cy]]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

function buildTile() {
  const octagons = [];
  const diamonds = [];
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      octagons.push(octagon(HALF + column * HALF * 2, HALF + row * HALF * 2));
    }
  }
  // Diamonds sit where four octagons meet, including the tile edges so the
  // pattern joins up seamlessly when it repeats.
  for (let y = 0; y <= TILE; y += HALF * 2) {
    for (let x = 0; x <= TILE; x += HALF * 2) diamonds.push(diamond(x, y));
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">`,
    '<g fill="none" stroke="#c2733f" stroke-width="1.25">',
    ...octagons.map((points) => `<polygon points="${points}"/>`),
    '</g>',
    '<g fill="none" stroke="#4a6fa5" stroke-width="1.25">',
    ...diamonds.map((points) => `<polygon points="${points}"/>`),
    '</g>',
    '</svg>',
  ].join('');
}

const clamp = (value) => Math.min(Math.max(value, 0), 1);

/**
 * @param {HTMLElement} layer  the fixed element to paint
 * @param {HTMLElement} from   section where the wallpaper fades in
 * @param {HTMLElement} to     section where it fades back out
 */
export function startWallpaper(layer, from, to) {
  layer.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(buildTile())}")`;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let queued = false;

  // How strongly the tiling reads against the page. Light paper needs a little
  // more than the dark ground before the pattern is visible at all.
  let strength = readStrength();

  function readStrength() {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--wallpaper-strength');
    return Number(value) || 0.16;
  }

  function update() {
    queued = false;
    const viewport = window.innerHeight;
    const start = from.getBoundingClientRect().top;
    const end = to.getBoundingClientRect().top;

    const arriving = clamp((viewport * 0.92 - start) / (viewport * 0.45));
    const leaving = clamp((viewport * 0.8 - end) / (viewport * 0.45));

    layer.style.opacity = (arriving * (1 - leaving) * strength).toFixed(3);
    if (!reduced) layer.style.backgroundPositionY = `${(-window.scrollY * 0.28).toFixed(1)}px`;
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
