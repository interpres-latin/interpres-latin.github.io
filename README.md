# Interpres

A Latin site: a two-way translator, complete conjugation and declension tables,
Whitaker's Words, and a tutor that answers from the site's own data.

```bash
npm install
npm start          # http://localhost:4000
```

No build step. The frontend is plain ES modules served straight out of `public/`.

Latin and English, in both directions, and nothing else. There were once a
Spanish side and a French one behind the same pages; they are gone, along with
everything that existed only to serve them — the RAE, the Wiktionnaire, and the
four free translation engines that could not do Latin anyway.

## The five pages

| Route | What it does |
| ----- | ------------ |
| `/` | Hero with an animated node network; the **translator**, which builds its Latin from the site's own grammar rather than asking an engine; and a **dictionary search** that opens the dictionary page with your query already applied. |
| `/conjugacion` | Every tense of the indicative, subjunctive and imperative, active and passive, across the five conjugations. Tabs for the model verbs, plus a search that conjugates anything you give principal parts for. Irregular forms are highlighted. |
| `/declinationes` | The five noun declensions and the adjectives, in every case and number. Takes a noun the way a dictionary quotes it — nominative and genitive — because the genitive is what says which declension it is. |
| `/diccionario` | Whitaker's Words: the headword with its principal parts, and every way the form you looked up can be read. Real example sentences where a corpus has them, and a spoken pronunciation. |
| `/chat` | The tutor. Answers about Latin from the conjugator, the decliner, Whitaker's and a set of grammar notes; anything else is turned away rather than invented. |

**Stadia** — the Cambridge Latin Course vocabulary by stage — lives in the
**More** menu in the header rather than in the top row. More tools are coming
and the header is the wrong place to grow one at a time; the menu is the shelf
they go on.

## The translator

The centre button flips the languages and carries the text across. Type and it
translates once typing pauses; ⌘/Ctrl + Enter translates immediately.

Two controls sit under the result, and both are usually absent.

**See more information** opens a panel over the page with the whole working: the
source, the result, which engine produced it, any warning about the sentence as
a whole, every Latin word with its meaning and the case, number, tense and mood
it is in, and — coming out of Latin — the two readings the sentence was checked
against each other. That breakdown used to be printed under the pane, and coming
out of Latin it *was* the answer: the page handed back a row of `word — meaning
(case)` and left the reader to assemble it. It is one click away now instead of
in the way.

**Report a problem** is offered on every translation. It used to appear only
when a word came back that was not Latin, which stopped being the common failure
once the sentence routes started reaching for a synonym instead of giving up on
a word — so the button that reported problems was the one thing you could not
use when there was one.

It opens with five reasons to pick from — the word was not translated, wrong
Latin word, wrong grammar, formatting, something else — because a free-text box
alone gives a log nobody can sort, and because picking one is a click where
writing a sentence is a decision.

What lands in `logs/reports.txt` is the whole picture, not the complaint: the
reason, the direction, the words that failed, **what you typed, what came back**,
the check's verdict, and the word-by-word breakdown the sentence was built from.
That last one is there because "wrong grammar" is rarely diagnosable from the
two sentences alone — what went wrong is almost always one word the parser
misread, and that is in the breakdown. A line in the log stands on its own
rather than having to be reproduced. It used to be a
strike-through over the whole translation, which tells a student their sentence
is wrong and offers them nothing to do about it. A word with no Latin is a gap
in the lexicon, and the reader who hit it is the person best placed to say so.
The button opens a form with the words already filled in and room for a note,
and what it sends is appended to `logs/reports.txt` — a plain text file, because
the point is that somebody reads it and adds the words. See
`server/routes/report.js`, and `REPORT_LOG_DIR` if the log should live somewhere
a deploy will not overwrite.

The words themselves are still marked in the sentence — a colour and a dotted
rule, not a strike. That says "this word came through untouched", which is what
tells the reader what the report is about.

### Translating Latin without an engine

Latin is the one language nothing will translate. DeepL has no pair for it,
Apertium has no route to it in any direction, and MyMemory returns *dog de
puella* for "the dog of the girl" and *puella complens the Farmer* for "the boy
praises the farmer" — and, asked for Latin at all, will happily answer in
Malagasy. For a while a model filled the gap; no model is in the translation
chain now either. Latin cannot simply be left broken.

So the site translates Latin itself, from parts it already had. Four sources, each doing the one thing it is good at:

