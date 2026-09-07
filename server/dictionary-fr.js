/**
 * The French dictionary.
 *
 * The Académie française would be the right authority here, and it is what the
 * Spanish side has in the RAE. It has no API: `api.dictionnaire-academie.fr`
 * does not resolve, and dictionnaire-academie.fr serves a JavaScript search
 * whose results are not in the HTML it returns. Scraping it would be both
 * fragile and unkind, so the definitions come from the **Wiktionnaire**
 * instead — French definitions of French words, CC BY-SA — and every entry
 * links out to the Académie's own page so the authority stays one click away.
 *
 * The Wiktionnaire is served as wikitext rather than as data, so this file is
 * mostly a parser. It reads the `{{langue|fr}}` section, takes the numbered
 * definitions under each part-of-speech heading, and normalises the result into
 * exactly the shape routes/dictionary.js already returns for the RAE, so the
 * page and the tutor do not have to know which dictionary answered.
 */

import { accentedForm } from './accents.js';

const WIKTIONNAIRE = 'https://fr.wiktionary.org/w/api.php';

/** Wiktionnaire section names → the categories the dictionary page knows. */
const PARTS_OF_SPEECH = {
  nom: 'noun',
  'nom propre': 'proper noun',
  verbe: 'verb',
  adjectif: 'adjective',
  'adjectif numéral': 'numeral',
  adverbe: 'adverb',
  pronom: 'pronoun',
  'pronom personnel': 'pronoun',
  'pronom relatif': 'pronoun',
  préposition: 'preposition',
  conjonction: 'conjunction',
  'conjonction de coordination': 'conjunction',
  interjection: 'interjection',
  article: 'article',
  'article défini': 'article',
  'article partitif': 'article',
  déterminant: 'determiner',
  'locution nominale': 'expression',
  'locution verbale': 'expression',
  'locution adjectivale': 'expression',
  'locution adverbiale': 'expression',
};

/** Register and domain templates worth keeping, as they change how a word reads. */
const USAGE_TEMPLATES = new Set([
  'familier', 'populaire', 'vulgaire', 'argot', 'soutenu', 'littéraire', 'vieilli', 'désuet',
  'archaïque', 'figuré', 'péjoratif', 'ironique', 'rare', 'par extension', 'par analogie',
  'sens figuré', 'absolument', 'spécialement', 'poétique', 'régional', 'québec', 'belgique',
  'suisse', 'informatique', 'cuisine', 'musique', 'médecine', 'droit', 'marine', 'militaire',
  'botanique', 'zoologie', 'mathématiques', 'grammaire', 'religion', 'sport',
]);

const VERB_TEMPLATES = {
  transitif: 'transitive',
  intransitif: 'intransitive',
  pronominal: 'pronominal',
  impersonnel: 'impersonal',
  'transitif indirect': 'indirect transitive',
};

/**
 * Language codes the etymology templates use. Without these an entry reads
 * "Du manger, de l'mangier" — the prose expects the language to be named where
 * the template stood.
 */
const SOURCE_LANGUAGES = {
  la: 'latin', grc: 'grec ancien', el: 'grec', fro: 'ancien français', frm: 'moyen français',
  gallo: 'gaulois', gaul: 'gaulois', ang: 'vieil anglais', en: 'anglais', de: 'allemand',
  nl: 'néerlandais', it: 'italien', es: 'espagnol', pt: 'portugais', ca: 'catalan',
  oc: 'occitan', ar: 'arabe', he: 'hébreu', tr: 'turc', ru: 'russe', sa: 'sanskrit',
  frk: 'francique', got: 'gotique', non: 'vieux norrois', nrf: 'normand', pro: 'ancien occitan',
  ine: 'indo-européen commun', LL: 'bas latin',
};

const GENDER_TEMPLATES = {
  m: 'masculine',
  f: 'feminine',
  mf: 'masculine_and_feminine',
  n: 'neuter',
  'm et f': 'masculine_and_feminine',
};

// ---------------------------------------------------------------------------
// wikitext
// ---------------------------------------------------------------------------

/** References and formatting tags, which are markup rather than text. */
function stripHtml(text) {
  return String(text)
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<[^>]+>/g, '');
}

/** `[[cible|texte]]` → texte, `[[mot]]` → mot, and the emphasis marks dropped. */
function unlink(text) {
  return String(text)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'''([^']+)'''/g, '$1')
    .replace(/''([^']+)''/g, '$1');
}

/**
 * Split a template's arguments, respecting the templates and links nested
 * inside it — `{{étyl|la|fr|mot=manducare|sens=mâcher}}` has four, not six.
 */
function splitArgs(body) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < body.length; i += 1) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth += 1; current += two; i += 1; continue; }
    if (two === '}}' || two === ']]') { depth -= 1; current += two; i += 1; continue; }
    if (body[i] === '|' && depth === 0) { parts.push(current); current = ''; continue; }
    current += body[i];
  }
  parts.push(current);
  return parts.map((part) => part.trim());
}

