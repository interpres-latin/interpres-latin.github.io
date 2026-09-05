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
| `/chat`        | A **grounded tutor** that answers from the site's own data — the conjugator, the RAE dictionary, the translator, and hand-written grammar explanations. Needs no API key and invents nothing. |

## The chat page

The tutor is deliberately not a language model. It routes a question to one of
five things it can actually ground an answer in:

| Ask | Where the answer comes from |
| --- | --- |
| *conjuga tener en subjuntivo* | the local conjugation engine |
| *qué es «dijeron»* | a reverse index of 15,000 conjugated forms, built in ~100 ms on first use |
| *qué significa sobremesa* | `/api/dictionary` → RAE |
| *cómo se dice "I'm tired" en español* | `/api/translate` |
| *ser y estar*, *por y para*, *el subjuntivo*… | 16 hand-written grammar topics in `public/js/data/grammar.js`, in both languages |

Anything it can't ground, it declines — it says so rather than guessing. That's
the whole point: on a site whose value is being correct about Spanish, a
confident wrong answer costs more than an honest "outside what I cover".

It replies in the language you asked in, and carries that choice forward for
follow-ups that have no language signal of their own.

If `ANTHROPIC_API_KEY` is set, the questions the tutor declined — and only those
— are passed to Claude instead. Grounded answers always win.

### The free allowance

Spanish questions are free forever: they never leave the server. Off-topic ones
are metered at **10 per 30 minutes per visitor**, enforced server-side in
`server/quota.js` with a sliding window, so the bill stays bounded no matter who
finds the site. Tune it with `CHAT_FREE_LIMIT` and `CHAT_WINDOW_MINUTES`.

When the allowance runs out, two translucent strips roll in from opposite
corners and cross into an X over the chat panel, sealing it until the window
rolls forward. The angle and length are measured from the panel, so the X lands
on its corners at any size. Spanish questions carry on working throughout.

### The profe's interjections

Three expressions she actually used, spelled as the RAE has them, fired on the
kind of moment that earned them rather than on every message:

| | When |
| --- | --- |
| **¡Olé!** | a word found in the dictionary |
| **¡Mecachis en todo!** | a question outside what the tutor covers, and on the tape |
| **¡La madre que me parió!** | a verb that is both irregular *and* stem-changing |

## Design

**Dark and light.** The choice is stamped onto `<html data-theme>` by an inline
script in the page head, before the first paint, so the site never flashes the
wrong palette. It follows the system setting until you press the toggle, then
remembers. Colours that get painted to canvas — the hero network, the wallpaper
strength — are CSS custom properties the JS reads back, so the palette has a
single home.

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
| `ANTHROPIC_API_KEY` | Switches translation and dictionary examples from the fallbacks to Claude, and lets the chat fall through to Claude for questions the tutor can't ground. Everything works without it. |
| `PORT` | Defaults to `4000`. |
| `CHAT_FREE_LIMIT` | Off-topic chat questions per window. Default `10`; set `0` to seal the chat immediately and see the tape. |
| `CHAT_WINDOW_MINUTES` | Length of that window. Default `30`. |

Without a key:

- **Translation** falls back to [MyMemory](https://mymemory.translated.net/) (free, no key, daily quota).
- **Example sentences** fall back to a per-part-of-speech template, labelled as such in the UI.
- **Chat** answers from the site's own data and declines the rest.

## Where things live

```
server/
  index.js              express app: /api routes, static files, SPA fallback
  quota.js              sliding-window allowance for off-topic chat questions
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
    lib/tutor.js        intent routing for the chat: what can be grounded, and how
    lib/theme.js        dark/light switching
    lib/tape.js         the X that seals the chat when the allowance is gone
    data/grammar.js     16 grammar explanations, Spanish and English
    data/verbs.js       stem changes, irregulars, the search index
    views/              one module per page
test/
  conjugator.test.js    204 reference forms checked against RAE paradigms
  tutor.test.js         31 checks on intent routing and the form index
  quota.test.js         20 checks on the sliding window, refunds and callers
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
- The Claude-backed paths (the chat fall-through, Claude translation, generated
  examples) are written against `claude-opus-5` but have not been exercised
  against the live API — there was no key available when they were built. Every
  path that runs without a key has been tested.
