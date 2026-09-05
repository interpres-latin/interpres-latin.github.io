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

A question that names a verb *and* asks about its forms gets that verb's table,
not a general essay — "how do you say tener in the past tense" is about tener,
not about the preterite. An exact topic match still wins, so "el subjuntivo"
stays an explanation.

Anything it can't ground, it declines — it says so rather than guessing. That's
the whole point: on a site whose value is being correct about Spanish, a
confident wrong answer costs more than an honest "outside what I cover".

It replies in the language you asked in, and carries that choice forward for
follow-ups that have no language signal of their own.

If `ANTHROPIC_API_KEY` is set, the questions the tutor declined — and only those
— are passed to Claude instead. Grounded answers always win.

### The free allowance

Spanish questions are free forever: they never leave the server. Off-topic ones
go to a language model, and are metered at **10 per 30 minutes per visitor**,
enforced server-side in `server/quota.js` with a sliding window. Tune it with
`CHAT_FREE_LIMIT` and `CHAT_WINDOW_MINUTES`.

**Five off-topic questions per visitor, per 30 minutes** (`CHAT_FREE_LIMIT`),
counted per IP address. Two caveats worth knowing: people behind one router —
a household, a school, a mobile carrier — share an address and therefore share
one allowance; and the `X-Forwarded-For` header is only trusted when
`TRUST_PROXY=1`, because any client can send one and would otherwise mint
itself a fresh allowance on demand. Set it only when a proxy you control really
is in front.
One question costs one slot whichever model answers it — the provider chain is
about surviving an outage, not about handing out more questions. When a slot is
spent the tape rolls.

Providers are tried in order until one answers. A provider that fails before
producing a token hands straight over to the next, so a free endpoint having a
bad afternoon is invisible to the visitor and costs them nothing.

| Order | Key | Default model | Cost |
| --- | --- | --- | --- |
| 1 | `GEMINI_API_KEY` | `gemini-flash-latest` | free |
| 2 | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | free |
| 3 | `OPENROUTER_API_KEY` | three `:free` models, tried in order | free |
| 4 | `ANTHROPIC_API_KEY` | `claude-opus-5` | **paid** |

`LLM_PROVIDER` pins a single one. With none set, the tutor, conjugator and
dictionary still work and translation falls back to MyMemory.

Note that Google's own free tier is roughly **20 requests a day** for the Flash
models, well below what this site's per-visitor allowance would permit — which
is exactly why the overflow tier exists.

### Keeping OpenRouter free

Three guards in `server/providers/openrouter.js`, none of which trusts the
others:

1. **A model id must end in `:free`.** Anything else is refused before a request
   is built.
2. **Every request carries `provider.max_price` of zero** on prompt, completion,
   request and image. OpenRouter enforces this itself — a paid model comes back
   *"No endpoints found that satisfy the max price for this request"* rather
   than being billed.
3. **The advertised price is checked against `/models`** before first use. A
   `:free` name that actually charges is refused, and so is a model that cannot
   be verified — a failed lookup closes the gate rather than opening it.

`npm test` covers all three, offline, including a `:free`-suffixed model that
secretly charges.

Those are the code-side guards. Do these two on the account as well, because
they hold even if this code is wrong:

- **Do not add a payment method**, and keep the credit balance at zero. With no
  credits a paid model returns 403 instead of charging.
- **Set a credit limit on the key** at <https://openrouter.ai/settings/keys>.
  A key with a limit cannot spend past it, whatever asks it to.

When the allowance runs out, two translucent strips roll in from opposite
corners and cross into an X over the whole viewport. It carries an **I
understand** button, because an undismissable tape would also lock the visitor
out of the conjugator and the dictionary, which cost nothing and still work.

After that it escalates rather than repeating itself. Every message is still
checked by the tutor first, so Spanish questions answer normally and free. An
off-topic one with nothing left behind it gets a short notice at the top that
fades on its own — until five arrive within fifteen seconds, at which point the
tape returns. Acknowledging it resets the count.

### The teacher's lock

The padlock at the left of the header seals the site **for everyone at once**,
not just this browser: the switch lives on the server (`server/routes/lock.js`)
and clients poll it, so a locked room reaches someone already mid-page. Anyone
holding the passcode can throw it either way, including from the tape itself, so
nobody is stranded. It is `TEACHER_PASSCODE`, default `AP_Lit`, matched without
regard to case or surrounding spaces.

The lock is held in memory, so restarting the server clears it — a deliberate
failsafe against being locked out by a process nobody is watching.

### Site language

The interface is Spanish. The **ES / EN** switch in the header offers English
behind a passcode; getting it wrong seals the entire page with tape until the
right code is entered, and the lock survives a reload. Strings live in
`public/js/lib/i18n.js`; a language change re-renders the current view.

