# Interpres

A Latin site: complete conjugation and declension tables, and Whitaker's Words
beside the Cambridge course vocabulary. The translator is being rebuilt from the
ground up and is not on the site for now.

```bash
npm install
npm start          # http://localhost:4000
```

No build step. The frontend is plain ES modules served straight out of `public/`.

Latin and nothing else. There were once a Spanish side and a French one behind
the same pages; they are gone, along with everything that existed only to serve
them.

## The pages

| Route | What it does |
| ----- | ------------ |
| `/` | A hero with the Colosseum, the three tools, and a **dictionary search** that opens the dictionary page with your query already applied. |
| `/conjugacion` | Every tense of the indicative, subjunctive and imperative, active and passive, across the five conjugations. Tabs for the model verbs, plus a search that conjugates anything you give principal parts for. Irregular forms are highlighted. |
| `/declinationes` | The five noun declensions and the adjectives, in every case and number. Takes a noun the way a dictionary quotes it — nominative and genitive — because the genitive is what says which declension it is. |
| `/diccionario` | Two columns. On the left, the Cambridge Latin Course vocabulary by stage; on the right, Whitaker's Words: the headword with its principal parts, every way the form can be read, example sentences where a corpus has them, and a spoken pronunciation. Clicking a word in a stage looks it up on the right. |

The three inner pages are the links at the top right of the header. The home
page is the logo. `/stadia` (the old stages page) redirects to
`/diccionario` with its `?s=` intact, and `/chat` to the home page.

The interface is English. The Latin string pack is still in
`public/js/lib/i18n.js`; the LA | EN switch that chose between them was removed
with the redesign, along with the dark/light toggle and the chat.

## The translator

**Removed, to be redesigned from the ground up.** The old one — a rules
translator into Latin, a parser out of it, the reading-twice check, the report
log and everything they leaned on — is in the history at the tag
`last-translator`, README and tests included:

```bash
git show last-translator:README.md      # the long write-up of how it worked
git checkout last-translator -- server/latin-translate.js   # to bring a file back
```

The lessons it produced are in [LESSONS.md](LESSONS.md), and they apply to the
next one.

## The model


Two providers, tried in order: **Groq** (free) and then **Anthropic** (paid).
Whichever is configured. Without any key the site still works: the tables and
the dictionary's definitions use no model.

Gemini and OpenRouter were in this chain and are not any more.

It writes the dictionary's example sentences when no corpus has one. Nothing
else on the site touches it.

**Groq's default model here reasons before it answers, and that reasoning comes
out of the token budget.** At 400 tokens a long prompt thought its way to the
cap and returned a *successful response with nothing in it* — not an error,
just silence. The budget is 1500 now. It is worth knowing about before debugging an empty string.

## The dictionary

### Whitaker's Words

Everything Latin rests on **WORDS by William Whitaker**, reached through the
Alpheios morphology service. It is the standard free Latin dictionary and it
does something no ordinary dictionary does: give it any inflected form and it
returns the headword with its **principal parts**, the declension or conjugation
it belongs to, its gender, a definition, and **the exact parse of the form you
gave it**.

Ask it about *canem* and it says: accusative singular of *canis, canis*, third
declension. That is the thing a Latin reader actually needs, and it is why the
dictionary page here is keyed on the form you met in the text rather than on the
headword you would have to know already.

It is asked for both spellings of a word, since editions differ on i/j and u/v,
and answers are cached. Two details cost real debugging:

- **`entry.dict` is sometimes an array**, when one form belongs to several
  headwords that inflect alike. Read as a single object it comes back blank and
  the whole analysis vanishes — which is how the accusative of "dog" briefly
  stopped existing.
- **A failed request must not be cached as "no such word".** Recording an
  outage for a day is the same bug wearing a hat.

Whitaker's also records how **common** and how **old** each headword is, and
both are used. *canem* belongs to *canes* (early, rare) and *canis* (very
frequent); leading with the archaic one is how *the dog of the girl* first came
back as *canes puellae*.

