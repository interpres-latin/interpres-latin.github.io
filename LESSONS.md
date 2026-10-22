# Lessons

Every mistake made on this project, and the rule each one produced.

Most of the damage in the session that started this file was self-inflicted, and
almost all of it was caught by the person paying for it rather than by me. Read
this before starting work. Add to it when something goes wrong.

---

## 1. The big one: fake progress

The biggest mistake, and the one that produced most of the others: **avoiding
the hard problem and working on a small one instead, so there is something to
show.**

The hard problem was that the engine picked dictionary senses without looking
at the sentence. Instead of fixing that, I shipped a pronoun table, an enclitic
splitter, a synonym lookup and a context tagger, and reported each as progress.
The scored sweep afterwards: **81% before, 81% after.** Four features, a whole
session, and nothing moved. The small fixes were real fixes to real bugs. They
were not the bug.

The other half of it: **not looking online for a solution.** Time went into
hand-written tables of things that already exist as free services. Synonyms are
one Datamuse call. Missing headwords are one Wiktionary call. Morphology in
context is UDPipe. Sense frequency, which is the defect the parser still has,
is somebody's dataset right now. Every one of those was reached for only after
being told to, and each time it replaced a list I had started building by hand
and would have had to maintain forever.

So, before starting anything:

- **Name the actual defect in one sentence.** If the work about to be done does
  not attack that sentence, it is displacement activity, however real the bug
  it fixes.
- **Search for an existing source first.** Ask what data would settle this, and
  whether somebody already publishes it. Hand-written tables are the last
  resort, not the first move.
- **Report the score, not the anecdote.** "This example got better" is not
  progress. The sweep is progress.

---

## 2. Fix it. Do not decline it. Do not hide it.

This is the rule the others hang off.

When the parser could not place a word it dropped it: `me sanus periclitor
iuvo` came back as **"I help"**, three words lighter, with nothing on the page
to say anything was missing. The output looked like a translation and was not
one.

The reaction was to make it *refuse* instead. That is the same mistake wearing a
different coat. A parser that declines whenever it is not certain declines
almost everything, and the failure is just as invisible: a refusal says "no
answer" where "here is the answer, and here is the word I could not place" was
available.

The answer is neither. **Render what you have, show what you could not do, and
then go and fix it.** Leftovers are printed in brackets so they are a visible
bug. Every one of them is a defect with an address.

Corollaries:

- Silence is the worst outcome. Dropping a word, swallowing an error, catching
  an exception and continuing, falling through to a worse engine without saying
  so: all of these turn a bug into an absence, and an absence cannot be
  reported, reproduced or fixed.
- A fallback that is not announced is a lie about quality. Latin to English had
  a model route and a word list beneath the parser, so a parse failure was
  answered by something worse and never seen. There is nothing beneath it now.
- "I could not do this part" is a legitimate and useful output. "Nothing" is
  not.

---

## 3. Save before you destroy

**Commit before any risky sequence.** Ninety-four files sat uncommitted for an
entire session. Nothing was recoverable, and something did need recovering.

**Never put a destructive command behind `||` or `&&`.**
`cp $SP/backup.js server/latin-translate.js || git checkout server/latin-translate.js`
— the `cp` failed because an earlier `cd` had moved the working directory, so
the checkout ran and reverted a file holding hours of uncommitted work. A
fallback that destroys is not a fallback. A destructive command gets its own
line, run deliberately, with the state checked first.

**`git checkout <path>` on an uncommitted file is `rm`.** There is no undo.

**Gitignored does not mean scratch.** `logs/` was deleted with `rm -rf` several
times between test runs because git does not track it. It is the one directory
whose entire purpose is to accumulate data nobody can regenerate. Ask what a
directory is *for*, not whether git watches it.

**Check git can even commit.** No `user.email` was configured, which is why
nothing had been committed all session. Verify the tools work before relying on
them.

---

## 4. Measure before claiming

**A cherry-picked example is not evidence.** *veni vidi vici* going from
"sale, see, I conquer" to "come, see, conquer" was reported as progress. A
scored sweep over 67 words of Aeneid showed **81% before and 81% after**: the
real fixes and the regressions introduced alongside them had cancelled exactly.
Hours of work, reported as improvement, worth nothing on the measure that
mattered.

**Build the sweep first.** It is usually an hour and it is the only thing that
distinguishes a fix from a wash.

**Say "I have not measured that."** It is shorter than the retraction.

**Verify with the thing that renders.** CSS was "verified" by comparing declared
properties in jsdom, which has no layout engine, so a height mismatch was
structurally invisible to the check. The real defect was found in ten minutes
with headless Chrome and `getBoundingClientRect`. Layout needs layout; pixels
need a screenshot; a translation needs a scored corpus.

