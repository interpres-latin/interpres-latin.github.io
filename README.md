# ProfeGPT

A Spanish learning site: a two-way translator, complete conjugation tables, the
RAE dictionary, and an AI tutor.

There are two more behind it. Type **`mode: french`** or **`mode: latin`** into
the translator and the whole site changes subject — see *[The French
side](#the-french-side)* and *[The Latin side](#the-latin-side)*.

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
| `/diccionario` | Definitions from the *Diccionario de la lengua española*, with senses, synonyms and locutions, plus real example sentences and — in English mode — an English gloss. |
| `/chat`        | A **grounded tutor** that answers from the site's own data — the conjugator, the dictionary, the translator, and hand-written grammar explanations. Needs no API key and invents nothing. |

Every one of them has a French and a Latin counterpart on the other side of the
switch, and Latin adds two more pages that the modern languages have no use
for: **declension tables** and the **course's vocabulary by stage**.

## The chat page

The tutor is deliberately not a language model. It routes a question to one of
five things it can actually ground an answer in:

| Ask | Where the answer comes from |
| --- | --- |
| *conjuga tener en subjuntivo* | the local conjugation engine |
| *qué es «dijeron»* | a reverse index of 15,000 conjugated forms, built in ~100 ms on first use |
| *qué significa sobremesa* | `/api/dictionary` → RAE |
| *cómo se dice "I'm tired" en español* | `/api/translate` |
| *to say in Spanish*, or just *to say* | the search index, read backwards |
| *ser y estar*, *por y para*, *el subjuntivo*… | 22 hand-written grammar topics in `public/js/data/grammar.js`, in both languages |

**"to say in Spanish" is a question, even without a question in it.** Most
people ask for a word that way — the direction named, nothing asking for a
translation — and it used to fall through to the model and cost one of the five
free questions. It is now answered from the conjugator's own search index read
backwards: every verb there is stored with its English gloss, so *to say* finds
*decir* exactly, offline, and gives the whole paradigm rather than one word.
Multi-sense glosses are indexed under each sense, and under the bare verb too,
since a reader is as likely to type *say* as *to say*.

Grammar questions wearing the same shape stay grammar questions. *the subjunctive
in Spanish* is scored as a topic on the phrase alone — the trailing "in Spanish"
is what made it look like a translation request — and *to be in Spanish* gets ser
and estar rather than a single verb.

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

Questions about the language are free forever: they never leave the server.
Off-topic ones go to a language model, and are metered server-side in
`server/quota.js` with a sliding window.

**Five off-topic questions per browser, per 30 minutes** — `CHAT_FREE_LIMIT`
and `CHAT_WINDOW_MINUTES`.

**All three languages share the one allowance.** The bucket has no language in
it: switching sides is a change of subject, not a second helping.

Per *browser*, not per address: a classroom sits behind one router, so an
address identifies the room rather than the student, and the first person to ask
would spend everyone's allowance. Each browser gets a signed opaque id in a
cookie instead (`server/identity.js`). Clearing cookies earns a fresh allowance,
which is the right trade here — this is about sharing fairly, not resisting
attack — but the signature stops anyone simply inventing an identity per
request. Set `SESSION_SECRET` to keep identities across restarts.

The address is only a fallback for clients that cannot hold a cookie, and
`X-Forwarded-For` is trusted only when `TRUST_PROXY=1`, since any client can
send one.
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

### Typing without accents

*jamon* is not in any dictionary. *jamón* is. Students do not type accents, so a
perfectly ordinary vocabulary question came back as "not found" and went to a
language model — spending one of the reader's five free questions to be told
something the dictionary knew all along.

The word is now looked up a second time with its accents put back, and the entry
says so. Where the accented spelling comes from differs by language: the **RAE
returns it in its own 404** (asked for *jamon* it suggests *jamón*), while the
Wiktionnaire needs its **search** index rather than opensearch — asked for
*flaner*, opensearch offers Breton words that merely start the same way, and
search returns *flâner*.

The rule is deliberately narrow, and both halves of it matter:

- it runs **only when the word as typed was not found at all**, so *bebe* is
  never quietly turned into *bebé* — both are words, the first lookup succeeds,
  and this never runs;
- it accepts **only the same word with its accents restored**, so *jamon* is
  never turned into *jabón*, which is a different word rather than a carelessly
  spelled one.

`server/accents.js`.

### Where definitions come from

**The RAE, always** — that is the point of the page, and the Spanish wording is
the authoritative text. Wiktionary appears in two places and neither replaces
it: as a short English gloss beside the headword in English mode, and as a
stand-in only when the RAE itself cannot be reached, in which case the entry
says so plainly rather than letting the authority change silently.

### Where example sentences come from

Not from a model. Asking a frontier model to write one short sentence is absurd
on its face, and on a free tier it is also the thing that drains the quota — a
class looking words up would have exhausted a day's allowance before lunch.

| | Source | Cost |
| --- | --- | --- |
| Example sentences | [Tatoeba](https://tatoeba.org) — real sentences by native speakers, already paired with English translations (CC BY) | free, unmetered |
| English glosses | [Wiktionary](https://en.wiktionary.org) (CC BY-SA) | free, unmetered |
| Definitions | RAE, via rae-api.com | 5,000/day with a key |
| Translation | Lingva, then MyMemory, then Apertium — never a model | free, unmetered |

A model is woken only when Tatoeba has nothing for a word, and the template
frame is the last resort after that. Seven lookups across common and uncommon
words cost **zero** model calls.

### The translator

No model, at any point. Four dedicated engines, tried in order:

| | | |
| --- | --- | --- |
| 0 | **Wikipedia** | for names and titles. Machine translation renders them literally: "Cuban Missile Crisis" becomes *"crisis de los misiles cubanos"*, which says the missiles were Cuban when they were Soviet. Wikipedia's cross-language links hold the name each language actually uses — *Crisis de los misiles de Cuba*. |
| 1 | **Lingva** | a Google Translate front end — best quality, free, no key. Volunteer-run, so several instances are listed in `LINGVA_INSTANCES`, and one that fails is rested for a minute rather than re-asked on every translation. |
| 2 | **MyMemory** | a crowd translation memory. Believed outright when the answer is its own machine translation, and otherwise only when its stored candidates agree with each other. |
| 3 | **Apertium** | open-source rule-based translation. Clumsy — *Test me* comes back as *Me pruebo* — but always up and it never invents content. Spanish only: it has no English–French or English–Latin pair, so those chains stop at MyMemory. |

Apertium is the **floor**, not the usual answer. Spanish normally lands on
Lingva; it only reaches Apertium when everything above it has declined, which at
the time of writing is all the time. Judge the translator's quality when Lingva
is back.

The agreement rule on MyMemory exists because its segments can be wrong in ways
no score exposes: *"Buenos días, ¿cómo estás?"* comes back as *"Good morning
**Najlaa** how are you?"* — a stranger's name, at the top confidence score.
Neither the quality field nor the source segment separates that from a good
answer, since the memory genuinely holds three different translations of the
same sentence. Disagreement does.

**But agreement alone was too strict**, and it cost French and Latin their only
translator. The memory rarely holds the same sentence twice, so *le chien de la
fille* — the top candidate, and correct — was thrown out for sharing the page
with *La rumeur* and *Of the girl*. Spanish never showed the damage because
Apertium answers after it; French and Latin have no Apertium pair, so a veto
there left them with nothing.

What separates the two cases is not the score. The score says how close the
*source* is to something stored, so a wrong translation of a well-known sentence
still scores 0.99 — *Tengo hambre* → *"I have hunger"* at 1.00, *"cashapp me"*
at 0.99. It is **where the candidate came from**. MyMemory translates the
sentence itself only when its memory holds nothing close, and marks that one
`MT!`: one engine's answer, with no crowd to disagree with. Where a stored
translation does match there is no `MT!` at all, and the vote still decides — so
the Najlaa sentence is still refused.

And when nothing is confident, the memory's best guess is returned **labelled**
rather than withheld. Spanish never reaches that, because Apertium answers
first. French and Latin reach it whenever the memory holds a sentence twice and
its copies disagree, and there the choice is between a doubtful sentence that
says it is doubtful and an error message that helps nobody: a student can weigh
a translation marked uncertain, and cannot weigh a blank page.

Names inside a sentence are handled too, and separately: the whole-input lookup
cannot see them, and a translator renders them literally wherever they appear.
Every span of two to five words is a candidate — capitalisation is **not**
required, since a student types "the cuban missile crisis" in lower case and
still deserves the real name — and all of them are checked in a single
Wikipedia request. Each match is translated on its own to learn how this engine
renders it, and that rendering swapped for the real name, keeping whatever
capitalisation the position called for.

Telling a name from an ordinary phrase is the hard part: "history class" is a
Wikipedia article too, and translating a sentence about one used to come back
talking about social studies. Wikipedia capitalises a title only where the words
are proper nouns, so the title itself decides — *Cuban Missile Crisis* and
*Statue of Liberty* are names, *Social studies* and *Train station* are not. "The Cuban Missile
Crisis was a serious event" now comes back as *"La crisis de los misiles de
Cuba fue un acontecimiento grave."*

Wikipedia is only asked for things that look like names — two to eight words,
no sentence punctuation — and the article the query lands on has to *be* the
phrase, not merely resemble it. Both guards matter: without the first, a
sentence gets looked up as though it were a title; without the second, "la casa
de papel" comes back as "Money Heist" from a loosely matching article. Anything
else falls through to the translators untouched.

Apertium is a floor rather than a choice — it renders "Me gustaría aprender
español contigo" as *"It would like me learn Spanish with you"* — so it is only
reached when both better engines are unavailable. Results are cached, and the
pane names the engine behind each translation.

Corpus sentences are attached to the word rather than to a sense, because a
sentence merely contains the word — it does not promise to illustrate one
particular meaning. Tatoeba's search also returns relatives, so "madrugar" can
come back with "madrugador"; sentences containing the word itself are ranked
first, then the ones short enough for a learner to hold in their head.

### Idioms

Most idioms already survive translation — "it's raining cats and dogs" comes
back as *llueve a cántaros*, "he kicked the bucket" as *estiró la pata*. The
ones that do not come back word for word: *cost an arm and a leg* became *un
brazo y una pierna*.

The tempting repair is to flatten the idiom first — "it cost a lot" → *costó
mucho* — which is accurate and teaches the wrong thing, because Spanish has its
own idiom and a learner should meet it. So `server/idioms.js` pairs each idiom
with its **equivalent** rather than a paraphrase, and the plain meaning is shown
beside the translation as a note:

> it cost an arm and a leg **=** costó un ojo de la cara
> *to be extremely expensive*

Hand-written and hand-checked, like the grammar notes, and only the idioms a
translator actually gets wrong are listed. Matching ignores case and accents,
works inside a sentence, and is capped at two notes per translation.

**"Gets wrong" has to mean this rendering, not this idiom in general.** The
stored form is a citation — *llueve a cántaros*, third person present — and an
engine that produced the idiom in some other inflection has got it right. Pasting
the citation form over *está lloviendo a cántaros* gives **"está llueve a
cántaros"**: worse than the literal translation the feature exists to repair, and
wrong in a way a learner would copy.

So the idiom is only put in where it is genuinely absent, checked on both the
sentence and the span, by comparing the part of it that does not inflect. That
is everything after the verb in Spanish; the French forms open with a pronoun, so
the tail is checked too, and either hit counts. The test is deliberately
generous — a false yes leaves the engine's wording alone and shows the note,
which costs nothing, while a false no breaks the grammar.

The note is shown either way. The pairing is the thing being taught.

There is one table per language — 26 Spanish, 28 French, none for Latin, which
is not a language anyone is translating idiom for idiom — rather than one table
with an extra column, because the sets barely overlap: the idioms a translator
fumbles going into Spanish are not the ones it fumbles going into French, and
half of each list has no counterpart in the other. French gets *coûter les yeux
de la tête*, *casser sa pipe*, *quand les poules auront des dents*.

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
checked by the tutor first, so questions about the subject answer normally and
free — in whichever of the three languages the site is on. An
off-topic one with nothing left behind it gets a short notice at the top that
fades on its own — until five arrive within fifteen seconds, at which point the
tape returns. Acknowledging it resets the count.

### The teacher's restriction

The same padlock carries a second, softer switch. Typing **`profe`** narrows the
site to Spanish: French and Latin disappear from the menu, and `mode: french`
and `mode: latin` stop working. **`walsh`** opens them up again.

Where the lock stops the class working at all, this leaves everything working
and takes away what is not today's lesson. It lives on the server beside the
lock, so one teacher throwing it reaches every browser in the room, and it
clears on restart for the same reason the lock does.

The two switches never reach each other: restricting does not seal the room, and
unlocking does not quietly open French and Latin back up. `RESTRICT_PASSCODE`
and `RELEASE_PASSCODE` change the words.

### The teacher's lock

The padlock at the left of the header seals the site **for everyone at once**,
not just this browser: the switch lives on the server (`server/routes/lock.js`)
and clients poll it, so a locked room reaches someone already mid-page. Anyone
holding the passcode can throw it either way, including from the tape itself, so
nobody is stranded. It is `TEACHER_PASSCODE`, default `AP_Lit`, matched without
regard to case or surrounding spaces.

The lock is held in memory, so restarting the server clears it — a deliberate
failsafe against being locked out by a process nobody is watching.

### Switching subject

Two ways, and both stay.

**`mode: latin`** in the translator, which is how the other languages are
reached too and how they were meant to be found — by knowing the phrase.

**The left-hand button of the language switch**, which opens a menu: the three
subjects, and below them the choice of reading the interface in that language
rather than in English. Both live in the menu because the button cannot do two
different things on the same click and stay predictable — an earlier version
switched the interface on the first click and opened the menu on the second, so
pressing **LA** in Latin mode turned the interface Latin instead of offering the
languages.

The typed command is the hidden way in; the menu is the way back out for anyone
who found it by accident.

Switching subject **clears the query as well as the view**. Every page keeps
what you looked at in the URL — `?v=parler`, `?q=sobremesa` — so without this the
Latin conjugator would open on a French verb. There is no notice either: the
whole page changing language is announcement enough.

### Site language

The interface is Spanish. The **ES / EN** switch in the header offers English
behind a passcode; getting it wrong seals the entire page with tape until the
right code is entered, and the lock survives a reload. Strings live in
`public/js/lib/i18n.js`; a language change re-renders the current view.

In French mode the same switch reads **FR / EN**, and English sits behind the
same passcode. Latin reads **LA / EN** with neither side gated, since English is
the working language of a Latin lesson rather than a way round it.

**A change of subject takes the interface with it**: the site speaks whatever it
is about, Latin included. An earlier version kept English across the switch on
the grounds that the reader had paid a passcode for it, which meant choosing a
language and then not being given it. English is one click away in the menu.

What the site is *about* stays in its own language either way — verb forms,
dictionary headwords, the subject pronouns in the conjugation tables. Grammatical labels do
follow the interface, and so do grounded chat answers: ask in English while the
site is in Spanish and the conjugation still comes back in Spanish, because that
is the language you chose to work in. Only the model fall-through mirrors the
language of the question.

In English the conjugation tables lead with the English tense name and keep the
Spanish one underneath. Capitalisation belongs to the role rather than the
string, so the leading name is always capitalised and the hint never is.

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

French has counterparts on the same three moments — *Et voilà !*, *Zut alors !*,
*Oh là là !* — fired where a verb is both irregular and takes *être*, which is
about as much as one French verb can ask of a learner. Latin has *Euge!*, *Eheu!*
and *Mehercle!*, which are at least things a Roman said. All of them are
stand-ins; only the Spanish ones are things she actually said.

## The French side

Typing **`mode: french`** into the translator — in either pane, in any
capitalisation, with or without the colon — turns ProfeGPT into a French site.
**`mode: spanish`** turns it back. The choice is remembered.

It is behind the Spanish site rather than beside it: no link, no menu entry,
nothing in the navigation. You get there by knowing the phrase.

What changes:

| | |
| --- | --- |
| the header switch | **ES \| EN** becomes **FR \| EN** — English is still behind the same passcode |
| the translator | French ↔ English, with French idioms and French Wikipedia for names |
| the conjugator | French tables, and the three tabs become **-er / -ir / -re** |
| the dictionary | the **Wiktionnaire**, with the Académie française linked beside it |
| the tutor | French grammar, French verb forms, answers in French |
| the interface | every string, in French or English |
| the allowance | **shared** — the same five off-topic questions per window |

What does not change: the theme, the wallpaper, the teacher's lock, the
passcode, the confetti, and the shape of every page. It is the same site
pointed at a different language, not a second site.

The two sides never mix. Ask a French question in Spanish mode and the tutor
declines it, and the other way round — each has its own grammar notes, its own
verb list and its own dictionary, and the chat clears when you switch, because
a Spanish transcript is not history a French tutor could have produced.

### How it is put together

One axis was added — `public/js/lib/study.js`, the language the site is *about*
— and everything language-specific hangs off it. It is deliberately separate
from `lib/i18n.js`, which is the language of the *chrome*: in French mode the
interface is French or English, in Spanish mode Spanish or English, and someone
who paid the passcode for English stays in English across the switch.

The routing that decides what a question means is **shared**. `lib/tutor.js`
holds it, and `lib/tutor-es.js` and `lib/tutor-fr.js` are packs it reads: the
conjugation engine to call, the words that signal an intent, the shape of the
paradigm, and the sentences the tutor says in its own voice. That was worth the
refactor — the interesting behaviour is all in the routing, and two copies of it
would have drifted apart within a week. The conjugation page works the same way:
one renderer, two sets of tense lists.

The string tables are the exception, and are duplicated on purpose. The English
half differs too — "Spanish questions are free" and "French questions are free"
are different sentences, and so is every mention of the dictionary behind each
side — so a third column would have been a table of near-misses.

### The French conjugator

`public/js/lib/conjugator-fr.js`, built the same way as the Spanish one — rules
first, data only where rules run out:

1. **Regular endings** for the three groups: `-er`, `-ir` with the `-iss-`
   infix, and `-re`. The `-oir` verbs are irregular to a verb.
2. **Spelling that only preserves the sound** — `commencer → commençons`,
   `manger → mangeons`, `payer → paie`.
3. **The mute-e stem changes** — `lever → lève`, `appeler → appelle`,
   `acheter → achète`, `préférer → préfère`.
4. **Explicit irregulars**, inherited by prefixed derivatives, so `comprendre`
   comes free from `prendre` and `découvrir` from `couvrir`.

Two things have no Spanish counterpart and shape the code.

**The auxiliary.** Compound tenses take *avoir* or *être*, and the *être* ones
agree with their subject, so the table shows `je suis allé(e)` and `nous sommes
allé(e)s` rather than one string. Which auxiliary a verb takes is a chip on the
verb card, because it is half of learning its compound tenses.

**The stem splits rather than shifting.** French changes the stem before a
*mute* ending — je, tu, il, ils of the present and subjunctive — and leaves it
alone before nous and vous, where the ending is heard. Every verb carries a
strong stem and a weak one; for most verbs they are the same string.

The rules that took the most care:

- **`-eler` / `-eter` are checked before the plainer `e_er` shape**, because
  their stems satisfy both — otherwise *appeler* comes out *j'apèle*.
- **A single consonant after `e`, but one or two after `é`.** *lever → lève* and
  *régler → règle*, while *rester* stays *je reste* — two consonants after the
  `e` and the rule does not apply. That one line is the difference between
  correct French and *je rèste*.
- **`é` keeps its accent through the future** where `e` does not:
  *je préférerai*, but *je lèverai*.
- **`percevoir` is a prefixing of `cevoir`, not of `voir`.** Spelled out as its
  own entry it fell through to the shorter base and came back *je percevois*.
- **The `-uire` family is a rule**, not twelve near-identical entries, and a
  handful of them end in `-ui` rather than `-uit`.

`npm test` checks 163 reference forms against the Bescherelle paradigms, and a
further 183 that the page's tense lists and the engine's tables agree — a tense
named on the page but absent from the table would otherwise show as a quietly
missing row.

### Where French definitions come from

**Not the Académie française, and the page says so.** The Académie publishes no
API: `api.dictionnaire-academie.fr` does not resolve, and
dictionnaire-academie.fr serves a JavaScript search whose results are not in the
HTML it returns. Scraping it would be fragile and unkind.

So definitions come from the **Wiktionnaire** — French definitions of French
words, CC BY-SA — which `server/dictionary-fr.js` reads as wikitext and
normalises into exactly the shape the RAE route already returns, so the page and
the tutor never learn which dictionary answered. Every entry carries a link to
the Académie's own article, and a notice saying plainly where the text came
from, on the same principle as the Spanish side: a dictionary that quietly
changes authority is worse than one that admits what it is.

Example sentences come from Tatoeba as before, asked for French rather than
Spanish; the English gloss beside the headword comes from the French section of
en.wiktionary.

**One lookup is up to three Wikimedia requests** — the entry, a search when the
word was typed without its accents, and that English gloss — so a class of
twenty-five looking words up at once is a burst, and Wikimedia answers a burst
with 429s that persist for a while afterwards. A dictionary that dies the moment
a whole class uses it is not a dictionary. `server/throttle.js` therefore holds
the calls to three lanes with a gap in each.

Three is measured, not guessed. Twenty-five simultaneous lookups, run twice
over: one lane took 75s, three took 23s, six took 40s, and none of them drew a
429 — past three the host simply stops answering any faster, so further lanes
queue behind its own pacing instead of the queue's. Before the throttle the same
sweep returned 6 of 22.

### The French translator

The same chain, minus one engine: **Wikipedia → Lingva → MyMemory**.

Apertium has **no English–French pair** — it has `spa↔eng` and `spa↔fra`, but
not the one this needs — so the floor beneath MyMemory is missing on the French
side. Pivoting through Spanish was tried and rejected: Apertium is already "a
floor rather than a choice", and a double hop turns *Where is the library?* into
*Où Il est la bibliothèque ?*, which is worse than no answer on a site whose
value is being correct.

That makes Lingva load-bearing for French in a way it is not for Spanish, and
Lingva instances are volunteer-run. Of nineteen once listed publicly, thirteen
no longer resolve at all and two sit behind a Cloudflare challenge a server
cannot pass; the default list is now the two that are still serving. A host that
fails is **rested for a minute** before it is asked again.

That is worth more than it sounds. The translator fires on a debounce as you
type, so re-asking a dead instance every time cost a timeout per keystroke-pause
before anything else was even tried. With two dead hosts configured, the first
translation pays 2.5s and every one after it takes 0.7s. Nothing is disabled
permanently — the rest expiring is what puts a host back — and while they are
all resting Lingva simply steps aside and the chain carries on beneath it.

### When translation is down

It is, at the time of writing, for French and Latin. Worth writing down what was
checked, because the answer is not obvious and the temptation is to keep looking.

| | |
| --- | --- |
| Apertium | 133 installed pairs — **no Latin, no English–French** |
| Lingva | the surviving instances answer 500: the app is up, Google is refusing it |
| SimplyTranslate | 200 with an empty translation — the same failure, same cause |
| LibreTranslate | 51 languages, has French, **no Latin**; the main instance now needs a key |
| MyMemory | answers, but nothing it returned passed the agreement rule *(since fixed — see the chain above)* |

Lingva and SimplyTranslate are both Google front ends and both broke the same
way, so it is the endpoint that whole category uses. **Self-hosting would not
have helped**, which is worth knowing before spending an afternoon on it.

MyMemory was the interesting near-miss, and it is the one that turned out to be
ours rather than theirs. Its French is mostly right — *Où est la bibliothèque ?*,
*Le chien de la fille* — but its three candidates never agree with each other,
so the rule meant to catch its bad days was rejecting its good ones too. That is
fixed: French translates again, through MyMemory, in both directions.

Its Latin is not a near-miss. *I am tired* came back as *ego sum stultus*, "I am
stupid", and *the boy praises the farmer* as *puella complens the Farmer*. So
Latin output is checked rather than shown — see below.

**The site degrades honestly.** Spanish is unaffected, since Apertium is a real
translator rather than a proxy and nothing can rate-limit it. French and Latin
say they could not translate rather than showing a guess, and everything else —
both conjugators, the decliner, three dictionaries, the stages, the tutor —
never touched a translation engine to begin with.

The instances left in the default list are up and serving; it is Google refusing
*them*, which is a thing that passes. Keeping them listed is what lets the site
pick the service back up on its own.

**If it stays down**, the only engine that covers both French and Latin is the
Google Cloud Translation API — official, 500k characters a month free, and it
wants a billing account. That is a deliberate cost, not an oversight.

**Self-hosting**, if the machine allows it, is still the answer to rate limiting
specifically, and an entry may carry its own scheme:

```bash
docker run -d -p 3100:3000 --restart unless-stopped \
  --name lingva ghcr.io/thedaviddelta/lingva-translate:latest

LINGVA_INSTANCES=http://localhost:3100,lingva.lunar.icu
```

A self-hosted instance on a free tier spins down when idle and can take most of
a minute to wake, which is longer than the default patience; `LINGVA_TIMEOUT_MS`
raises it.

## The Latin side

Typing **`mode: latin`** turns ProfeGPT into a Latin site. Everything the French
side does, plus the things Latin needs and a modern language does not.

| | |
| --- | --- |
| the header switch | **LA \| EN**, and **neither side is gated** |
| the conjugator | five conjugations, active and passive, from the principal parts |
| **a declensions page** | the five noun declensions and the adjectives, in every case |
| **a stages page** | the Cambridge Latin Course vocabulary, stages 1–28 |
| the dictionary | Whitaker's Words: principal parts, and every reading of the form |
| the translator | every Latin word parsed, and the case corrected where it is wrong |
| the tutor | 26 grammar topics, answering **in English** |

**The passcode is gone.** English is the working language of a Latin lesson
rather than a way round it, so there is nothing there to protect. But the chat
answers in English whatever the switch says — a Latin tutor replying in Latin
would be a joke at the reader's expense.

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

### Accurate declensions in the translator

This was the requirement, and it is the interesting part.

**No free engine produces reliably correct Latin.** Google is good on simple
sentences and wrong on ordinary ones. Of eight case-critical phrases it got
seven right and fumbled the eighth — *the dog of the girl* → **canem puellae**,
the dog in the accusative when nothing is doing anything to it. A site that
shows a student that and says nothing has taught them the wrong ending.

So every Latin translation gets two things done to it.

**Every word is parsed**, and the pane shows the result. Not one reading but
*all* of them, because a Latin ending is routinely ambiguous — *agricolae* is
genitive, dative and nominative plural at once, and picking one would be telling
the reader something the word does not say. Anything Whitaker's cannot recognise
at all is flagged, which is the real check on machine translation.

**A wrong case is corrected where the English leaves no doubt.** An English noun
phrase with no verb in it has a nominative head, full stop — so a head noun in
some other case is an error that can be *put right* rather than merely reported.
The headword gives the dictionary parts, the decliner builds the nominative from
them, and the pane says what changed and why:

> **canis puellae**
> *case corrected: canem → canis. "the dog of the girl" has no verb, so its head
> noun is nominative. canem is accusative singular common.*

Nothing is invented and nothing is guessed. Where the construction is not
unambiguous the translation is left alone and the parse is shown instead, which
is the honest half of the same idea.

**And a sentence with English still in it is not offered as an answer.** A word
Whitaker's does not know, which also appears in the English that was asked
about, is not a doubtful reading — it is a word the engine gave up on and copied
across. *the boy praises the farmer* → *puella complens **the Farmer***. The
translation is struck through, the note says which words were left behind, and
it points at the word-by-word parse instead. This is the page where a student
decides what to write down, so a sentence that is not a translation must not
look like one.

**The number has to match too.** A nominative is not enough: *boy* came back as
*pueri*, which is nominative — and plural. So the English head noun's number is
read first, and the correction is to the nominative *singular* or *plural* as
the source requires. *boy* → **puer**, *boys* → **pueri**.

Whitaker's does not analyse most of the personal pronouns — *ego*, *tu*, *nos*,
*vos* all come back empty — so those are allowed through by name rather than
flagged as not being Latin.

Apertium has no Latin pair either, so the chain is Wikipedia → Lingva →
MyMemory, as it is for French. Lingva handles Latin well; MyMemory does not.

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
  *mon-* plus *eo* — conjugating as *monis, monit, moneunt*. The same bug the
  French side had with *percevoir* and *voir*.
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
word came from. Give a **wrong** one and it refuses: *puer, pueris* is not a
word, puer's genitive is *pueri*, and declining it as a third declension noun
would produce a whole table of forms that do not exist. See
`public/js/lib/latin-lookup.js`.

The tabs cover the five declensions and the adjectives. **Clicking a tab that is
already open offers its genders** — a second and third declension neuter decline
differently enough to need their own table, and there is otherwise no way to
reach one without knowing a neuter noun to type.

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

### The stages page

The Cambridge Latin Course teaches in numbered stages and students revise by
stage, so the page takes a number and gives you the list. Typing a word instead
tells you which stage it came from.

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

**Dark and light.** The choice is stamped onto `<html data-theme>` by an inline
script in the page head, before the first paint, so the site never flashes the
wrong palette. The **subject** goes on `<html data-study>` in the same script and
for the same reason — the wallpaper is chosen in CSS, so it has to be right
before anything is drawn. It follows the system setting until you press the toggle, then
remembers. Colours that get painted to canvas — the hero network, the wallpaper
strength — are CSS custom properties the JS reads back, so the palette has a
single home.

Icons are drawn sprites in `public/js/lib/dom.js`, not emoji or text glyphs:
those render differently on every platform and the hairline ☀/☾ characters
disappeared against the header. Solid bodies with stroked details, because an
all-outline padlock turns to mush at the 16px they run at. Each was rendered at
real size in both palettes before being wired in.

**Inter** throughout — headings uppercase at weight 700 with `letter-spacing:
-0.03em`. A system monospace is kept only for literal code inside chat replies.
Flat colour: no gradients, no rounded corners.

Between the translator and the dictionary search, a photograph fades in behind
the page and parallaxes against the scroll. **One city per subject, at night in
the dark palette and by day in the light one** — the city the language belongs
to:

| | dark | light |
| --- | --- | --- |
| Spanish | Gran Vía at night | the Plaza de Cibeles by day |
| French | Paris at night | Notre-Dame by day |
| Latin | the Colosseum at night | Rome by day |

Six photographs, each a webp with a jpeg fallback. A theme-coloured scrim keeps
the text in front readable; the strengths were calibrated by rendering the actual
composite with text over it rather than guessing.

The six rules are ordered rather than fought over with `!important`. A subject
rule carries the same weight as the light-mode rule it has to beat, so it comes
after it in the file; each subject's light rule carries one attribute more, so it
wins over its own dark one wherever it sits.

It runs behind the hero and the translator on the home page, and as a band
behind the header on the conjugation and dictionary pages, fading out as the
next section rises into view.

Both sources are about 1024 px wide, which is well short of a modern display, so
the photo carries a 1.5 px blur: it turns the upscaling softness into something
that reads as depth of field instead of as a low-resolution image. **For genuinely
higher resolution, drop a larger original into `public/assets/` under the same
names** — nothing in the code assumes the current dimensions. The Paris night
photograph is the smallest at 706px and leans on the blur hardest.

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
| `CHAT_FREE_LIMIT` | Off-topic chat questions per window, shared by all three languages. Default `5`; set `0` to seal the chat immediately and see the tape. |
| `RESTRICT_PASSCODE` | Narrows the site to Spanish from the padlock. Default `profe`. |
| `RELEASE_PASSCODE` | Opens the other subjects again. Default `walsh`. |
| `LINGVA_INSTANCES` | Comma-separated Lingva hosts, tried in order; an entry may carry a scheme, so a self-hosted instance is `http://localhost:3100`. See *[The French translator](#the-french-translator)*. |
| `LINGVA_TIMEOUT_MS` | How long to wait for an instance. Default `12000`; raise it for a self-hosted one that spins down. |
| `CHAT_WINDOW_MINUTES` | Length of that window. Default `30`. |

Without a key:

- **Translation** falls back to [MyMemory](https://mymemory.translated.net/) (free, no key, daily quota).
- **Example sentences** fall back to a per-part-of-speech template, labelled as such in the UI.
- **Chat** answers from the site's own data and declines the rest.

## Where things live

Files marked **·fr** or **·la** are the French or Latin counterpart of the one
above them.

```
server/
  index.js              express app: /api routes, static files, SPA fallback
  quota.js              sliding-window allowance — one bucket, both languages
  llm.js                picks a provider — free tiers first
  corpus.js             Tatoeba sentences and Wiktionary glosses, either language
  throttle.js           three lanes onto Wikimedia, so a whole class at once
                        does not draw a 429
  translators.js        the engine chain; every engine takes the pair as codes
  idioms.js             one idiom table per language
  dictionary-fr.js   ·fr the Wiktionnaire, parsed from wikitext
  latin.js           ·la Whitaker's Words: principal parts, and the parse of
                         any form, ranked by how common each headword is
  latin-check.js     ·la parses a translation and corrects a wrong case
  providers/            gemini.js, groq.js, anthropic.js, openrouter.js
  routes/
    translate.js        dedicated engines, never a model
    dictionary.js       picks a dictionary by `study`, then normalises both
                        into one shape
    verbs.js            RAE's own conjugation tables, normalised to our shape
    chat.js             SSE streaming chat
public/
  index.html            app shell
  styles.css            the whole design system
  js/
    app.js              history-API router
    lib/study.js        the language the site is *about*, and the mode command
    lib/conjugator.js   the Spanish conjugation engine
    lib/conjugator-fr.js ·fr the French one: two stems, two auxiliaries
    lib/conjugator-la.js ·la the Latin one: five conjugations, both voices,
                             built from the principal parts
    lib/decliner-la.js ·la the five declensions, and the adjectives
    lib/latin-lookup.js ·la fills in a missing genitive, refuses a wrong one
    lib/restriction.js  the subjects a teacher has left available
    lib/network.js      the hero node network
    lib/markdown.js     DOM-building markdown renderer (no innerHTML)
    lib/tutor.js        intent routing for the chat — shared by both languages
    lib/tutor-es.js     what the router needs to know about Spanish
    lib/tutor-fr.js  ·fr the same, for French
    lib/tutor-la.js  ·la the same for Latin, plus the two intents only it has
                         — declining a noun, and looking up a course stage
    lib/chat-session.js the conversation, held outside the view so navigating
                        away cannot interrupt an answer
    lib/theme.js        dark/light switching
    lib/tape.js         the X that seals the chat when the allowance is gone
    lib/wallpaper.js    the Madrid photo: parallax, scrim, scroll fade
    lib/i18n.js         every interface string — one table per study language
    lib/language-switch.js  the ES/EN — or FR/EN — switch and its passcode gate
    data/grammar.js     22 grammar explanations, Spanish and English
    data/grammar-fr.js ·fr 23 more, French and English
    data/verbs.js       stem changes, irregulars, the search index
    data/verbs-fr.js ·fr irregulars, the -er spelling exceptions, 232 verbs
    data/grammar-la.js ·la 26 more, English only — see The Latin side
    data/verbs-la.js ·la principal parts, irregulars, deponents, 133 verbs
    data/stages-la.js ·la the course vocabulary, hand-compiled, Books I–III
    views/              one module per page, driven by the study language
    views/declensions.js ·la the five declensions
    views/stages.js  ·la vocabulary by stage
test/
  conjugator.test.js       204 reference forms checked against RAE paradigms
  conjugator-fr.test.js ·fr 163 checked against the Bescherelle paradigms
  latin.test.js         ·la 172 on the declension and conjugation engines, the
                                number a corrected case takes, and the course data
  markdown.test.js          20 on the renderer, mostly that tables are tables
  conjugator-view.test.js  981 that the page's tense lists match every engine,
                               and that every verb in every index conjugates
  tutor.test.js             52 checks on intent routing and the form index
  tutor-fr.test.js      ·fr  64 that the French pack drives the same router
  tutor-la.test.js      ·la  38 on the Latin pack and its two extra intents
  corpus.test.js            13 checks on sentence ranking and gloss extraction
  translators.test.js       42 checks on engine order, names, the agreement rule
                               and the rest a failing Lingva instance is given
  idioms.test.js            17 checks on idiom pairing in both directions
  quota.test.js             18 checks on the sliding window and refunds
  identity.test.js          15 checks on per-browser identity and its signature
  lock.test.js              20 on the padlock's two switches, against a real
                               express app, and that neither reaches the other
  openrouter.test.js        20 checks on the guards that keep OpenRouter free
```

`npm test` runs all 1,856, offline, in a couple of seconds.

## The conjugation engine

There are three, one per language: `public/js/lib/conjugator.js` for Spanish,
`conjugator-fr.js` for French and `conjugator-la.js` for Latin — see *[The French
conjugator](#the-french-conjugator)* and *[The conjugator](#the-conjugator)* for
the other two, and `decliner-la.js` for the declensions Latin also needs. All
build paradigms from rules rather than a form table.

`public/js/lib/conjugator.js` applies its rules in this order:

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

Neither French nor Latin has an equivalent to merge — the Académie française
publishes no API, and Whitaker's is a parser rather than a table of paradigms —
so there the local engine *is* the table and the badge is left off rather than
claiming an authority behind it.

## Deploying

This is a Node server, not a static site, so GitHub Pages and Netlify's static
hosting cannot run it — the chat, dictionary and lock all need the server.
Anything that runs Node works: Render, Railway, Fly.io, or a VPS.

Whatever you pick, it needs to be **one instance**. The allowance, the teacher's
lock and the dictionary cache are all held in memory, so a second instance would
have its own copy of each — a locked site would be unlocked for half the class.

### Render

There is a `render.yaml` in the repo, so this is a Blueprint rather than a form
to fill in:

1. *New → Blueprint* on Render, and point it at this repository.
2. It reads `render.yaml` and prompts for the keys marked `sync: false`.
3. Deploy.

The Blueprint pins **one instance** and a `/api/health` check. The instance
count is not a performance choice — see below.

To do it by hand instead: build `npm install`, start `npm start`, instance
count 1, and set the variables below.

**Change the three passcodes before anyone has the URL.** `TEACHER_PASSCODE`,
`RESTRICT_PASSCODE` and `RELEASE_PASSCODE` all have defaults, and the defaults
are in the source of a public repository — anyone who reads it can lock your
site or narrow it to Spanish. The English-interface passcode in
`public/js/lib/i18n.js` is client-side and therefore public by construction; it
keeps a class honest, and nothing more.

The server already reads `PORT` from the environment, binds on all interfaces,
and exposes `GET /api/health` for a health check.

### Environment variables in production

| Variable | Why it matters live |
| --- | --- |
| `SESSION_SECRET` | Keeps browser identities, and therefore allowances, across restarts. Without it a restart hands everyone a fresh five. |
| `TRUST_PROXY=1` | Set when behind a load balancer. Only affects the address fallback now that identity is per browser, but still worth getting right. |
| `GEMINI_API_KEY` | Free tier, ~20 requests a day. Fine as the first tier, not as the only one. |
| `OPENROUTER_API_KEY` | The overflow, and in practice where most traffic lands. Free models only. |
| `RAE_API_KEY` | **Get one.** Anonymous dictionary access is 100 lookups a day, which one class will exhaust. Free at <https://rae-api.com/login>. |
| `TEACHER_PASSCODE` | **Change it.** The default is in a public repo. |
| `RESTRICT_PASSCODE` | **Change it.** Same reason — it narrows the site to Spanish. |
| `RELEASE_PASSCODE` | **Change it.** Same reason — it opens the subjects again. |
| `LINGVA_INSTANCES` | Worth setting. Without a working instance, French and Latin translation falls to MyMemory alone. |
| `CHAT_FREE_LIMIT` | Off-topic questions per visitor per window. Default 5. |

### Things that will surprise you otherwise

- **Free tiers sleep.** Render's free plan spins down when idle; the first
  request afterwards is slow, and the lock and allowances reset. That reset is
  harmless — arguably a feature for the lock — but the delay is visible.
- **The lock clears on every deploy and restart**, by design. Nobody should be
  locked out by a process nobody is watching.
- **Rotate any key that has ever been pasted into a chat, an issue or a commit.**
  Keys belong in the host's environment settings, never in the repo; `.env` is
  gitignored for that reason.

## Notes

- Dictionary data comes from [rae-api.com](https://rae-api.com), which serves
  the RAE's *DLE* as JSON. `dle.rae.es` itself blocks direct requests.
  Anonymous access is **10 requests a minute and 100 a day** — enough for
  development, not for a class. A free self-service key at
  <https://rae-api.com/login> raises it to **60/minute and 5,000/day**; set
  `RAE_API_KEY` and it is sent automatically. Being rate-limited surfaces as a
  429 with a "come back in N minutes" message rather than a generic failure.
- The model-backed paths (off-topic chat, model translation, generated example
  sentences) have not been exercised against a live API — no provider key was
  available when they were built. The Gemini and Groq request shapes come from
  their current docs; the Anthropic one is verified against the SDK. Every path
  that runs *without* a key has been tested end to end.