Example sentences come from **Tatoeba** where it has real ones, and an English
gloss from **Wiktionary**. Both are corpora rather than models: free, unmetered,
and quoting somebody rather than inventing. A model is only asked when the
corpus has nothing, and if there is no model either the entry simply carries no
example. There is deliberately no template frame beneath that — a made-up Latin
sentence with the wrong case on it is worse than no sentence, and the parses are
the useful part of a Latin entry anyway.

### Hearing the word

A dictionary that cannot say the word out loud is half a dictionary for anybody
learning to speak. A speaker button sits beside the headword — filled cone,
stroked waves, because an all-outline speaker is mush at 16px.

**The budget is the shape of the feature.** The free ElevenLabs tier is 10,000
characters a month for the whole site, so only single words are spoken, every
clip is cached by word and by the browser, and a class of twenty-five looking up
*puella* spends six characters once rather than a hundred and fifty. The
guard against sentences lives next to the spending rather than only at the
route, because a length cap alone lets "the quick brown fox jumps over it"
through at 33 characters.

**The engine is told which language it is speaking.** It used to be left to
infer it from the text, and one word is not much to infer from — a Latin word
read as English is not Latin at all.

**And the page says what that is, beside the button.** No speech model has
Latin, so it is Italian phonology — closer to church Latin than to the classical
pronunciation a Cambridge course teaches. Better to say so than to let somebody
learn it wrong.

Without a key the button removes itself rather than standing there failing.

## The conjugator and the decliner

### The conjugator

Five tabs — **1st, 2nd, 3rd, 3rd -io, 4th** — and each mood is drawn as two
tables, **active and passive**, where the modern languages draw simple and
compound.

A Latin verb is conjugated **from its principal parts**, so that is what the
engine takes. *rego* alone tells you nothing about *rexi*; the page says so
rather than guessing, and the search index carries all four parts.

The rules that took the care:

- **The second and third conjugations are spelled identically** without macrons
  — *monēre* and *regere* — so the infinitive cannot separate them. The first
  principal part can: *-eo* is second, *-io* is third -io, anything else in *-o*
  is plain third. The same test a textbook gives.
- **A compound only counts across a real Latin prefix.** Without that list any
  verb ending in the letters of a base inherits from it, and *moneo* becomes
  *mon-* plus *eo* — conjugating as *monis, monit, moneunt*.
- **Deponents are passive in form and active in meaning**, so the forms carrying
  their active sense *are* the passive ones. Everything is built both ways and
  the right set chosen at the end. Their imperfect subjunctive is built on an
  active infinitive that a dictionary never prints — *sequerer* comes from
  *sequere* — so it is reconstructed.
- ***fio* is semi-deponent**: active in the present, *factus sum* in the perfect.

### The decliner

Nouns and adjectives from their dictionary form, because **the genitive is what
says which declension a noun is and what its stem will be**. That is why a
dictionary quotes it and why the engine needs it.

You do not have to know it, though. Give the nominative alone and the dictionary
supplies the rest — *rex* becomes *rex, regis* and the page says where the second
word came from.

**Or give the genitive alone**, which is the more useful direction and was the
one that did not work. A reader meets *regis* in a text and wants to know what
it belongs to; the genitive is the form that *carries* the declension, so a word
given as one is more use than a nominative, not less. Whitaker's says outright
that *regis* is the genitive singular of *rex, regis* — and the lookup was
throwing that away and answering "the dictionary does not have that word" about
a word it had just parsed, because it only ever checked whether the typed word
was somebody's **nominative**. It checks both ends now, and says which half it
filled in, since giving the genitive completes the nominative rather than the
other way round.

Give a **wrong** genitive and it still refuses: *puer, pueris* is not a word,
puer's genitive is *pueri*, and declining it as a third declension noun would
produce a whole table of forms that do not exist. See
`public/js/lib/latin-lookup.js`.

The tabs cover the five declensions and the adjectives. **The second and third
open a menu rather than a table**, because a neuter of either declines
differently enough to need its own — nominative, accusative and vocative fall
together, and the nominative plural is *-a*.

The rule used to be "click the tab you are already on", which meant the first
click quietly chose the masculine for you and only a second one admitted there
had been a choice. A reader who came for *bellum* got *dominus* and no reason to
think anything else existed. A tab holding two paradigms asks which.

