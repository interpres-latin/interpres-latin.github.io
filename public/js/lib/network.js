/**
 * The drifting node-and-edge field behind the hero.
 *
 * Nodes move at a constant slow velocity and bounce off the edges. Any two
 * within LINK_DIST are joined by a line whose opacity falls off with distance,
 * so the lattice appears and dissolves as the field drifts. The pointer pulls
 * nearby nodes toward it and draws its own links.
 */

const LINK_DIST = 132;
const POINTER_DIST = 190;
const DENSITY = 1 / 17000; // nodes per CSS pixel²
const MAX_NODES = 96;

export function startNetwork(canvas) {
  const context = canvas.getContext('2d', { alpha: true });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Colours live in CSS so the palette has a single home; they arrive here as
  // bare "r, g, b" triples that get an alpha appended per line.
  let palette = readPalette();

  function readPalette() {
    const style = getComputedStyle(document.documentElement);
    const read = (name, fallback) => (style.getPropertyValue(name).trim() || fallback);
    return {
      line: read('--net-line', '150, 155, 167'),
      lineWarm: read('--net-line-warm', '217, 116, 62'),
      dot: read('--net-dot', '180, 186, 198'),
      dotWarm: read('--net-dot-warm', '217, 116, 62'),
    };
  }

  let nodes = [];
  let width = 0;
  let height = 0;
  let frame = null;
  let visible = true;
  const pointer = { x: -9999, y: -9999, active: false };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.min(MAX_NODES, Math.max(34, Math.round(width * height * DENSITY)));
    if (nodes.length > target) nodes.length = target;
    while (nodes.length < target) nodes.push(spawn());
  }

  function spawn() {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.11 + Math.random() * 0.2;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 0.9 + Math.random() * 1.5,
      warm: Math.random() < 0.18, // a few nodes pick up the brand colour
    };
  }

  function step() {
    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0 || node.x > width) { node.vx *= -1; node.x = Math.min(Math.max(node.x, 0), width); }
      if (node.y < 0 || node.y > height) { node.vy *= -1; node.y = Math.min(Math.max(node.y, 0), height); }

      if (pointer.active) {
        const dx = pointer.x - node.x;
        const dy = pointer.y - node.y;
        const distance = Math.hypot(dx, dy);
        if (distance < POINTER_DIST && distance > 1) {
          const pull = (1 - distance / POINTER_DIST) * 0.014;
          node.x += dx * pull;
          node.y += dy * pull;
        }
      }
    }
  }

  function draw() {
    context.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (Math.abs(dx) > LINK_DIST || Math.abs(dy) > LINK_DIST) continue;
        const distance = Math.hypot(dx, dy);
        if (distance > LINK_DIST) continue;
        const strength = 1 - distance / LINK_DIST;
        context.strokeStyle = a.warm || b.warm
          ? `rgba(${palette.lineWarm}, ${strength * 0.26})`
          : `rgba(${palette.line}, ${strength * 0.17})`;
        context.lineWidth = strength * 0.8;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }

      if (pointer.active) {
        const distance = Math.hypot(pointer.x - a.x, pointer.y - a.y);
        if (distance < POINTER_DIST) {
          const strength = 1 - distance / POINTER_DIST;
          context.strokeStyle = `rgba(${palette.lineWarm}, ${strength * 0.34})`;
          context.lineWidth = strength * 1.1;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
        }
      }

      context.fillStyle = a.warm ? `rgba(${palette.dotWarm}, 0.8)` : `rgba(${palette.dot}, 0.45)`;
      context.beginPath();
      context.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      context.fill();
    }
  }

  function loop() {
    step();
    draw();
    frame = requestAnimationFrame(loop);
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= width && pointer.y <= height;
  }

  function onPointerLeave() { pointer.active = false; }

  function pause() {
    if (frame) { cancelAnimationFrame(frame); frame = null; }
  }

  function play() {
    if (!frame && visible && !reduced) frame = requestAnimationFrame(loop);
  }

  resize();
  draw();

  const observer = new IntersectionObserver(([record]) => {
    visible = record.isIntersecting;
    if (visible) play(); else pause();
  }, { threshold: 0 });
  observer.observe(canvas);

  const onResize = () => { resize(); if (reduced) draw(); };
  const onThemeChange = () => { palette = readPalette(); draw(); };
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('themechange', onThemeChange);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);

  play();

  return () => {
    pause();
    observer.disconnect();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('themechange', onThemeChange);
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
  };
}
