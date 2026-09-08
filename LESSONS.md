# Lessons

Mistakes made on this project, and the rule each one produced. Written after a
session where most of the damage was self-inflicted. Read it before starting
work, and add to it when something goes wrong.

The entries are not apologies. Each one is a rule that would have prevented a
specific, real failure.

---

## Destroying work

**Never put a destructive command behind `||` or `&&`.**
`cp $SP/backup.js server/latin-translate.js || git checkout server/latin-translate.js`
— the `cp` failed because an earlier `cd` had moved the working directory, so
the checkout ran and reverted a file holding hours of uncommitted work. A
fallback that destroys is not a fallback. If a command is destructive it gets
its own line, run deliberately.

**`git checkout <path>` on an uncommitted file is deletion.** There is no undo.
Treat it exactly as `rm`.

**Gitignored does not mean scratch.** `logs/` was deleted with `rm -rf` several
times between test runs because it is gitignored. It is the one directory in the
project whose entire purpose is to accumulate data nobody can regenerate. Ask
what a directory is *for*, not whether git tracks it.

**Commit before a risky sequence.** None of the above would have cost anything
against a commit.

---

## Claiming things work

**Measure before reporting improvement.** Two hours were spent reporting
progress on translation quality. When a gold standard was finally built the
score was 81% before and 81% after: the genuine fixes and the regressions
introduced alongside them had cancelled out exactly.

**A cherry-picked example is not evidence.** *veni vidi vici* going from
"sale, see, I conquer" to "come, see, conquer" was reported as improvement. A
sweep over 67 scored words showed no net change. Build the sweep first; it is
usually an hour and it is the only thing that can tell a fix from a wash.

**Say "I have not measured that" out loud.** It is a shorter sentence than the
one that has to be retracted later.

**Verify with the thing that actually renders.** CSS was "verified" by comparing
declared properties in jsdom, which has no layout engine, so a height problem
was structurally invisible to the check. The real mismatch was found in ten
minutes with headless Chrome and `getBoundingClientRect`. Match the tool to the
claim: layout needs layout, pixels need a screenshot.

---

## Budgets and rate limits

**Work out the cost of a loop before running it.** A corpus run was launched
over a pipeline that had grown to five model calls per sentence, against a free
tier of 200,000 tokens a day. It consumed the entire daily allowance and
blocked further work.

**A rate limit is a queue, not an error.** The API said "try again in 9.0075s"
and the client threw that away, so six of eleven passages silently fell back to
a worse engine. Read what the refusal actually says.

**Pace load generators.** A test harness that fires as fast as it can is
measuring the rate limit, not the thing under test.

---

## Fixing the wrong thing

**Find the root cause before patching around it.** Pronoun tables, enclitic
splitting, synonym lookups and a context-aware tagger were four separate patches
around one defect: the code picked among dictionary readings with a rule that
could not see the sentence. The patches moved the number by nothing.

**A hand-written allowlist of an open class is always wrong.** `ENGLISH_VERBS`
listed common English verbs to decide whether a phrase had one. *help* and
*save* were missing, so "help me save the queen" was classed as verbless and the
correct accusative *reginam* was rewritten to nominative *regina*. A check that
cannot be complete must not overrule a result that is already right.

**Prefer an existing source over a table you invent.** Synonyms came free from
Datamuse; morphology in context came free from UDPipe; missing dictionary
entries came free from Wiktionary. Each replaced a list that would have needed
maintaining forever.

---

## Editing code

**A `replace` with one anchor can match the wrong occurrence.** Several edits
landed in the wrong place because the anchor text appeared twice. Include enough
surrounding context to be unique, and check the result rather than the exit
code.

**Cutting by line range removes what sits between the ends.** Deleting a helper
by "start of doc comment to start of next function" also removed `verbCard` and
`formRow`, which happened to live in between. After any structural removal,
diff the list of top-level definitions against the previous version.

**Check every shape a data structure has.** The conjugation table nests
mood → tense → person for finite forms, and mood → name for the non-finite ones.
The loop required the nesting, so every infinitive and participle in the
language was invisible, and complementary infinitives were silently dropped from
translations.

**Keys must be normalised the same way on both sides.** `fold()` maps `v` to `u`
for spelling variants; the lookup tables were written with `v`. Every entry
containing one silently failed to match, so *valde*, *vos* and *veni* were never
recognised.

---

## Silent decisions

**Dropping data is a decision. Say it.** A sense filter discarded any
dictionary sense containing a slash, on the assumption those were alternative
spellings. They are alternative meanings, so *epistula* lost
"letter/dispatch/written communication" and glossed as "epistle". The
assumption was never stated and so was never checked.

**Name a component for what it does.** Every engine reported itself as
"Whitaker's Words", which is the dictionary the words are looked up in and not
the thing that translated anything. Credit attached to the wrong component on
every line of output.

---

## Tests

**A stale fixture is not a regression, and chasing it wastes the run.** Test
sentences kept breaking because the lexicon improved and the words they relied
on being untranslatable stopped being untranslatable. Use an input that can
never resolve, not a real word that currently fails.

**Check which directory a command ran in.** `npm test` was run inside the
scratchpad and its "no test specified" output was reported as a result.

**Keep the offline suite offline.** Tests that need the network belong in a
separate script, so `npm test` keeps its guarantee.
