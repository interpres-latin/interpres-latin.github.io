/**
 * A small markdown renderer that builds DOM nodes directly — nothing ever
 * reaches innerHTML, so model output cannot inject markup.
 *
 * Blocks: fenced code, ATX headings, blockquotes, unordered and ordered lists,
 * paragraphs. Inline: **bold**, *italic*, `code`, [text](url).
 */

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text, parent) {
  for (const part of String(text).split(INLINE)) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      parent.appendChild(node('strong', part.slice(2, -2)));
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      parent.appendChild(node('code', part.slice(1, -1)));
    } else if ((part.startsWith('*') && part.endsWith('*') && part.length > 2)
      || (part.startsWith('_') && part.endsWith('_') && part.length > 2)) {
      parent.appendChild(node('em', part.slice(1, -1)));
    } else {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
      if (link && /^(https?:|\/)/.test(link[2])) {
        const anchor = node('a', link[1]);
        anchor.href = link[2];
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        parent.appendChild(anchor);
      } else {
        parent.appendChild(document.createTextNode(part));
      }
    }
  }
  return parent;
}

function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

export function renderMarkdown(source, target) {
  while (target.firstChild) target.removeChild(target.firstChild);

  const lines = String(source ?? '').split('\n');
  let index = 0;
  let list = null;

  const closeList = () => { list = null; };

  while (index < lines.length) {
    const line = lines[index];

    if (line.trimStart().startsWith('```')) {
      closeList();
      const fence = node('pre');
      const code = node('code');
      index += 1;
      const buffer = [];
      while (index < lines.length && !lines[index].trimStart().startsWith('```')) {
        buffer.push(lines[index]);
        index += 1;
      }
      index += 1; // closing fence (or end of the stream so far)
      code.textContent = buffer.join('\n');
      fence.appendChild(code);
      target.appendChild(fence);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      target.appendChild(inline(heading[2], node(`h${Math.min(heading[1].length + 2, 6)}`)));
      index += 1;
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      closeList();
      target.appendChild(inline(quote[1], node('blockquote')));
      index += 1;
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      const wanted = bullet ? 'ul' : 'ol';
      if (!list || list.tagName.toLowerCase() !== wanted) {
        list = node(wanted);
        target.appendChild(list);
      }
      list.appendChild(inline((bullet || ordered)[1], node('li')));
      index += 1;
      continue;
    }

    if (!line.trim()) {
      closeList();
      index += 1;
      continue;
    }

    closeList();
    const paragraph = node('p');
    const buffer = [];
    while (index < lines.length && lines[index].trim()
      && !/^(#{1,6}\s|>|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[index])
      && !lines[index].trimStart().startsWith('```')) {
      buffer.push(lines[index]);
      index += 1;
    }
    inline(buffer.join(' '), paragraph);
    target.appendChild(paragraph);
  }

  return target;
}