What the site is *about* stays in Spanish either way — verb forms, dictionary
headwords, the person pronouns in the conjugation tables. Only the chrome moves.
In English the conjugation tables lead with the English tense name and keep the
Spanish one underneath.

### One easter egg

Translating **"graduation 2028"**, in any capitalisation, doesn't translate
anything — it fires confetti and a full-screen *¡Olé!*. Canvas only, no library.

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

**Inter** throughout — headings uppercase at weight 700 with `letter-spacing:
-0.03em`. A system monospace is kept only for literal code inside chat replies.
Flat colour: no gradients, no rounded corners.

Between the translator and the dictionary search, a photograph of Madrid fades
in behind the page and parallaxes against the scroll — **Gran Vía at night in
dark mode, the Plaza de Cibeles by day in light mode**, chosen by a per-theme
`--wallpaper-image` custom property. A theme-coloured scrim keeps the text in
front readable; the strengths were calibrated by rendering the actual composite
with text over it rather than guessing.

It runs behind the hero and the translator on the home page, and as a band
behind the header on the conjugation and dictionary pages, fading out as the
next section rises into view.

Both sources are about 1024 px wide, which is well short of a modern display, so
the photo carries a 1.5 px blur: it turns the upscaling softness into something
that reads as depth of field instead of as a low-resolution image. **For genuinely
higher resolution, drop a larger original into `public/assets/` under the same
names** (`madrid-day.jpg`/`.webp`, `madrid-night.jpg`/`.webp`) — nothing in the
code assumes the current dimensions.

The image is declared as a plain `url()` followed by an `image-set()`, rather
than through a custom property. A `var()` whose value a browser cannot parse is
invalid at computed-value time and resets to *initial* — it does not fall back
to the previous declaration — which is how the photo silently disappeared once.

The hero hands over to the translator with a soft dissolve rather than a hard
edge: the hero is masked out over its last stretch while the wallpaper is
already fading up underneath it.

The highlight colour is blue — `#4d8dff` on the dark palette, `#1d5fd0` on the
light one — with teal as the second language's marker so the two stay
distinguishable.

## Configuration

Everything except the chat works with no setup. To turn on the chat and get
better translations and real example sentences:

```bash
cp .env.example .env      # then put your key in it
```

| Variable | Effect |
| -------- | ------ |
| `GEMINI_API_KEY` | Free. The primary tier for off-topic chat, translation and example sentences. |
| `GROQ_API_KEY` | Free. Another tier. |
| `OPENROUTER_API_KEY` | Free. The overflow tier — see *Keeping OpenRouter free* above. |
| `OPENROUTER_MODEL` | Comma-separated `:free` model ids, tried in order. |
| `ANTHROPIC_API_KEY` | **Paid.** Only reached if it is the only key set, or `LLM_PROVIDER=anthropic`. |
| `LLM_PROVIDER` | Pin one: `gemini`, `groq`, `openrouter` or `anthropic`. |
| `PORT` | Defaults to `4000`. |
| `CHAT_FREE_LIMIT` | Off-topic chat questions per window. Default `5`; set `0` to seal the chat immediately and see the tape. |
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
  llm.js                picks a provider — free tiers first
  providers/            gemini.js, groq.js, anthropic.js
  routes/
    translate.js        the model, falling back to MyMemory
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
    lib/markdown.js     DOM-building markdown renderer (no innerHTML)
    lib/tutor.js        intent routing for the chat: what can be grounded, and how
    lib/chat-session.js the conversation, held outside the view so navigating
                        away cannot interrupt an answer
    lib/theme.js        dark/light switching
    lib/tape.js         the X that seals the chat when the allowance is gone
    lib/wallpaper.js    the Madrid photo: parallax, scrim, scroll fade
    lib/i18n.js         every interface string, in both languages
    lib/language-switch.js  the ES/EN switch and its passcode gate
    data/grammar.js     16 grammar explanations, Spanish and English
    data/verbs.js       stem changes, irregulars, the search index
    views/              one module per page
test/
  conjugator.test.js    204 reference forms checked against RAE paradigms
  tutor.test.js         47 checks on intent routing and the form index
  quota.test.js         23 checks on the sliding window, refunds and caller identity
  openrouter.test.js    20 checks on the guards that keep OpenRouter free
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
  Anonymous access is **10 requests a minute and 100 a day** — enough for
  development, not for a public site. A free self-service key at
  <https://rae-api.com/login> raises it to 60/minute and 5,000/day; set
  `RAE_API_KEY` and it is sent automatically. Being rate-limited surfaces as a
  429 with a "come back in N minutes" message rather than a generic failure.
- The model-backed paths (off-topic chat, model translation, generated example
  sentences) have not been exercised against a live API — no provider key was
  available when they were built. The Gemini and Groq request shapes come from
  their current docs; the Anthropic one is verified against the SDK. Every path
  that runs *without* a key has been tested end to end.
