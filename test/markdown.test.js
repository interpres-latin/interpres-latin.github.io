/**
 * The markdown renderer, which builds DOM nodes directly so nothing ever
 * reaches innerHTML.
 *
 * Tables are the reason this file exists: the grammar notes are half endings,
 * and before the renderer understood tables a table of them collapsed into one
 * run-on paragraph — unreadable in exactly the place a reader needs it most.
 */

let checked = 0;
const failures = [];
function ok(name, condition, detail = '') {
  checked += 1;
  if (!condition) failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

// A DOM small enough to render into and inspect.
const make = (tag) => ({
  tagName: tag.toUpperCase(),
  children: [],
  _text: '',
  className: '',
  get textContent() { return this._text || this.children.map((c) => c.textContent).join(''); },
  set textContent(value) { this._text = value; },
  appendChild(child) { this.children.push(child); return child; },
  removeChild(child) { this.children = this.children.filter((c) => c !== child); },
  get firstChild() { return this.children[0]; },
  setAttribute() {},
});
globalThis.document = { createElement: make, createTextNode: (t) => ({ textContent: t, children: [] }) };

const { renderMarkdown } = await import('../public/js/lib/markdown.js');

const render = (source) => renderMarkdown(source, make('div'));
const find = (node, tag) => {
  if (node.tagName === tag) return node;
  for (const child of node.children ?? []) {
    const found = find(child, tag);
    if (found) return found;
  }
  return null;
};
const findAll = (node, tag, out = []) => {
  if (node.tagName === tag) out.push(node);
  for (const child of node.children ?? []) findAll(child, tag, out);
  return out;
};

// --- tables ----------------------------------------------------------------
const table = render([
  'Endings:',
  '',
  '| | sg. | pl. |',
  '| --- | --- | --- |',
  '| 1st | puellae | puellis |',
  '| 3rd | regi | regibus |',
  '',
  'Note that…',
].join('\n'));

ok('a table becomes a table', Boolean(find(table, 'TABLE')));
ok('with a head row', findAll(table, 'TH').length === 3, `${findAll(table, 'TH').length} cells`);
ok('and two body rows', findAll(find(table, 'TBODY'), 'TR').length === 2);
ok('with three cells each', findAll(table, 'TD').length === 6);
ok('the cells carry their text', findAll(table, 'TD')[1].textContent === 'puellae',
  findAll(table, 'TD')[1].textContent);
ok('the delimiter row is not a body row', !findAll(table, 'TD').some((c) => c.textContent.includes('---')));
ok('it is wrapped so it can scroll', findAll(table, 'DIV').some((d) => d.className === 'tablewrap'));
ok('prose before it is still a paragraph', findAll(table, 'P')[0].textContent === 'Endings:');
ok('and prose after it too', findAll(table, 'P')[1].textContent === 'Note that…');

// Pipes without a delimiter row are just prose, not a table.
const notTable = render('The forms | are | separated by pipes but this is prose.');
ok('pipes alone do not make a table', !find(notTable, 'TABLE'));
ok('they stay in a paragraph', Boolean(find(notTable, 'P')));

// Inline markup inside cells still renders.
const bold = render(['| a | b |', '| --- | --- |', '| **puellae** | *dative* |'].join('\n'));
ok('cells render bold', Boolean(find(bold, 'STRONG')));
ok('cells render italic', Boolean(find(bold, 'EM')));

// --- the blocks that already worked keep working ---------------------------
ok('headings still render', find(render('### Title'), 'H5')?.textContent === 'Title');
ok('lists still render', findAll(render('- one\n- two'), 'LI').length === 2);
ok('blockquotes still render', Boolean(find(render('> quoted'), 'BLOCKQUOTE')));
ok('code fences still render', Boolean(find(render('```\ncode\n```'), 'PRE')));
ok('a plain paragraph is intact',
  find(render('literally "there is a book to me", i.e. I have a book.'), 'P').textContent
  === 'literally "there is a book to me", i.e. I have a book.');

// --- nothing reaches innerHTML --------------------------------------------
const hostile = render('<img src=x onerror=alert(1)> and [link](javascript:alert(1))');
ok('markup is text, not markup', !find(hostile, 'IMG'));
ok('a javascript: link is not a link', !find(hostile, 'A'));

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checked} markdown checks failed:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`✓ all ${checked} markdown checks passed`);