The third declension is the awkward one, as it is for a student. **i-stems**
differ in four cells and are detected by the three rules a textbook gives —
parisyllabic (*civis, civis*), two consonants closing the stem (*urbs, urbis*),
or a neuter in *-al, -ar, -e* (*animal, mare*). That last is gated on the gender,
because *Caesar* and *consul* end that way too and decline as consonant stems.

Adjectives come with one, two or three terminations and the dictionary form says
which: *acer, acris, acre* is three, *fortis, forte* is two, and *ingens,
ingentis* is one — the second part there being the **genitive**, so every gender
shares the nominative. Read as a two-termination adjective it produces
*ingente*, which is not a word.

`npm test` checks 121 reference forms against the standard paradigms.

### The stages column

The Cambridge Latin Course teaches in numbered stages and students revise by
stage, so the left column of the dictionary page takes a number and gives you
the list. Typing a word instead tells you which stage it came from, and clicking
any word in a list looks it up in the dictionary column beside it.

A stage answers to whatever you type at it: `21`, `stage 21`, the numeral `xxi`,
or its title. The numerals are derived rather than listed, which is the fix for
a quiet one — they were a hand-written table that stopped at `xii`, so adding
Books II and III left the second half of the course reachable by digits only
while the page went on inviting a numeral.

**Be clear about what this data is.** The course publishes no vocabulary data
and its stage checklists are not available as a file, so these lists are
**hand-compiled**. The Latin and the meanings are standard — 499 of the 503
distinct words are verified against Whitaker's, the four exceptions being
pronouns it does not analyse — but *which stage a word first appears in* is
knowledge of the course rather than a copy of the book.

The index groups the stages **by book**, and a stage says which book it belongs
to, because a reader thinks in books before stages — twenty-eight numbers in one
line says nothing about where Book II starts.

**Stages 1–28 are seeded: Books I, II and III.** Confidence falls as the numbers
rise. Book I is soundest; the later lists are drawn from the stories rather than
from a checklist, so a word may sit a stage early or late. Books IV and V are
left out rather than guessed at.

The page says as much, on the page, where a reader revising for a test will see
it. Adding a stage is adding a key to `public/js/data/stages-la.js`; one entry is
`['latin', 'english']`.
## Design

