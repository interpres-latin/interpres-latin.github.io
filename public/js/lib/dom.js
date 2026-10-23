/** Tiny DOM helpers. Everything builds real nodes, so no string interpolation
 *  ever reaches innerHTML with untrusted content. */

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in node && key !== 'list') node[key] = value;
    else node.setAttribute(key, value);
  }
  append(node, children);
  return node;
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Build an icon from the sprite table below.
 *
 * A shape is either a path string (stroked) or a list of parts, each of which
 * may be filled or stroked at its own weight — filled bodies read far better
 * than outlines at 16px, which is the size these run at in the header.
 */
export function icon(shape, { size = 18, fill = false, width = 2.2 } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const parts = Array.isArray(shape) ? shape : [{ d: shape, fill }];
  for (const part of parts) {
    const node = document.createElementNS(SVG_NS, 'path');
    node.setAttribute('d', part.d);
    if (part.fill) {
      node.setAttribute('fill', 'currentColor');
      node.setAttribute('stroke', 'none');
    } else {
      node.setAttribute('fill', 'none');
      node.setAttribute('stroke', 'currentColor');
      node.setAttribute('stroke-width', String(part.width ?? width));
    }
    svg.appendChild(node);
  }
  return svg;
}

const SUN_RAYS = 'M19 12h2.7M16.95 16.95l1.91 1.91M12 19v2.7M7.05 16.95l-1.91 1.91'
  + 'M5 12H2.3M7.05 7.05 5.14 5.14M12 5V2.3M16.95 7.05l1.91-1.91';

export const ICONS = {
  swap: 'M7 4v13m0 0-3.5-3.5M7 17l3.5-3.5M17 20V7m0 0-3.5 3.5M17 7l3.5 3.5',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35',
  copy: 'M9 9h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9Zm-2 6H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2',
  send: 'M4 12 21 4l-8 17-2-7-7-2Z',

  down: 'M12 5v14m0 0-6-6m6 6 6-6',

  // A chevron, for a control that opens something. Smaller and lighter than
  // `down`, because it sits inside a tab label rather than standing alone.
  caret: 'M6 9.5l6 5.5 6-5.5',

  // A filled disc with the dot and stem knocked out of it, wound the opposite
  // way. The outline version of an "i" reads as a lowercase L at this size.
  info: [
    { d: 'M12 2.6A9.4 9.4 0 1 0 12 21.4 9.4 9.4 0 0 0 12 2.6zm-1.15 4.2h2.3v2.3h-2.3zm0 3.9h2.3v6.6h-2.3z', fill: true },
  ],

  // A flag on a stroked pole: this is the button that says something is wrong,
  // so it wants a silhouette rather than an outline.
  flag: [
    { d: 'M6 3.4v17.2', width: 2.2 },
    { d: 'M7.6 4.2h11.2l-2.6 4 2.6 4H7.6z', fill: true },
  ],

  close: 'M6 6l12 12M18 6 6 18',

  // Three lines: the header's menu.
  menu: 'M4 6.5h16M4 12h16M4 17.5h16',

  // Solid bodies with a stroked shackle: an all-outline padlock turns to mush
  // at 16px, which is the size these run at in the header. The keyhole is cut
  // out of the body by winding it the opposite way (evenodd on one path).
  lock: [
    { d: 'M8.4 10.2V7.6a3.6 3.6 0 0 1 7.2 0v2.6', width: 2.2 },
    { d: 'M4.6 10.2h14.8v10.6H4.6zM12 13.6a1.5 1.5 0 0 0-.9 2.7v1.6h1.8v-1.6a1.5 1.5 0 0 0-.9-2.7z', fill: true },
  ],
  unlock: [
    { d: 'M8.4 10.2V7.6a3.6 3.6 0 0 1 6.9-1.4', width: 2.2 },
    { d: 'M4.6 10.2h14.8v10.6H4.6zM12 13.6a1.5 1.5 0 0 0-.9 2.7v1.6h1.8v-1.6a1.5 1.5 0 0 0-.9-2.7z', fill: true },
  ],

  // A filled disc plus heavy rays; the outline version reads as a flower.
  sun: [
    { d: 'M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8z', fill: true },
    { d: SUN_RAYS, width: 2.2 },
  ],
  // One filled crescent, cut by a second circle rather than stroked.
  moon: [{ d: 'M20.5 14.6A8.9 8.9 0 0 1 9.4 3.5a8.9 8.9 0 1 0 11.1 11.1z', fill: true }],
};

export function debounce(fn, wait) {
  let timer;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}

/** Strip diacritics so "informacion" finds "información". */
export function fold(text) {
  return String(text ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export async function postJson(url, body, options = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || `Error ${response.status}`), { data });
  return data;
}

export async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || `Error ${response.status}`), { data });
  return data;
}