| | |
| --- | --- |
| **Whitaker's Words** | morphology. Given a form it says the case, number, tense and mood, which is the thing nothing else here can do. |
| **the decliner and conjugator** | building the forms back up, from principal parts. |
| **the course vocabulary** | which word means which — 571 Cambridge pairs, plus about sixty core words the course skips, *agricola* among them. Asked first, so a class taught *villa* for "house" is given *villa*. |
| **Wiktionary** | everything the course list does not have, which is most of the language. Its `{{t|la|…}}` translation tables answer English→Latin; its Latin entries gloss Latin→English; and its `la-noun` headwords state the declension. |

**Why four and not one.** Each of them is wrong about something, and the others
know it. Whitaker's writes for a parser, so *laudo* is "recommend" before it is
"praise" and *carmen* is "card for wool" before it is "song". Its genitives
cannot always be built on: it gives the syncopated *filius, fili*, so a decliner
working back from it makes the stem "fil" and renders "son" as *filum*, thread.
Wiktionary has none of that trouble and cannot parse an inflected form at all.
The course list is the most reliable of the three and covers 571 words.

**Choosing between readings** is most of the remaining work, and three rules do
it. Closed classes before open ones — the language has a few dozen pronouns and
thousands of verbs, so a form that could be either is almost always the pronoun,
which is what stopped *id* being read as "go". Then how common Whitaker's says
the word is, which is a field it ships and which settles *sum* against *sumo*.
Then how ordinary the form is: a plain present indicative active before a
pluperfect passive subjunctive, a nominative singular before a vocative plural.

**Latin → English is nearly assembly**, because Latin says its grammar out
loud. A noun in the accusative *is* the object; it does not have to be inferred
from where it is sitting. Every word is parsed, each case is read as the role it
marks, and the pieces are laid out in English order:

```
puer agricolam laudat        →  The boy praises the farmer
canis puellae                →  The dog of the girl
servus in villa laborat      →  The slave works in the house
puer puellae pecuniam dat    →  The boy gives the money to the girl
servi laborabant             →  The slaves were working
puer bonus agricolam laudat  →  The good boy praises the farmer
laboro                       →  I work
puer non laborat             →  The boy does not work
```

**The subjunctive, and the mood English mostly lost.** A subjunctive is a finite
verb like any other, and it was not being treated as one — it was not accepted
as the verb, was not a noun either, and *fell out of the sentence*, so "puer
laudet" translated as "The boy". English keeps just enough to say it with:

```
puer laudet                  →  The boy may praise
si puer laudaret             →  If the boy were to praise
utinam puer laudet           →  I wish the boy would praise
utinam mortuus essem         →  I wish I were dead
puella laeta est             →  The girl is happy
```

That last pair needed two more rules. *sum* takes a complement rather than an
object, so a nominative that describes — an adjective, or a participle like
*mortuus* — belongs after the verb and not in front of it; read as a subject it
gave "I wish the dead were". And an adjective **agrees** with its noun, which is
the answer before any preference is consulted: *laeti* is nominative plural and
genitive singular, and in "pueri laeti sunt" it plainly goes with *pueri*.
Without that the free case was taken instead and the sentence read "The boys of
happy are".

**Nothing may be silently dropped.** Every one of those bugs had the same shape:
a word was parsed, could not be placed, and was skipped — leaving a confident
translation with a piece of its meaning removed, and no sign to the reader that
anything had gone. A word this cannot account for now throws, at the parse and
again at the assembly, and the chain below gets its turn instead.

**English → Latin is the harder way**, because English hides what Latin states,
and the little words carry it instead: what precedes the verb is the subject,
what follows it is the object, "of" is a genitive, "to" a dative, "with" an
ablative. Each word is looked up, put into the case its role calls for, and
emitted in conventional Latin order — subject, then the rest, then the verb:

```
the boy praises the farmer       →  puer agricolam laudat
the farmers praise the girl      →  agricolae puellam laudant
the dog of the girl              →  canis puellae
the boy gives money to the girl  →  puer pecuniam puellae dat
the sailor walks with the friend →  nauta cum amico ambulat
I work                           →  laboro
the boy does not work            →  puer non laborat
the boy praised the farmer       →  puer agricolam laudavit
the good girls praise the farmer →  bonae puellae agricolam laudant
the boys are happy               →  pueri laeti sunt
I am happy                       →  laetus sum
the boy sees him                 →  puer eum videt
```

Five things had to be added before that list was true, and each one is a place
English and Latin disagree about what a word is for:

| | |
| --- | --- |
| **pronouns** | A subject pronoun translates to *nothing*: Latin puts the person in the ending and writes *ego* only for emphasis, so "I work" is one word. Before this it failed outright for want of a Latin word for "I". Object pronouns *are* written, and are supplied already in their case. |
| **the past** | "praised" is *praise* with a d and *prais* with an ed, and only the lexicon knows which — so the verb is looked for under every form it might be hiding behind rather than one guess. |
| **the copula** | *sum* takes a complement, not an object, and the complement is nominative and agrees with the subject: "the boy is good" is *puer bonus est*, never *puer bonum est*. The agreement comes from the subject, not from the complement's own words — "the boys are happy" has nothing plural in *happy*. |
| **the negative** | "does not work" is *non laborat*. The auxiliary carries nothing Latin needs and the negative is a word of its own, placed before the verb. |
| **the noun of a phrase** | The head is the **last** word that can be a noun, because that is where English puts it. Taking the first match made *good* the head of "the good boy" and dropped *boy* on the floor — *bonus agricolam laudat*, a sentence about nobody. |

One more, found by that last rule: Whitaker's prints adjectives compressed, the
way a paper dictionary does — `laetus, laeta -um, laetior -or -us` — with the
neuter as a bare ending and the comparative thrown in. Passed on as they stand
they produced *laetaes*, which is not a word in any language.

Ambiguity is the whole difficulty, and the sentence resolves it. *puellae* is
genitive, dative and nominative plural at once: a sentence with a verb and an
object wants "gives the money **to the girl**", a phrase with neither wants "the
dog **of the girl**". *canis* is both "dog" and "you sing", so a word that is
also a noun is only read as the verb when it stands last or when nothing else
can be one. Going the other way, English gives one cheap signal worth more than
it looks — a word after "the" is a noun — without which "the dog of the girl"
came out as *puellae canit*.

**Anything else that answers in Latin says so.** The word-by-word check cannot
catch a sentence that is wrong while every word in it is real: "I wish I were
dead, I really do" comes back from MyMemory as *Ego sum mortis, ego sum*, which
is Latin, and is not what was asked. Nothing on the open web translates Latin
reliably, so a Latin translation this engine did not build is marked uncertain
whatever it looks like, and the page says which kind of doubt it is.

**Subordinate clauses, and the subjunctive.** A sentence is cut at the words
that mark a clause — *I wish*, *if*, *when*, *because*, *so that*, *although* —
and at its commas, and each clause is built on its own in the mood its marker
calls for:

```
I wish I were dead                   →  utinam mortuus essem
I wish the boy were happy            →  utinam puer laetus esset
if the boy praises, the farmer works →  si puer laudat agricola laborat
when the girl works, the boy sleeps  →  ubi puella laborat puer dormit
the boy works because he is happy    →  puer laborat quod laetus est
```

The mood is decided inside the clause, because only there is it known whether
the thing is real. "If the boy praises" is a plain condition and stays
indicative; "I wish I were dead" is about what is *not* the case, and English
marks that the same way Latin does — with a past form that has nothing to do
with the past. That is the imperfect subjunctive, *essem*.

Two smaller things fell out of building it. *mortuus* is the participle of
*morior*, which Whitaker's files as a verb, so asking for an adjective found no
word for "dead" — a participle in *-us* declines exactly as an adjective does,
so where the dictionary offers none and the word has that shape, the citation is
built from the word itself. And "…, I really do" is a whole English clause
carrying no content, which Latin says with one adverb: *vere*.

**It still declines rather than guesses**, and it now declines *by name*.
Relative pronouns, indirect statement and the ablative absolute are recognised
and refused rather than merely survived — which matters more than it sounds,
because every word of *urbe capta milites redierunt* is placeable and the
sentence was coming out as "Take returned the soldiers to the city",
confidently and completely wrong.

### When the grammar is beyond it, the vocabulary is not

Those three constructions still have to answer something, and what they used to
answer was a translation memory that renders Latin as *Ego sum mortis*. So there
are two glossaries beneath everything else, and they sit in different places on
purpose.

**Out of Latin, word by word** — every form with the grammar actually on it, and
*all* its readings, since *urbe* being ablative or dative is exactly what the
reader needs to weigh:

```
urbe — city (abl. sg. / dat. sg.) · capta — take (nom. pl. / acc. pl.) ·
milites — soldier (nom. pl. / acc. pl.) · redierunt — return (3rd pl. perfect)
```