Modelled on [investors.duolingo.com](https://investors.duolingo.com/): a white
page, huge chunky rounded headings in one accent colour, grey body text, cards
and buttons with a thick bottom edge that presses down when clicked. The accent
is **Roman red** (`#d42a32`, with `#a11d24` for the pressed edge) rather than
Duolingo green; gold and blue are the supporting colours. One theme, light.

**Fonts.** Duolingo's own faces, Feather Bold and DIN Round, are not free.
**Fredoka** stands in for Feather on the big headings and **Nunito** for DIN
Round everywhere else, both from Google Fonts.

**The illustrations are drawn SVGs in `public/assets/art/`**: the Colosseum in
the hero, a legionary helmet (conjugations), a column (declensions), a sealed
scroll (the dictionary, and also the logo and the favicon), a laurel wreath
(stages), and Minerva's owl in a helmet, which bobs, flaps and blinks on the
dictionary page. They follow the Duolingo house style: flat shapes with no
outlines, a darker shade down one side, a light highlight pill, and confetti
around the hero.

The Colosseum's facade is drawn on a real cylinder: every arch, sill and
window is laid out flat and then projected, so the arches narrow towards the
sides and their round heads turn into leaning half-ellipses, as they would on
a drum. The script asserts that each arch stays inside its bay and that the
building and trees stand on the grass. They are generated
by `scripts/draw-art.py` rather than drawn by hand, because the Colosseum's
arches have to follow the curve of the building. Run it again after editing.

**The header is Duolingo's**: plain uppercase links at the right, light grey,
a shade darker on hover and for the page you are on. On a phone they move to a
row of their own under the logo; there is no menu button at any width.

**Checkboxes are drawn, not the browser's**: a rounded box with a thick bottom
edge that fills red with a white tick and presses down when clicked.

**No rubber-band bounce** at either end of the page (`overscroll-behavior`).

**The detail and report panels are one component.** Both open the same overlay,
so the focus handling and the three ways out — Escape, the backdrop, the close
button — are written once.

**A dropdown says it is one.** The second and third declension tabs carry an
arrow, and open their menu on any click.

## Configuration

**Everything works with no setup at all.** The conjugator, the decliner and the
dictionary's definitions use no key and no model. Copy
`.env.example` to `.env` only to add the two things that do:

| | |
| --- | --- |
| `GROQ_API_KEY` | free. Writes the dictionary's example sentences when no corpus has one. |
| `ELEVENLABS_API_KEY` | the spoken word on the dictionary page. Without it the speaker button removes itself rather than standing there failing. |

`ANTHROPIC_API_KEY` is the paid alternative to Groq and `LLM_PROVIDER` forces
one instead of auto-detecting. **Groq retires models without warning**, and its
endpoint answers a dead one with "does not exist or you do not have access to
it" — which reads like a key problem and is not. `llama-3.3-70b-versatile` was
the default here until it was decommissioned; `openai/gpt-oss-120b` is the
current one, and `GROQ_MODEL` overrides it against
[the list of what is live](https://console.groq.com/docs/models).

## Where things live

```
server/
  index.js              routes, static files, the SPA fallback
  env.js                reads .env without a dependency
  llm.js                picks a provider: Groq, then Anthropic
  latin-lexicon.js      which Latin word means which English one — the course
                        list, then Wiktionary
  latin.js              Whitaker's Words, through Alpheios
  corpus.js             Tatoeba sentences and Wiktionary glosses
  speech.js             pronunciation: one word, cached, told its language
  throttle.js           one queue per upstream host
  providers/            groq, anthropic, and the shared SSE reader
  routes/               dictionary, speak

public/
  index.html            the shell: logo, the menu, the footer
  styles.css            every style, one file
  assets/art/           the illustrations, all SVG
  js/app.js             the router and the menu
  js/lib/
    dom.js              el(), icon(), the sprite table, fetch helpers
    i18n.js             the interface strings (English; the Latin pack is kept)
    conjugator-la.js    the conjugation engine
    decliner-la.js      the declension engine
    latin-lookup.js     fills in a missing genitive, refuses a wrong one
  js/data/
    verbs-la.js         model verbs and their principal parts
    stages-la.js        the course vocabulary, by stage
  js/views/             home, conjugator, declensions, dictionary (with stages)

test/                   offline, no network, a couple of seconds
```

`npm test` runs all 544 checks.

```
latin.test.js             286 on the declension and conjugation engines and
                              the course data
conjugator-view.test.js   230 that every tense the page names exists in the
                              table the engine builds
corpus.test.js             11 on how a corpus sentence is chosen
speech.test.js             17 on what may be spoken, and what is refused before
                              a character of the month is spent
```

## Deploying

### Render

`render.yaml` is a blueprint: point Render at the repository and it reads it.
The service is a **web service**, not a static site — the dictionary's lookups
need a server.

**`numInstances: 1`**, because the dictionary caches are held in memory and a
second instance gets its own copy.

Every key is `sync: false` — Render holds the value, and the file only names it.
Nothing secret belongs in a file that is in a repository, private or not.

### Things that will surprise you otherwise

- **The site is one page.** Every route falls through to `index.html`, so a
  refresh on `/declinationes` works, but any new route needs adding to `ROUTES`
  in `public/js/app.js` as well as to the menu in `index.html`.
- **Code, markup and the SVG art revalidate on every load; anything else in
  `assets/` caches for a year.** A
  single-page app can otherwise keep a stale module alive in an open tab for
  days, because navigating between pages never re-fetches it.
- **The morphology is a network call.** Whitaker's is reached through Alpheios,
  so the decliner's genitive lookup and the dictionary need
  the internet even though none of them needs a key. The tests do not.

## Notes

The Latin is real Latin where Latin has a word for the thing, and a respectable
coinage where it does not — *stadia* for the course's stages. The interface is
English now; the Latin pack is kept for if a switch comes back.
