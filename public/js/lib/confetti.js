/**
 * The graduation celebration.
 *
 * Paper rectangles fired from the lower corners, tumbling under gravity with a
 * little drag and spin. Canvas only — no library, no images.
 */

const COLOURS = ['#4d8dff', '#ffd166', '#ef476f', '#06d6a0', '#ffffff', '#ff8a3d'];
const GRAVITY = 0.16;
const DRAG = 0.992;
const LIFE_MS = 5200;

function burst(width, height, fromLeft) {
  const pieces = [];
  const originX = fromLeft ? width * 0.06 : width * 0.94;
  const originY = height * 0.98;

  for (let i = 0; i < 70; i += 1) {
    // Aimed inward and up, with enough spread to fill the screen.
    const angle = (fromLeft ? -1.15 : -1.99) + (Math.random() - 0.5) * 0.85;
    const speed = 11 + Math.random() * 13;
    pieces.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
      vy: Math.sin(angle) * speed,
      w: 5 + Math.random() * 7,
      h: 8 + Math.random() * 10,
      spin: (Math.random() - 0.5) * 0.34,
      angle: Math.random() * Math.PI,
      colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    });
  }
  return pieces;
}

/**
 * Run a confetti burst across a canvas.
 * @returns {() => void} stops it early
 */
export function fireConfetti(canvas) {
  const context = canvas.getContext('2d');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  let width = 0;
  let height = 0;
  let pieces = [];
  let frame = null;
  const started = performance.now();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  pieces = [...burst(width, height, true), ...burst(width, height, false)];

  function loop(now) {
    const elapsed = now - started;
    const fade = Math.max(0, 1 - Math.max(0, elapsed - LIFE_MS * 0.6) / (LIFE_MS * 0.4));

    context.clearRect(0, 0, width, height);
    context.globalAlpha = fade;

    for (const piece of pieces) {
      piece.vy += GRAVITY;
      piece.vx *= DRAG;
      piece.vy *= DRAG;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.angle += piece.spin;

      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.angle);
      context.fillStyle = piece.colour;
      // Squashing the height as it spins reads as paper turning over.
      context.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h * Math.abs(Math.cos(piece.angle)));
      context.restore();
    }

    context.globalAlpha = 1;
    if (elapsed < LIFE_MS) frame = requestAnimationFrame(loop);
  }

  frame = requestAnimationFrame(loop);
  const onResize = () => resize();
  window.addEventListener('resize', onResize, { passive: true });

  return () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('resize', onResize);
  };
}
