# The parser: instructions as given

This is the specification for the Latin to English engine, in the words it was
given in. It is kept verbatim so it can be checked against what the code
actually does. Nothing here is my paraphrase except the sections marked
**Status**, which say what is built and what is not.

Implementation: `server/latin-parse.js`. Tests: `npm run test:parse`.

---

## The instruction, verbatim

> Time for the major fix:
> Forget everything the translator does right now
> Everything.
> All the logic behind it. Changed.
>
> Let's focus on Latin -> English first since it's supposed to be easier but you
> are unable to make it work properly
> Follow instructions. Do not go onto a side tangent about one word rankings.
> Here's the logic:
>
> You're given a sentence in Latin. Where's the verb? The verb should probably
> end in a verb ending right? Parse the words in the sentence. Does it end in
> -o, -s, -t, -mus, -tis, -nt? If so, that's probably the verb. If the sentence
> has multiple clauses, look at each clause individually first. Now verify if
> it's actually the verb. There is a built-in conjugator. The latin endings are
> well known. Does it end in -aba? Find the stem then. Maybe it ends in -essent?
> You can still find the stem. You have the stem, see if the conjugator outputs
> the verb in the sentence when given the principal parts with that stem. If so,
> you've confirmed you've found the verb.
>
> You have the verb. You now know most likely the number of the subject. If it's
> plural, or singular. If it's an imperative, maybe you should look for a
> vocative in the sentence. If not, your subject is probably in the nominative.
> Exception: if the verb is a linking verb, but linking verbs appear in the
> middle and there's usually the subject somewhere adjacent. Which brings us to
> another point.
>
> Find the adjectives. They have a distinctive declension because they'll
> usually appear close to another noun that has (most likely) the same ending as
> them. Right? So parse that. You've got a word that's an adjective. You've got
> a noun next to it. You now know more information about the noun. Keep it in
> mind.
>
> So the subject, you've found the number for it. You know what declension it
> SHOULD be in. So that's the subject of the sentence.
>
> If a word is after a preposition, it's the ablative. Cuts out on all the
> confusion.
> The noun isn't the subject, isn't a verb, isn't an adjective. Isn't the
> genitive, because genitive usually follows another nominative noun. Oh wait,
> yes! That eliminates confusion too, between nom pl. and gen. sg in multiple
> declensions. You know "____ of the ____" now.
>
> NGDAA -> You've covered N, G, and Ablative and even Vocative. AA and Locative,
> we can safely ignore for now.
> So now the IDO and the DO. Obvious isn't it? If it ends in -m, it's acc. sg,
> and you can look at the acc. pl. endings to find the direct object (or most
> likely to be direct object/object of preposition IF there is a preposition in
> front of it, so it's not guaranteed ablative!!!)
>
> And the dative. The endings are so distinctive. It doesn't look like the
> subject. Of course it isn't the subject.
>
> You've got all the information you need. There is no ambiguity about cases.
> English sentence formation is very simple then.
>
> You have the subject [verb] [direct object] [indirect object] [prepositional
> phrase]. Mia eats chicken with Rebecca in the kitchen. Come eat, Mia! These
> sentences, if they were in Latin, should be simple to parse. Right? You've got
> the dictionary for word translation. The declension verifies what case and
> number it is. The conjugator solves the words. You know prepositions already.
> You don't need anything else. No need for a fancy model.

## The follow-ups, verbatim

> dynamic updating: it could be the genitive, it could be the dative. When does
> a person being in the dative make sense though? Probably if the verb is
> related to do, dare right? If not, it's probably the genitive? Especially if
> the nominative in front isn't living.
> imperative: it shouldn't default to imperative. it classes it as an imperative
> first, then tries to look for a vocative. if not, it's probably not
> imperative?

(Then: *"ignore comment about animacy"* — so the living/non-living half of the
dative rule is deliberately not implemented.)

> logic goes like this
> latin -> engine -> english
> new button: request re-translate
> makes it translate using the model
> there should be no other alternative

> do not dare refuse shit. it's hiding a mistake. you make the mistake and you
> fix it. or else all this translation will do is decline EVERYTHING

> case corrected: reginam -> regina. "help me save the queen" has no verb, so
> its head noun is nominative singular. reginam is accusative singular feminine.
> whichever one said accusative was the correct one, and it got overruled.

> why is so much credit being given to whitaker. it is not being translated by
> whitaker. it's just the words that are pulled from its bank as a dictionary.
> the name is not to be pasted literally everywhere.

---

## The steps, in order, with status

1. **Split into clauses.** Each clause is parsed on its own.
   *Status: built.* Split on `et`, `sed`, commas, `-que`.

2. **Find the candidate verb by its personal ending** (`-o -s -t -mus -tis -nt`,
   plus the tense markers `-ba-`, `-bi-`, `-re-`, `-sse-`, `-isse-`).
   *Status: built.*

3. **Verify it with the conjugator.** Take the dictionary's principal parts and
   build the whole table with the project's own `conjugate()`. The reading is
   accepted only if the built table actually contains the word in the sentence.
   That is what makes it a confirmed verb rather than a guess.
   *Status: built.* This is the core of the design and it is what the old
   translator did not do.

4. **The verb fixes the subject's number and person.** A 1st or 2nd person verb
   carries its own subject, so no noun is promoted to subject in front of it.
   *Status: built.* This is the fix for "The dead am" (*mortuus sum*).

5. **Imperative is not the default.** A form is read as imperative only if a
   vocative can also be found; otherwise the imperative reading is dropped.
   *Status: built, per the follow-up.*

6. **Find the adjectives by agreement.** An adjective next to a noun that shares
   its case, number and gender pins the noun down.
   *Status: built.* Adjectives are verified against `declineAdjective()`, nouns
   against `declineNoun()`, the same way verbs are verified.

7. **A word after a preposition takes the case that preposition governs** (not
   always ablative: *in* and *sub* take both, and the accusative reading has to
   stay available).
   *Status: built.*

8. **The genitive follows its noun.** This is what separates nominative plural
   from genitive singular in the declensions where they look the same.
   *Status: built.*

9. **`-m` is accusative singular; the accusative plurals are known endings.**
   *Status: built.*

10. **The dative is distinctive, and dative-versus-genitive is settled by the
    verb**: a verb of giving, telling, showing, trusting or obeying takes a
    dative. The list is `DATIVE_VERBS` in `latin-parse.js`.
    *Status: built. Animacy deliberately not used.*

11. **Assemble**: subject, verb, direct object, indirect object, prepositional
    phrase.
    *Status: built.*

12. **Never drop a word, never refuse.** Anything the parser could not place is
    printed in square brackets at the end so it is visible rather than silently
    missing.
    *Status: built.*

---

## What is deliberately not there

- **No model in the Latin to English path.** `server/translators.js` has
  `OUT_OF_LATIN = [namedEntity, latinToEnglishParse]` and nothing else. There is
  no fallback to a model, a word list, or an older engine.
- **The re-translate button is the only way to reach a model**, and it is an
  explicit request by the reader.
- **English to Latin is untouched by this rewrite** and still uses the old
  chain. That was the stated priority order.

## Known wrong, and why

The parser gets the grammar right and can still pick the wrong English word,
because the dictionary orders its senses by classical attestation, not by what
the word usually means:

- `translatio` reads as "transportation" (its literal classical sense) rather
  than "translation".
- `citrus` reads as "citron tree" rather than the fruit.
- `mustum` reads as "unfermented" rather than "must".

No positional rule fixes these without breaking words where the first sense
*is* right (`scelus` = "crime"). This needs a frequency-ranked sense source,
which is a lookup problem, not a parsing problem. It is the next real piece of
work on this engine.