/**
 * Replace the innermost `{{…}}` repeatedly, so nested templates unwind from
 * the inside out. `render` decides what each one becomes; anything it returns
 * null for disappears.
 */
function expandTemplates(text, render) {
  let out = String(text);
  for (let pass = 0; pass < 8; pass += 1) {
    const next = out.replace(/\{\{([^{}]*)\}\}/g, (_match, body) => {
      const args = splitArgs(body);
      return render(args[0].toLowerCase().trim(), args.slice(1)) ?? '';
    });
    if (next === out) break;
    out = next;
  }
  return out.replace(/\{\{|\}\}/g, '');
}

/** Clean a definition line, pulling its labels out as they go. */
function readDefinition(line) {
  const labels = [];
  const verbKinds = [];

  const expanded = expandTemplates(line, (name, args) => {
    if (USAGE_TEMPLATES.has(name)) { labels.push(name); return null; }
    if (VERB_TEMPLATES[name]) { verbKinds.push(VERB_TEMPLATES[name]); return null; }
    if (name === 'lexique' || name === 'domaine') {
      for (const arg of args) if (arg && arg !== 'fr' && !arg.includes('=')) labels.push(arg);
      return null;
    }
    if (name === 'w' || name === 'lien' || name === 'lnob') return args[0] ?? null;
    if (name === 'siècle' || name === 'date' || name === 'source' || name === 'réf') return null;
    return null;
  });

  const description = stripHtml(unlink(expanded))
    .replace(/\s+/g, ' ')
    // Only before a comma or a full stop: French keeps its space before ; : ! ?
    .replace(/\s+([,.])/g, '$1')
    .replace(/^[\s,.;:]+/, '')
    .replace(/\s*\.$/, '')
    .trim();

  return { description, usage: labels.join(', '), verbCategory: verbKinds.join(', ') };
}

/** The gender declared on a headword line: '''chat''' {{pron|ʃa|fr}} {{m}} */
function readGender(line) {
  const match = /\{\{([mfn](?:\s+et\s+[mf])?|mf)\}\}/.exec(line);
  return match ? (GENDER_TEMPLATES[match[1]] ?? '') : '';
}

// ---------------------------------------------------------------------------
// the entry
// ---------------------------------------------------------------------------

/** Everything under `== {{langue|fr}} ==`, and nothing from any other language. */
function frenchSection(wikitext) {
  const start = /^==\s*\{\{langue\|fr\}\}\s*==\s*$/m.exec(wikitext);
  if (!start) return null;
  const rest = wikitext.slice(start.index + start[0].length);
  const end = /^==\s*\{\{langue\|(?!fr\}\})/m.exec(rest);
  return end ? rest.slice(0, end.index) : rest;
}

function readEtymology(section) {
  const match = /^===\s*\{\{S\|étymologie\}\}\s*===\s*$([\s\S]*?)(?=^===|\Z)/m.exec(section);
  if (!match) return '';

  const first = match[1].split('\n').map((line) => line.trim())
    .find((line) => line.startsWith(':') && line.length > 3);
  if (!first) return '';

  const expanded = expandTemplates(first.replace(/^:+\s*/, ''), (name, args) => {
    // {{étyl|la|fr|mot=manducare}} — the source language, then the word it came from.
    if (name === 'étyl' || name === 'etyl') {
      const positional = args.filter((arg) => !arg.includes('='));
      const language = SOURCE_LANGUAGES[positional[0]] ?? '';
      const word = args.find((arg) => arg.startsWith('mot='))?.slice(4) ?? positional[2] ?? '';
      return [language, word].filter(Boolean).join(' ') || null;
    }
    if (name === 'w' || name === 'lien' || name === 'recons') {
      return args.find((arg) => arg && !arg.includes('=')) ?? null;
    }
    if (name === 'refnec' || name === 'réf' || name === 'source') return null;
    return null;
  });

  return stripHtml(unlink(expanded))
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim()
    .slice(0, 300);
}