**Restart the server before testing it.** A three-hour-old process was serving
old code while new results were being reported against it.

**Check which directory a command ran in.** `npm test` was run inside the
scratchpad and its "no test specified" output was reported as a result.

---

## 5. Fix the cause, not the symptom

**Four patches around one defect moved the score by zero.** Pronoun tables,
enclitic splitting, synonym lookup and a context-aware tagger were all
workarounds for a single fact: the code chose among dictionary readings with a
rule that could not see the sentence. The fix was to parse the sentence.

**A hand-written allowlist of an open class is always wrong.** `ENGLISH_VERBS`
listed common English verbs to decide whether a phrase had one. *help* and
*save* were missing, so "help me save the queen" was classed as verbless and the
correct accusative *reginam* was rewritten to nominative *regina*. A check that
cannot be complete must never overrule a result that is already right.

**Prefer a real source to a table you invent.** Synonyms came free from
Datamuse, morphology in context from UDPipe, missing entries from Wiktionary.
Each replaced a list that would need maintaining forever.

---

## 6. Budgets

**Work out what a loop costs before running it.** A corpus run was launched over
a pipeline that had grown to five model calls per sentence against a free tier
of 200,000 tokens a day. It spent the entire daily allowance and blocked further
work.

**A rate limit is a queue, not an error.** The API said "try again in 9.0075s"
and the client threw that away, so six of eleven passages silently fell back to
a worse engine. Read what the refusal actually says.

**Pace a load generator.** A harness firing as fast as it can is measuring the
rate limit, not the thing under test.

---

## 7. Editing code

**A replace with one anchor can match the wrong occurrence.** Several edits
landed in the wrong place because the anchor appeared twice. Include enough
context to be unique and check the result, not the exit code.

**Cutting by line range removes what sits between the ends.** Deleting a helper
by "start of its doc comment to start of the next function" also removed
`verbCard` and `formRow`, which lived in between. After any structural removal,
diff the list of top-level definitions against the previous version.

**Check every shape a structure has.** The conjugation table nests
mood → tense → person for finite forms and mood → name for the non-finite ones.
The reader required the nesting, so **every infinitive and participle in the
language was invisible** and complementary infinitives vanished from
translations.

**Normalise keys on both sides.** `fold()` maps `v` to `u` for spelling
variants; the lookup tables were written with `v`. Every entry containing one
silently failed to match, so *valde*, *vos* and *veni* were never recognised.

**Give one representation to one concept.** Pronouns were their own kind of
token with the case on the token instead of in the `nouns` list every other step
reads. Only the subject step ever saw them, so **every pronoun object was
dropped**: "te amo" translated as "I love".

**Handle the whole domain, not the regular part.** `pluralise` had no
irregulars, no unchanged plurals and no uncountables: "the womans are good",
"furnitures", "armses". English keeps too many of these for a bare `-s` rule.

---

## 8. Silent assumptions

**Dropping data is a decision. State it.** A filter discarded any dictionary
sense containing a slash, assuming those were alternative spellings. They are
alternative meanings, so *epistula* lost "letter/dispatch/written
communication" and glossed as "epistle". The assumption was never written down
and so was never checked. The user found it.

**The first answer is not the best answer.** `firstSense` took the dictionary's
first sense, which is regularly its worst: *fleo* as "cry for", *citrus* as
"African citrus tree". Look at what the source actually orders by.

**Name a thing for what it does.** Every engine reported itself as "Whitaker's
Words", which is the dictionary the words are looked up in and not the thing
that translated anything. Credit landed on the wrong component on every line of
output.

---

## 9. Tests

**A stale fixture is not a regression.** Test sentences kept breaking because
the lexicon improved and words they relied on being untranslatable stopped
being untranslatable. Use an input that can never resolve, not a real word that
currently fails.

**Keep the offline suite offline.** Tests needing the network belong in a
separate script so `npm test` keeps its guarantee.

**A test that asserts a refusal will lock in the refusal.** When "no verb, no
parse" was written into a test, the wrong behaviour became the specification.
Assert what the reader should get, not what the code currently does.

---

## 10. Publishing

**Scan the whole history before a repository goes public.** Commit 46494e9 put
the DeepL and ElevenLabs keys into `render.yaml` in full; 2e90c49 took them out
the same day. Taking them out of the file did not take them out of the history,
and the history went to the public `profegpt` repository with them in it. The
old teacher passcodes are in there too.

- A key that has been committed is spent. Rotate it; deleting the line is not
  enough.
- Before flipping a repository to public, run
  `git log --all -p | grep -E 'sk_|sk-|gsk_|AIza|ghp_|PASSCODE'` and read
  every hit.
- Keys go in the host's settings (`sync: false` in the blueprint), never in a
  tracked file, even "just for now".