This waits at the very bottom of the chain: it is the last thing tried, because
a sentence beats a list whenever a sentence can honestly be had. It is what a
deployment with no model still gets, and it is no longer what anybody reads
first — see *[Reading it twice](#reading-it-twice)*.

**Into Latin, the words in Latin order** — and this one sits directly under the
rules translator rather than at the bottom. That is not symmetry but
measurement: a heap of half-translated words is something a reader could copy
out believing it, and dictionary forms in the right order are less than a
translation and worth more, because they are true.

The order is not guesswork even where the grammar is. Latin drops a pronoun
subject its verb already carries, so *ego* goes; the verb goes last, because
neutral Latin is subject–object–verb and leaving *est* where English put it
gives a sentence that reads like English wearing Latin words; and a modal
follows the verb it governs. "It is not worth it" comes out *id non pretium id
est* rather than a column of "word — word". A word with no Latin stays visible
in brackets rather than vanishing out of the middle of a sentence.

Both are labelled on the page as what they are — not a sentence, and not to be
copied as one. Neither can be wrong about the grammar, because neither claims
any. A translator that quietly invented Latin would be worse than one that
admits the sentence is beyond it, because the reader cannot tell the difference
and is here to learn. Latin output is still checked word by word afterwards, as
it always was.

### Reading it twice

The gloss above is true and nearly useless to read. This is a real answer the
site used to give:

```
non — not · itio — ? · magnus — big (nom. sg.) · vita — life (nom. sg. /
voc. sg. / abl. sg.) · est — is (3rd sg. present) · ita — so
```

Every piece of that is correct and the reader still has to do all the work. So a
model assembles it into a sentence — which is the one thing the rest of this
site refuses to let a model do, because a model asked to translate Latin
produces fluent, confident and occasionally invented English.

**The answer is to ask twice, along two routes that fail differently.**

1. **Directly.** The Latin goes to the model as Latin.
2. **From the pieces.** The same sentence goes as the word list — every word
   with its meanings and the grammar a parser found on it — and the model is
   asked only to assemble what it is given.

Neither route sees the other's answer. A hallucination in the first has no
reason to match a hallucination in the second, so a sentence both routes arrive
at independently is one the morphology and the model both support. Agreement is
evidence; disagreement is a warning, and the page shows it rather than hiding
it. Both readings and the whole word list live behind **See more information**.

**The direct route is what you read.** The first version showed the grounded one
whenever the two differed, on the reasoning that it had the cases and tenses in
front of it. Measured against real sentences that was plainly wrong:

| | *quod me nutrit me destruit* |
| --- | --- |
| direct | that which nourishes me destroys me |
| grounded | Because you urinate, it suckles; you urinate, it demolishes |

The grounded route is only ever as good as the gloss it is handed, and the gloss
had read *me* as a form of *meio*. Given that, the model assembled exactly what
it was told to — faithfully and uselessly. A route that inherits a wrong word
cannot recover from it; a route reading the Latin can. So the second route is a
**check**, not a candidate.

**It is a much better check since it started seeing alternatives.** The gloss
commits to one reading per word because a line of text has room for one, and
that ranking is a heuristic — it read *veni* as the genitive of *venum*, "sale",
rather than "I came", which is defensible in isolation and hopeless in *veni
vidi vici*. The reader still sees the winner; the assembling route now gets
every reading and picks the one that makes a sentence.

**Counting shared words is not enough to compare them.** "The die is cast" and
"the die has been thrown" are the same sentence and share one content word out
of three, so a check built on word overlap alone flags nearly everything — and a
warning that always fires is a warning nobody reads. Where the words already
agree, that settles it for free. Where they do not, the model is asked a third
question with a one-word answer: do these two readings mean the same thing?

```
alea iacta est          agreed    the die is cast          / a die is thrown
carpe diem …            partial   seize the day, trusting… / pluck the day, trust…
quod me nutrit …        differs   that which nourishes me… / because me to suckle…
```

**Nothing changes without a model.** No key, and the chain falls through to the
gloss exactly as before — same words, same order, same caveat on the page.

### Why the second reading was so often wrong

The check kept firing, and the user was right to ask why: a model handed English
meanings and the grammar of each word ought to agree with a model reading the
Latin far more often than it did. Three things were feeding it bad pieces.

**The gloss and the grammar were different words.** This is what the page showed
for *me*:

```
me — me [2nd sg. present]
```

The gloss is the course's word for *me*, the pronoun. The grammar belongs to
*meio*, "to urinate" — the reading the parser ranked first. Two different words
on one line, because the gloss was resolved from the *surface form* while the
grammar came from the *analysis*. Anything reading that as a pair is being told
something untrue, which is how *quod me nutrit me destruit* became "because me
to suckle me to destroy". A reading's gloss and its grammar now come from the
same reading.

**The parser has no pronouns.** Asked about *me* the morphology service answers
with exactly one reading, and it is the verb. So the personal and reflexive
pronouns are a table now, checked before the parser like the particles and
prepositions already were — about thirty forms that have not changed in two
thousand years, and among the commonest words in the language.

**The meanings are dictionary entries, not English.** *defendit* is glossed "I
defend" and is third person singular; the assembling model was told to use only
the meanings it was given, so it did, literally. It is now told that the pieces
are dictionary forms and that inflecting them is its job.

Measured across the same sentences afterwards: *quod me nutrit me destruit* went
from `differs` to `partial` and now reads "Because it suckles me, it destroys
me"; *urbe capta milites redierunt* and *cogito ergo sum* went to `agreed`. What
still disagrees traces to specific holes in the morphology service rather than
to the design — *veni* comes back as a present, *iacta* as a noun.

**The second reading is not shown.** It exists to disagree. Printing a wrong
sentence beside the right one asks the reader to weigh two things they have no
way to weigh; the verdict is what they can use.

### Comparatives and superlatives

*kinder* came back as *benignus* — the positive. Wiktionary answers "kinder"
with "comparative of kind", the lookup followed that pointer, and the degree was
the one thing it threw away.

The degree is taken off first now, the adjective behind it resolved, and the
Latin form read from the Latin dictionary — where Whitaker's prints all four:
*benignus, benigna -um, benignior -or -us, benignissimus -a -um*.

Four things had to be got right, and each was found by it being wrong:

- **Read by shape, not by position.** *validus, valida, validum* is three
  genders and no degrees; taking the third part made *validum*, the neuter, the
  comparative of "strong". A comparative ends in *-ior*, a superlative in
  *-imus*.
- **Build what the dictionary omits.** Whitaker's lists no degrees for plenty of
  ordinary adjectives, so the regular rule fills in — with the exceptions every
  course teaches: *-er* doubles to *-errimus*, and the six in *-lis* give
  *-limus*, so *facillimus* and not *facilissimus*.
- **The suppletives are written out.** *malus* is not *malior, malissimus*.
- **Check the base is really an English adjective.** Stripping *-est* off
  *biggest* leaves *bigg*, which is a kind of barley — so it resolved, and
  "biggest" came back as *benignissimus*, the superlative of "kind", arrived at
  through a cereal. *kinde* is an attested spelling of *kind* whose definition
  is "obsolete form of kind", and reading that definition gave *obsoletior*.

And the degree had to survive the declining. Whitaker's answers *longior* with
the whole family, so building the citation from its principal parts started
again at the base and "a longer road" came out *longa via*. A comparative keeps
its own citation and declines as a two-termination adjective; a superlative as
an ordinary first-and-second. *maxima urbs*, *benignior puella* — agreement and
degree at once.

### Two gaps this closed

**Whitaker's does not know every word.** *itio* is an ordinary noun — "a going" —
and it came back as `itio — ?` from a sentence that had otherwise decoded fine.
Wiktionary has it, and the gloss was the one path that never asked: it now
primes the whole sentence in one batch before glossing any of it.

**A word nothing has a meaning for is reportable.** It joins the untranslatable
words under the report button, so the gap goes into `logs/reports.txt` instead of
being a question mark the reader can do nothing about.

### The chain, end to end

Four engines, tried in order, and none of them is a language model:

| | |
| --- | --- |
| **Wikipedia** | names and titles. Machine translation renders them literally; Wikipedia's cross-language links hold the established name instead. Looking up what Latin actually calls a thing is not a guess. |
| **the rules translator** | the site's own grammar, both directions. See above. |
| **the English→Latin glossary** | dictionary forms in Latin word order, when the grammar is beyond the rules. |
| **the assembled sentence** | Latin→English only, and only with a model: read twice and checked against itself. See above. |
| **the Latin→English glossary** | every form with its readings, last of all, and the whole answer when there is no model. |

Lingva, MyMemory, Apertium and DeepL are gone with the Spanish and French sides
they were built for. Not one of them could do Latin, and one was worse than
useless at it: "…the First World War hero who died in the Cuban Missile Crisis"
came back from MyMemory as "…maherifo Worlde, izay maty tao amin'ny Krizin'ny
Balafomanga Kiobana" — a real translation into a language nobody asked for,
wearing enough Latin to pass a glance. The chain is this site's own code from
end to end, apart from the encyclopedia and the morphology behind it.

### Phrases Latin says its own way

Word-by-word is the wrong tool for an idiom, and no amount of grammar fixes it.
"How much does this cost" is five English words and two Latin ones — *quanti
constat* — because Latin puts the price in the genitive and has no word for "how
much" at all. Glossed a word at a time it comes out *quomodo multus magis hic
consto*, which is not a sentence in any language.

So `server/latin-idioms.js` holds about thirty of them, checked **before** the
rules translator, because a rule applied to an idiom is confident nonsense:

```
how much does this cost  →  quanti constat
it is not worth it       →  non tanti est
I can't take it anymore  →  non iam ferre possum
I love you               →  te amo
```

It is hand-written and unapologetically so. An idiom is by definition the thing
a general rule gets wrong, which makes this the one place where a list is the
right shape rather than a gap waiting to be filled.

## The chat page

The tutor answers from data the site already holds — the conjugation engine, the
decliner, Whitaker's Words, the course vocabulary, and a set of hand-written
grammar notes. Nothing it says about the language is generated, so nothing about
the language can be invented. The cost is that its scope is finite, and it says
so rather than bluffing.

### Two answers, not three

What happens to a question depends on whether the site can ground it, and
nothing else.

**A question the site can ground** is answered immediately, from the site's own
data, and costs nothing. Conjugations, declensions, parses, stage vocabulary,
dictionary entries, translations, the grammar notes. This is most of what
anybody asks a Latin site.

**Anything else** goes to the model, whatever it is about.

There was a third case for a while, and it is worth recording why it went. Any
question that did not look like it was about Latin used to be turned away
unanswered, on the reasoning that a classroom should not be handed a general
chatbot on the school's key. This is not a classroom — it is one person's site —
so the gate came off both ends: the browser no longer classifies the subject,
and the system prompt no longer instructs the model to refuse.

### One incidental word is not a topic

Taking the gate off exposed something the gate had been hiding. Asked *"what is
a good way to cook risotto"*, the tutor answered with a note on **the dative** —
confidently, and without consulting the model, because it believed it had
grounded the question.

The dative's keyword list contains **"to"**, which is right: it *is* "the *to*
or *for* case", and that is how somebody would look it up. But a single keyword
match scored 3 and the bar for answering was 3, so one of the commonest words in
English was carrying a topic on its own.

Raising the bar is the obvious fix and the wrong one — it breaks *"what is the
genitive"*, which is also a single keyword and is also a real question. The
weight is what was wrong, not the threshold. Four keywords across the whole
grammar are ordinary English — *of*, *to*, *for*, *when* — and they now score 1
instead of 3: enough to break a tie between two topics that otherwise match
equally, never enough to decide alone. An exact match still short-circuits to
100, so *"the dative"* is unaffected.

Measured across two dozen questions, that changed the answer to exactly five —
risotto, the airport, dinner, the train to London, a good book to read — and to
no grammar question at all.

### No allowance

There was one: five questions per browser per half hour, metered by a signed
cookie, with tape that rolled across the chat panel when they ran out.

It was there because a class of twenty-five asking a chatbot whatever they liked
would empty a free tier by lunch, and because the school's key was paying. There
is no class. Both reasons went with it, so the allowance did too — along with
`server/quota.js`, the per-browser identity that fed it, `SESSION_SECRET`, and
the tape and toast components that had nothing else to say.

The trade is worth stating plainly, since nothing now caps anything. With a free
Groq key there is nothing to spend either way. With `ANTHROPIC_API_KEY` set
instead, the only limit is the spend limit on the account — which is where a
limit of that kind belongs.

### The model

Two providers, tried in order: **Groq** (free) and then **Anthropic** (paid).
Whichever is configured. Without any key the tutor still answers everything it
could ground anyway, which is most of the page.

Gemini and OpenRouter were in this chain and are not any more.

The same chain serves the translator's Latin→English route — see *[Reading it
twice](#reading-it-twice)* — and the dictionary's example sentences. Nothing
else on the site touches it.

**Groq's default model here reasons before it answers, and that reasoning comes
out of the token budget.** At 400 tokens the short prompt was fine while the
long one thought its way through a whole word list, hit the cap, and returned a
*successful response with nothing in it* — not an error, just silence, which
read as "that route declined" and quietly halved the check. The budget is 1500
now. It is worth knowing about before debugging an empty string.

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
wrong palette. It follows the system setting until you press the toggle, then
remembers. Colours that get painted to canvas — the hero network, the wallpaper
strength — are CSS custom properties the JS reads back, so the palette has a
single home.

Icons are drawn sprites in `public/js/lib/dom.js`, not emoji or text glyphs:
those render differently on every platform and the hairline ☀/☾ characters
disappeared against the header. Solid bodies with stroked details, because an
all-outline speaker turns to mush at the 16px they run at. Each was rendered at
real size in both palettes before being wired in.

**The favicon is a temple and a translation mark in one drawing.** The pediment
is doubled: a second temple front of the same size sits behind and up to the
right, offset the way the two panels of a translation logo overlap. Two bare
triangles read as a mountain range, which is what the first attempt looked like
— the bar under the back one is what makes the pair read as two of the same
thing, one behind the other. There is no background plate, so the silhouette is
the icon rather than a square badge with a picture on it, and it sits on a light
tab and a dark one alike. Three columns rather than four, and nothing narrower
than five units in a 64 box: at 16px a column is one pixel and a gap is one
pixel, and a fourth turns the colonnade into a grey smear. It was checked by
rendering it at 16 and 32 and looking at the pixels, not by trusting the vector.

**Inter** throughout — headings uppercase at weight 700 with `letter-spacing:
-0.03em`. A system monospace is kept only for literal code inside chat replies.
Flat colour: no gradients, no rounded corners.

Between the translator and the dictionary search, a photograph fades in behind
the page and parallaxes against the scroll: **the Colosseum at night in the dark
palette, Rome by day in the light one.** Two photographs, each a webp with a
jpeg fallback. Madrid and Paris went with the languages they belonged to.

A theme-coloured scrim keeps the text in front readable. **It is lighter than it
was** — the photograph was being masked to the point of being a texture rather
than a picture, so the hero scrim came down from 0.62 to 0.46 and the wallpaper's
from 0.55 to 0.38 (0.72 to 0.56 in the light palette). The chat keeps the heavy
one: it is long-form text over the busiest part of the frame, which is a
different problem.

It runs behind the hero and the translator on the home page, and as a band
behind the header on the conjugation and dictionary pages, fading out as the
next section rises into view.

Both sources are about 1024 px wide, which is well short of a modern display, so
the photo carries a 1.5 px blur: it turns the upscaling softness into something
that reads as depth of field instead of as a low-resolution image. **For
genuinely higher resolution, drop a larger original into `public/assets/` under
the same names** — nothing in the code assumes the current dimensions. This
matters more now that the scrim is lighter: less cloth over the photograph means
more of the photograph to see.

The image is declared as a plain `url()` followed by an `image-set()`, rather
than through a custom property. A `var()` whose value a browser cannot parse is
invalid at computed-value time and resets to *initial* — it does not fall back
to the previous declaration — which is how the photo silently disappeared once.

The hero hands over to the translator with a soft dissolve rather than a hard
edge: the hero is masked out over its last stretch while the wallpaper is
already fading up underneath it.

The highlight colour is blue — `#4d8dff` on the dark palette, `#1d5fd0` on the
light one — with teal marking the English side of the translator so the two
panes stay distinguishable.

**The detail and report panels are one component.** Both open the same overlay,
so the focus handling and the three ways out — Escape, the backdrop, the close
button — are written once. It is a plain element rather than a `<dialog>`: the
page already has its own scrim and card styling, and a modal dialog's backdrop
cannot be themed alongside them. On a narrow screen it fills the viewport
instead of floating in it.

**A dropdown says it is one.** The second and third declension tabs carry an
arrow, and open their menu on any click. It used to be a middle dot — a mark,
not a signal: it said something was there without saying it opened.

**The More button is a button dressed as a link.** Every declaration in its rule
matches `.nav__links a`, and that is not laziness — it sits in the same row and
has to read as one of them. `font: inherit` was not enough on its own: it picked
up the body's 16px and 1.65 line-height, so the word sat a size large and a
pixel low against its neighbours, and `color: inherit` made it the wrong grey.
The transparent bottom border is what puts it on the same baseline as a link
that can be underlined. Its chevron is drawn in CSS rather than iconified, and
turns to point at the menu it opened.

## Configuration

**Everything works with no setup at all.** The translator, the conjugator, the
decliner and the dictionary's definitions use no key and no model. Copy
`.env.example` to `.env` only to add the two things that do:

| | |
| --- | --- |
| `GROQ_API_KEY` | free. Answers a Latin question the site cannot ground, and writes the dictionary's example sentences when no corpus has one. |
| `ELEVENLABS_API_KEY` | the spoken word on the dictionary page. Without it the speaker button removes itself rather than standing there failing. |

`ANTHROPIC_API_KEY` is the paid alternative to Groq and `LLM_PROVIDER` forces
one instead of auto-detecting. **Groq retires models without warning**, and its
endpoint answers a dead one with "does not exist or you do not have access to
it" — which reads like a key problem and is not. `llama-3.3-70b-versatile` was
the default here until it was decommissioned; `openai/gpt-oss-120b` is the
current one, and `GROQ_MODEL` overrides it against
[the list of what is live](https://console.groq.com/docs/models).

`REPORT_LOG_DIR` says where the translator's reports are written, and
`TRUST_PROXY` belongs only behind a proxy you control — it makes that log's rate
limit believe `X-Forwarded-For`, which any client can send.

## Where things live

```
server/
  index.js              routes, static files, the SPA fallback
  env.js                reads .env without a dependency
  llm.js                picks a provider: Groq, then Anthropic
  translators.js        the chain — Wikipedia, the rules, the two glossaries
  latin-translate.js    the rules translator, both directions, and the
                        word-by-word fallback beneath it
  latin-sentence.js     the same sentence read twice and checked against
                        itself, which is the Latin→English answer
  latin-lexicon.js      which Latin word means which English one — the course
                        list, then Wiktionary
  latin-idioms.js       the phrases Latin says its own way
  latin.js              Whitaker's Words, through Alpheios
  latin-check.js        parses the result, and corrects a head noun's case
  corpus.js             Tatoeba sentences and Wiktionary glosses
  speech.js             pronunciation: one word, cached, told its language
  identity.js           where a request came from, for the report log's limit
  throttle.js           one queue per upstream host
  translate-model.js    the guards around a model that no longer translates —
                        kept, and still tested
  providers/            groq, anthropic, and the shared SSE reader
  routes/               translate, dictionary, chat, speak, report

public/
  index.html            the shell, and the pre-paint theme script
  styles.css            every style, one file
  js/app.js             the router, the header, the More menu
  js/lib/
    dom.js              el(), icon(), the sprite table, fetch helpers
    i18n.js             the interface language: Latin or English
    language-switch.js  LA | EN
    theme.js            dark and light
    wallpaper.js        the photograph, and its parallax
    network.js          the hero's node animation
    markdown.js         chat replies, built as nodes — never innerHTML
    conjugator-la.js    the conjugation engine
    decliner-la.js      the declension engine
    latin-lookup.js     fills in a missing genitive, refuses a wrong one
    tutor.js            the grounded tutor's routing, and the scope test
    tutor-la.js         everything the routing needs to know about Latin
    chat-session.js     the conversation, held outside the view
  js/data/
    verbs-la.js         model verbs and their principal parts
    grammar-la.js       the hand-written grammar notes
    stages-la.js        the course vocabulary, by stage
  js/views/             home, conjugator, declensions, stages, dictionary, chat

test/                   offline, no network, a couple of seconds
```

`npm test` runs all 802 checks.

```
latin.test.js             299 on the declension and conjugation engines, the
                              number a corrected case takes, and the course data
latin-translate.test.js   105 on the two-way lexicon, the English word shapes,
                              clause splitting and the idiom table
conjugator-view.test.js   230 that every tense the page names exists in the
                              table the engine builds
tutor-la.test.js           49 on intent routing, the form index, and which
                              questions are in scope and which are not
translators.test.js        21 on engine order, the name lookup and its guards
report.test.js             16 on what reaches the log, in what shape, and what
                              is refused before it gets there
translate-model.test.js    27 on the guards around a model that no longer
                              translates
markdown.test.js           20 on the renderer that never touches innerHTML
identity.test.js            7 on the address, and on when a forwarded header
                              may be believed
corpus.test.js             11 on how a corpus sentence is chosen
speech.test.js             17 on what may be spoken, and what is refused before
                              a character of the month is spent
```

## Deploying

### Render

`render.yaml` is a blueprint: point Render at the repository and it reads it.
The service is a **web service**, not a static site — the chat, the dictionary
and the translator's morphology lookups all need a server.

Two things in it are not defaults and matter. **`numInstances: 1`**, because the
dictionary caches and the report log's rate limit are held in memory and a
second instance gets its own copy of each. And a **mounted disk at `/var/data`**, with
`REPORT_LOG_DIR` pointing at it: the reports are a file, and a deploy replaces
the checkout. Without the disk every report is lost at the next push, which
defeats the point of collecting them.

Every key is `sync: false` — Render holds the value, and the file only names it.
Nothing secret belongs in a file that is in a repository, private or not.

### Things that will surprise you otherwise

- **The site is one page.** Every route falls through to `index.html`, so a
  refresh on `/declinationes` works, but any new route needs adding to `ROUTES`
  in `public/js/app.js` as well as to the header.
- **Code and markup revalidate on every load; photographs cache for a year.** A
  single-page app can otherwise keep a stale module alive in an open tab for
  days, because navigating between pages never re-fetches it.
- **The morphology is a network call.** Whitaker's is reached through Alpheios,
  so the translator, the decliner's genitive lookup and the dictionary all need
  the internet even though none of them needs a key. The tests do not.

## Notes

The Latin is real Latin where Latin has a word for the thing, and a respectable
coinage where it does not — *colloquium* for the chat, *stadia* for the course's
stages. Reading the interface in Latin is a curiosity to opt into rather than
the default behaviour of anything important, which is why the site works exactly
the same in English.