/** `* [[bouffer]]` lines under a synonyms or antonyms heading. */
function readList(block) {
  return block.split('\n')
    .filter((line) => /^\*\s*\[?\[?/.test(line))
    .map((line) => stripHtml(unlink(expandTemplates(line.replace(/^\*+\s*/, ''), () => null))))
    .map((word) => word.split(/[:(]/)[0].replace(/\s+/g, ' ').trim())
    .filter((word) => word && word.length < 40)
    .slice(0, 8);
}

/**
 * One entry per part of speech, each with its numbered senses.
 *
 * The Wiktionnaire nests sub-sections (synonyms, antonyms) inside the
 * part-of-speech section with a deeper heading, so the section is split on
 * `===` and the sub-headings are read within each piece.
 */
function readEntries(section) {
  const headings = [...section.matchAll(/^(={3,})\s*\{\{S\|([^|}]+)(\|[^}]*)?\}\}\s*\1\s*$/gm)];
  const entries = [];
  let current = null;
  let number = 0;

  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    const name = heading[2].trim().toLowerCase();
    const body = section.slice(heading.index + heading[0].length,
      i + 1 < headings.length ? headings[i + 1].index : section.length);

    if (PARTS_OF_SPEECH[name]) {
      const category = PARTS_OF_SPEECH[name];
      const gender = readGender(body.split('\n').slice(0, 6).join('\n'));

      current = { category, gender, senses: [] };
      entries.push(current);

      for (const line of body.split('\n')) {
        if (!/^#[^#*:]/.test(line) && line !== '#') continue;
        const { description, usage, verbCategory } = readDefinition(line.replace(/^#\s*/, ''));
        if (!description || description.length < 2) continue;
        number += 1;
        current.senses.push({
          number,
          category,
          verbCategory,
          gender,
          usage,
          description,
          usageNotes: [],
          synonyms: [],
          antonyms: [],
        });
      }
      continue;
    }

    if (!current?.senses.length) continue;
    if (name === 'synonymes') current.senses[0].synonyms = readList(body);
    if (name === 'antonymes') current.senses[0].antonyms = readList(body);
  }

  return entries.filter((entry) => entry.senses.length);
}

// ---------------------------------------------------------------------------
// lookup
// ---------------------------------------------------------------------------

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function wiki(params, attempt = 0) {
  const url = new URL(WIKTIONNAIRE);
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('origin', '*');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'ProfeGPT (educational)' },
    signal: AbortSignal.timeout(15000),
  });

  // Wikimedia throttles by address, and a class shares one. A short wait clears
  // it; anything longer is surfaced as a rate limit so the page can say so
  // rather than reporting a broken dictionary.
  if (response.status === 429 || response.status >= 500) {
    if (attempt < 2) {
      await wait(700 * (attempt + 1));
      return wiki(params, attempt + 1);
    }
    if (response.status === 429) {
      const error = new Error('Le dictionnaire limite les consultations. Réessayez dans un instant.');
      error.status = 429;
      throw error;
    }
  }

  if (!response.ok) throw new Error(`Le Wiktionnaire a répondu ${response.status}`);
  return response.json();
}

/** Words to offer when the one asked for is not there. */
async function suggestions(word) {
  try {
    const body = await wiki({ action: 'opensearch', search: word, limit: '6', namespace: '0' });
    return (body?.[1] || []).filter((item) => item.toLowerCase() !== word.toLowerCase()).slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * The same word with its accents back, if that is what was meant.
 *
 * Uses the search index rather than opensearch, because only the former folds
 * accents: asked for *flaner*, opensearch offers Breton words beginning with
 * those letters, while search returns *flâner*.
 */
async function accentedTitle(word) {
  try {
    const body = await wiki({
      action: 'query', list: 'search', srsearch: word, srlimit: '6', format: 'json',
    });
    const titles = (body?.query?.search ?? []).map((hit) => hit.title);
    return accentedForm(word, titles);
  } catch {
    return null;
  }
}

/**
 * Look a French word up.
 * @returns {Promise<{found: boolean, word?: string, entries?: Array, origin?: string, suggestions?: string[]}>}
 */
export async function fetchWiktionnaire(word, { corrected = null } = {}) {
  const body = await wiki({ action: 'parse', page: word, prop: 'wikitext' });

  // Tried once, and only when the word as typed is not there at all: someone
  // who wrote "flaner" meant "flâner", and the dictionary has no idea.
  const retry = async () => {
    if (corrected) return { found: false, suggestions: await suggestions(word) };
    const accented = await accentedTitle(word);
    if (!accented) return { found: false, suggestions: await suggestions(word) };
    const second = await fetchWiktionnaire(accented, { corrected: word });
    return second.found ? { ...second, corrected: { from: word, to: accented } } : second;
  };

  if (body.error) {
    if (body.error.code === 'missingtitle' || body.error.code === 'nosuchpageid') return retry();
    throw new Error(body.error.info || 'Le Wiktionnaire a refusé la requête.');
  }

  const wikitext = body?.parse?.wikitext;
  if (!wikitext) return retry();

  const section = frenchSection(wikitext);
  // The page exists but holds no French entry — "casa" is Spanish and Italian
  // on fr.wiktionary, and answering with those would be worse than not finding it.
  if (!section) return retry();

  const entries = readEntries(section);
  if (!entries.length) return retry();

  return {
    found: true,
    word: body.parse.title || word,
    origin: readEtymology(section),
    entries,
  };
}

export const ACADEMIE = (word) =>
  `https://www.dictionnaire-academie.fr/search?term=${encodeURIComponent(word)}`;

export const WIKTIONNAIRE_CREDIT = {
  name: 'Wiktionnaire',
  url: 'https://fr.wiktionary.org',
  licence: 'CC BY-SA',
};
