# ProfeGPT

A Spanish learning site: a two-way translator, complete conjugation tables, the
RAE dictionary, and an AI tutor.

```bash
npm install
npm start          # http://localhost:4000
```

No build step. The frontend is plain ES modules served straight out of `public/`.

## The four pages

| Route          | What it does |
| -------------- | ------------ |
| `/`            | Hero with an animated node network; the **translator**, whose centre button flips the languages and carries the text across; and a **dictionary search** that opens the dictionary page with your query already applied. |
| `/conjugacion` | Every tense of the indicative, subjunctive and imperative. Three tabs for the regular **-ar / -er / -ir** models, plus a verb search that conjugates anything you type. Irregular forms are highlighted. |
| `/diccionario` | Definitions from the *Diccionario de la lengua española*, with senses, synonyms, locutions and an example sentence per sense. |
| `/chat`        | A general-purpose assistant, streaming. |

## Design

Headings and the menu are **Inter** — uppercase, weight 700, `letter-spacing: -0.03em`,
`line-height: 1`. Body copy is **JetBrains Mono**. Flat colour throughout: no
gradients, no rounded corners.

Between the translator and the dictionary search, a wallpaper fades in behind
the page and parallaxes against the scroll — an Andalusian azulejo tiling
(octagons with diamonds in the gaps) generated as a repeating SVG in
`public/js/lib/wallpaper.js`, so there is no image file to ship.

## Configuration

Everything except the chat works with no setup. To turn on the chat and get
better translations and real example sentences:

```bash
cp .env.example .env      # then put your key in it
```

| Variable | Effect |
| -------- | ------ |
| `ANTHROPIC_API_KEY` | Enables the chat; switches translation and dictionary examples from the fallbacks to Claude. |
| `PORT` | Defaults to `4000`. |

Without a key:

- **Translation** falls back to [MyMemory](https://mymemory.translated.net/) (free, no key, daily quota).
- **Example sentences** fall back to a per-part-of-speech template, labelled as such in the UI.
- **Chat** is disabled and says so.

## Where things live

```
server/
  index.js              express app: /api routes, static files, SPA fallback
  claude.js             Anthropic client — model id, effort, streaming, refusal handling
  routes/
    translate.js        Claude, falling back to MyMemory
    dictionary.js       RAE lookup + example-sentence generation
    verbs.js            RAE's own conjugation tables, normalised to our shape
    chat.js             SSE streaming chat
public/
  index.html            app shell
  styles.css            the whole design system
  js/
    app.js              history-API router
    lib/conjugator.js   the conjugation engine
    lib/network.js      the hero node network
    lib/wallpaper.js    the azulejo wallpaper: SVG tile, parallax, scroll fade
    lib/markdown.js     DOM-building markdown renderer (no innerHTML)
    data/verbs.js       stem changes, irregulars, the search index
    views/              one module per page
test/
  conjugator.test.js    204 reference forms checked against RAE paradigms
```

## The conjugation engine

`public/js/lib/conjugator.js` builds paradigms from rules rather than a form
table, applied in this order:

1. **Regular endings** for the three classes.
2. **Orthographic changes** that only preserve pronunciation — `buscar → busqué`,
   `llegar → llegué`, `coger → cojo`, `conocer → conozco`, `leer → leyó`,
   `construir → construyo`, `gruñir → gruñó`, `seguir → sigo`.
3. **Stem changes** — `pensar → pienso`, `dormir → durmió`, `enviar → envío`.
4. **Explicit irregulars**, inherited by prefixed derivatives, so `obtener`
   comes free from `tener` and `proponer` from `poner`.

`npm test` checks 204 reference forms. The engine was also cross-checked
cell-by-cell against RAE's own tables (~1,200 cells) during development.

On the conjugation page the local engine renders instantly, then RAE's own table
is fetched and merged over it when the verb is in the dictionary — so the forms
you see are authoritative where RAE has them, and generated where it doesn't.
The badge on the verb card tells you which.

## Notes

- Dictionary data comes from [rae-api.com](https://rae-api.com), which serves
  the RAE's *DLE* as JSON. `dle.rae.es` itself blocks direct requests.
- The Claude-backed paths (chat, Claude translation, generated examples) are
  written against `claude-opus-5` but have not been exercised against the live
  API — there was no key available when they were built.
