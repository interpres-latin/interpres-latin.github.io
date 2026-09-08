/**
 * A Latin sentence, in English, checked against itself.
 *
 * The word-by-word gloss beneath this is true and nearly useless to read:
 *
 *   non — not · itio — a going · magnus — big (nom. sg.) · vita — life
 *   (nom. sg. / voc. sg. / abl. sg.) · est — is (3rd sg. present) · ita — so
 *
 * Every piece of that is correct and the reader still has to do the work. So a
 * model assembles it — but a model asked to translate Latin will produce
 * fluent, confident, and occasionally invented English, which is exactly what
 * the rest of this site refuses to do.
 *
 * The answer is to ask twice, along two different routes, and see whether they
 * agree:
 *
 *   1. **Directly.** The Latin goes to the model as Latin.
 *   2. **From the pieces.** The same sentence goes as the word list above —
 *      every word with its meaning and the grammar a parser found on it — and
 *      the model is asked only to assemble what it is given.
 *
 * Neither route can see the other's answer, and they fail differently: a
 * hallucination in the first has no reason to match a hallucination in the
 * second, while a sentence both routes arrive at independently is one the
 * morphology and the model both support. Agreement is therefore evidence, and
 * disagreement is a warning worth showing rather than hiding.
 *
 * The first route is what the reader sees. The second is the check — see the
 * note above the return for why it is not a candidate for the answer.
 *
 * This is the one place on the site where a model's output is presented as a
 * translation. It is presented with its agreement measured and its working
 * kept, which is the condition on which it earns the place.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ask, hasProvider } from './llm.js';
import { ROOT } from './env.js';

/**
 * Where the parser's own mistakes are written down.
 *
 * The check notices that the two readings disagree; the deciding pass says
 * *which word* the parser misread. That is the one part of a disagreement that
 * is fixable — a wrong gloss is data — so it goes into a file next to the
 * reader-submitted reports, to be worked through the same way.
 */
const GLOSS_LOG = path.join(process.env.REPORT_LOG_DIR || path.join(ROOT, 'logs'), 'gloss-issues.txt');

function recordMisreadings(latin, lines) {
  const record = [`--- ${new Date().toISOString()}`, `latin: ${latin}`, ...lines.map((l) => `wrong: ${l}`), ''].join('\n');
  try {
    fs.mkdirSync(path.dirname(GLOSS_LOG), { recursive: true });
    fs.appendFileSync(GLOSS_LOG, `${record}\n`, 'utf8');
  } catch (error) {
    console.warn('[gloss] could not record a misreading:', error.message);
  }
}

const DIRECT = `You are a Latin scholar translating for a student.

Translate the Latin into natural English. Keep the sense of the original: do not
add detail it does not contain, and do not smooth away anything strange about
it. If the Latin is not well formed, translate what is there rather than
inventing a sentence that would have been.

Reply with the translation and nothing else. No quotation marks, no notes, no
alternatives, no explanation.`;

const ASSEMBLE = `You are given a Latin sentence already broken into words. Each
word comes with its dictionary meaning and, where a parser could read one, the
grammar of that form.

Assemble those pieces into one natural English sentence.

Where a word can be read more than one way, every reading is listed after "or:".
The list is not ranked and the first one is not preferred.

The meanings are dictionary entries, not finished English. They come out of a
Latin dictionary and are written the way one writes them: bare stems, sometimes
with an "I" in front, sometimes as an infinitive. *defendit* is glossed "I
defend" and is third person singular; it belongs in your sentence as "defends".

Rules:
- Inflect the meanings. Put the verbs into the person, number and tense you are
  given, and drop any "I" or "to" that belongs to the dictionary rather than to
  the sentence.
- Latin word order is not English word order. Arrange the sentence the way
  English arranges one, whatever order the pieces arrive in.
- Use the grammar you are given. A word marked accusative is the object, not the
  subject. A word marked ablative or genitive is not the subject either. A verb's
  person and number tell you who is doing it.
- A Latin verb carries its subject. A third person singular verb with no subject
  named means "he", "she" or "it"; supply it.
- Where a word has several readings, choose the one that makes the sentence work
  and ignore the rest. A reading that leaves the sentence without a verb, or
  with two subjects, is the wrong one.
- Use only the meanings you are given. Do not translate the Latin yourself, and
  do not add anything that is not in the pieces.
- A word whose meaning is given as "?" has no known meaning: keep it exactly as
  the Latin word, in square brackets.
- If the pieces do not make a sentence, say the nearest thing they do make.

Reply with the sentence and nothing else. No quotation marks, no notes, no
explanation.`;

/**
 * Generous, because the budget is not spent on the answer.
 *
 * The default model here reasons before it writes, and that reasoning comes out
 * of the same allowance. At 400 the direct route — a short prompt and a one-line
 * answer — was fine, while the assembling route thought its way through the
 * whole word list, hit the cap, and returned an empty completion. Not an error:
 * a successful response with nothing in it, which then read as "that route
 * declined" and quietly halved the check this file exists to perform.
 *
 * Both answers are one sentence long. Anything spent above that is thinking,
 * and thinking is what makes the second route worth having.
 */
const MAX_TOKENS = 1500;

/**
 * The third question, asked only when the first two need it.
 *
 * Counting shared words is free and settles the easy cases, and it is hopeless
 * at the interesting one: "the die is cast" and "the die has been thrown" are
 * the same sentence and share one content word out of three. Every synonym
 * looks like a disagreement, so a check built on word overlap alone cries wolf
 * on most of what it sees — which is worse than not checking, because a warning
 * nobody can believe is a warning nobody reads.
 *
 * So where the words do not already agree, the model is asked whether the two
 * readings mean the same thing. It is a cheap question with a one-word answer,
 * and it is the only one of the three that gets to see both routes at once.
 */
const JUDGE = `You are checking two English translations of the same Latin sentence.

Answer with exactly one word:
SAME: they say the same thing, allowing for different wording or synonyms.
CLOSE: they agree on who does what to whom, but differ in some detail.
DIFFERENT: they disagree about what the sentence means.

Reply with the single word and nothing else.`;

/**
 * Words too common to count as agreement.
 *
 * Two unrelated English sentences share "the", "is" and "of" without meaning
 * anything alike, so counting them makes every pair look similar. What decides
 * whether two translations say the same thing is whether they chose the same
 * content words.
 */
const EMPTY_WORDS = new Set([
  'a', 'an', 'the', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'am', 'do', 'does', 'did', 'have', 'has', 'had', 'will',
  'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could', 'of', 'to',
  'in', 'on', 'at', 'by', 'for', 'with', 'from', 'into', 'and', 'or', 'but',
  'not', 'no', 'as', 'it', 'its', 'he', 'she', 'they', 'them', 'him', 'her',
  'his', 'their', 'we', 'us', 'our', 'you', 'your', 'i', 'me', 'my', 'there',
  'so', 'very', 'too', 'then', 'than', 'when', 'while', 'who', 'which', 'what',
]);

/**
 * A crude stem, so "praises" and "praise" count as the same choice.
 *
 * Deliberately not a real stemmer. What is being measured is whether two
 * sentences picked the same words, and for that "walk"/"walked"/"walking"
 * collapsing together is right while anything cleverer only adds ways to be
 * wrong.
 */
function stem(word) {
  let out = word;
  if (out.length > 4 && out.endsWith('ies')) return `${out.slice(0, -3)}y`;
  for (const suffix of ['ing', 'ed', 'es', 's']) {
    if (out.length > suffix.length + 2 && out.endsWith(suffix)) { out = out.slice(0, -suffix.length); break; }
  }
  return out;
}

function contentWords(text) {
  return new Set(
    String(text ?? '')
      .toLowerCase()
      .replace(/\[[^\]]*\]/g, ' ')   // bracketed untranslated words are not content
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word && !EMPTY_WORDS.has(word))
      .map(stem),
  );
}

/**
 * How much two readings of the same sentence agree, from 0 to 1.
 *
 * Jaccard over content-word stems. Two sentences that chose the same words are
 * saying the same thing however they arranged them, and two that chose
 * different words are not, whatever their grammar looks like.
 */
export function agreementBetween(one, other) {
  const a = contentWords(one);
  const b = contentWords(other);
  if (!a.size && !b.size) return 1;
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/**
 * Where the thresholds sit.
 *
 * Two translations of the same short sentence that agree on most of their
 * content words are the same translation. Below a third, they are not readings
 * of one sentence — they are two different sentences, and the reader has to be
 * told.
 */
export const AGREES = 0.6;
export const PARTLY = 0.3;

const clean = (text) => String(text ?? '')
  .trim()
  .replace(/^["'“”«»]+|["'“”«»]+$/g, '')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * @param {string} latin        the sentence as the reader typed it
 * @param {Array}  words        the word list from latinWordList()
 * @returns {Promise<{text, direct, grounded, agreement, confidence}|null>}
 *          null when no model is configured, which leaves the gloss standing.
 */
export async function englishSentence(latin, words) {
  if (!hasProvider()) return null;
  if (!words?.length) return null;

  const pieces = words
    .map(({ word, gloss, grammar, readings }) => {
      const first = `${gloss}${grammar ? ` [${grammar}]` : ''}`;
      const rest = (readings ?? []).filter((reading) => reading !== first);
      return `${word}: ${first}${rest.length ? `  or: ${rest.join('  or: ')}` : ''}`;
    })
    .join('\n');

  // Both at once. They are independent by construction, so there is nothing to
  // gain by making the reader wait for them in turn.
  const [direct, grounded] = await Promise.all([
    ask({
      system: DIRECT,
      messages: [{ role: 'user', content: latin }],
      maxTokens: MAX_TOKENS,
    }).then(clean).catch(() => ''),
    ask({
      system: ASSEMBLE,
      messages: [{ role: 'user', content: `Latin: ${latin}\n\nThe pieces:\n${pieces}` }],
      maxTokens: MAX_TOKENS,
    }).then(clean).catch(() => ''),
  ]);

  // One route failing is not a disagreement; it is one answer, and it is said
  // to be one. An empty completion counts as a failure here for the reason in
  // MAX_TOKENS above: it is silence, not a reading.
  if (!direct && !grounded) return null;
  if (!direct || !grounded) {
    return {
      text: direct || grounded,
      direct: direct || null,
      grounded: grounded || null,
      agreement: null,
      confidence: 'single',
    };
  }

  const overlap = agreementBetween(direct, grounded);

  /**
   * The cheap check first. Two readings that already share most of their
   * content words are the same reading, and there is nothing a third opinion
   * would add.
   */
  let confidence = overlap >= AGREES ? 'agreed' : null;
  let verdict = null;

  if (!confidence) {
    verdict = await ask({
      system: JUDGE,
      messages: [{ role: 'user', content: `Latin: ${latin}\n\nA: ${direct}\n\nB: ${grounded}` }],
      maxTokens: MAX_TOKENS,
    }).then((answer) => clean(answer).toUpperCase().match(/SAME|CLOSE|DIFFERENT/)?.[0] ?? null)
      .catch(() => null);

    confidence = { SAME: 'agreed', CLOSE: 'partial', DIFFERENT: 'differs' }[verdict]
      // No verdict: fall back on the words, which is the check this replaced.
      ?? (overlap >= PARTLY ? 'partial' : 'differs');
  }

  /**
   * The direct reading is the one shown, always.
   *
   * The first version of this showed the grounded one whenever the two differed,
   * on the reasoning that it had the cases and tenses in front of it and was
   * therefore the defensible answer. Measured against real sentences that was
   * plainly wrong. *quod me nutrit me destruit* — "what nourishes me destroys
   * me" — came back:
   *
   *   direct    that which nourishes me destroys me
   *   grounded  Because you urinate, it suckles; you urinate, it demolishes
   *
   * The grounded route is only ever as good as the gloss it is handed, and the
   * gloss commits to one sense per word: it read *me* as a form of *meio*. Given
   * that, the model assembled exactly what it was told to, faithfully and
   * uselessly. A route that inherits a wrong word cannot recover from it, while
   * a route reading the Latin can.
   *
   * So the second route is a *check*, not a candidate. Its value is that it
   * fails differently — it cannot invent the same sentence the first one
   * invented — and that is worth having whether or not it is ever shown.
   * Disagreement flags the answer and both readings are kept for the reader.
   */
  /**
   * The readings disagree, so at least one of them is wrong — and handing over
   * the first one anyway is noticing without acting.
   *
   * The deciding pass is the only one that sees everything: the Latin, both
   * readings, and the morphology of every word. That is more than either route
   * had, so it is a fair question rather than the same question asked louder.
   */
  let text = direct;
  let repaired = false;
  let misread = [];

  if (confidence === 'differs') {
    const settled = await repair(REPAIR_ENGLISH, [
      `Latin: ${latin}`,
      `Reading A (from the Latin): ${direct}`,
      `Reading B (assembled from the words): ${grounded}`,
      `The words, as a parser reads them:\n${pieces}`,
    ].join('\n\n'));

    if (settled) {
      /**
       * The reply carries two things and only one of them is the translation.
       *
       * The marker is asked for but not always given, and the WRONG lines do
       * not always start on their own line — so the split is on the first
       * mention of WRONG either way, and the marker is stripped if it is there.
       * Without this the diagnosis was printed to the reader as part of the
       * sentence: "…and came to Lavinia. WRONG: Troiae — ? — genitive singular".
       */
      const body = settled.split(/\bWRONG:/i)[0];
      const candidate = clean(body.replace(/^\s*TRANSLATION:\s*/i, ''));

      /**
       * A repair has to be an improvement, and a fragment is not one.
       *
       * "This chariot was;" came back for a line whose first reading was a whole
       * sentence. The deciding pass had spent its answer on the diagnosis and
       * left the translation half written, and taking it anyway made the output
       * worse than the thing being repaired.
       */
      const plausible = candidate.length >= Math.min(direct.length * 0.6, 40);
      if (plausible) {
        text = candidate;
        repaired = true;
      }

      /**
       * What the deciding pass thought the parser got wrong.
       *
       * These are the site's own gaps, found by its own check, and they are the
       * only part of this that can actually be fixed: a wrong gloss is data, and
       * data can be corrected. Written where the translator's reports go, for
       * the same reason — somebody reads the file and mends the lexicon.
       */
      // Recorded whether or not the repair itself was kept: the parser's
      // mistakes are worth writing down either way.
      misread = [...settled.matchAll(/\bWRONG:\s*([^\n]+)/gi)]
        .map((line) => line[1].trim())
        .filter(Boolean)
        .slice(0, 12);
      // Whether the deciding pass landed nearer either reading is the closest
      // thing to a second opinion available without asking a third time.
      const nearer = Math.max(agreementBetween(text, direct), agreementBetween(text, grounded));
      if (repaired && nearer >= AGREES) confidence = 'partial';
    }
  }

  if (misread.length) recordMisreadings(latin, misread);

  return {
    text,
    direct,
    grounded,
    agreement: overlap,
    verdict,
    confidence,
    repaired,
    misread,
  };
}


/* ----------------------------------------------------------------- repairs */

const REPAIR_LATIN = `Your Latin was checked by translating it back into English,
and the round trip did not come back saying what the original said.

You are given the English that was asked for, the Latin you wrote, and what that
Latin actually says when read as Latin. Work out what went wrong: a wrong word,
a wrong case, a wrong tense, a construction that does not mean what you intended
and write the Latin again so that reading it back gives the original.

Change what is wrong. Keep what is right.

Reply with the corrected Latin and nothing else.`;

const REPAIR_ENGLISH = `Two readings of the same Latin sentence disagree, so at
least one of them is wrong.

You are given the Latin, the two readings, and the morphology of every word as a
parser read it. Work out which reading the grammar actually supports. The cases
say who is doing what and the tenses say when. Write the translation that the
Latin supports.

Do not split the difference. Decide.

Then say which of the parser's entries were wrong, if any. The second reading is
assembled from those entries, so where it went wrong they usually did: a word
given the wrong meaning, or the wrong case, or read as the wrong part of speech.

Reply in exactly this shape:

TRANSLATION: <the translation>
WRONG: <latin word> / <what the parser said> / <what it should be>
WRONG: ...

Give no WRONG lines if the entries were all sound and the second reading simply
assembled them badly. Nothing else, no explanation.`;

/**
 * Ask again, having been told what looks wrong.
 *
 * The check exists to notice something; noticing and then handing over the
 * sentence unchanged is half a feature. Where the two routes disagree, or where
 * an English word survived into the Latin, the model is asked once more with
 * the evidence in front of it — which is a different question from the one it
 * answered the first time, and it is the question a person would ask.
 *
 * Once. A second repair on a sentence a model cannot get right is latency spent
 * to arrive at the same place, and the reader is watching a spinner.
 */
async function repair(system, content) {
  return ask({
    system,
    messages: [{ role: 'user', content }],
    maxTokens: MAX_TOKENS,
  }).then(clean).catch(() => '');
}

/**
 * English words that have no business in a Latin sentence.
 *
 * The spellings Latin also has are left out — *a*, *in*, *at*, *is*, *his*, *e*
 * — because finding those proves nothing.
 */
const ENGLISH_IN_LATIN = /\b(?:the|and|are|was|were|of|to|from|with|that|this|which|what|when|there|their|they|you|your|have|has|had|would|could|should|it|its|he|she|her|for|but|not|by|on|been|being|about|into|over|under|because|while|before|after)\b/gi;

export function englishLeftIn(latin) {
  return [...new Set(String(latin ?? '').match(ENGLISH_IN_LATIN) ?? [])];
}

/* --------------------------------------------------------- English → Latin */

const INTO_LATIN = `You are a Latin scholar writing for a student.

Translate the English into correct classical Latin.

Rules:
- Classical usage and classical spelling. Use *i* and *v*, not *j* and *u*, and
  write no macrons.
- Decline and conjugate properly. Every noun and adjective in the case its role
  requires, every verb in the right person, number, tense and mood, and
  adjectives agreeing with their nouns.
- Latin has no articles. Do not invent words for "a" or "the".
- Latin drops a pronoun subject its verb already carries. Write *amo*, not *ego
  amo*, unless the pronoun is emphatic.
- Where English uses an infinitive as a noun, as in "to be, or not to be", Latin
  does the same, and the verb is *esse*.
- If a word has no Latin, use the nearest Latin expression rather than leaving
  the English word in.

Reply with the Latin and nothing else. No quotation marks, no notes, no
alternatives, no explanation.`;

/**
 * English into Latin, checked by translating it back.
 *
 * The other direction can check itself by assembling the same sentence a second
 * way. This one cannot: assembling *into* Latin from a glossary is precisely
 * what was broken — "to be or not to be, that is the question" came out *ad aut
 * non ad ille rogatio sum sum est*, which is nine Latin words and not a
 * sentence.
 *
 * So the check is a round trip. The Latin goes back to the model as Latin, is
 * translated into English by the same route that reads Latin everywhere else on
 * this site, and the result is compared with what the reader actually typed.
 * Latin that means what was asked comes back saying it; Latin that does not,
 * does not.
 *
 * **The comparison has to be the judge, not the word count.** A back
 * translation is a paraphrase by construction — it has been through two
 * languages — so it reuses almost none of the original's wording even when it
 * is perfect. Counting shared words here would report disagreement on
 * everything. The overlap is kept only as a fast path for the cases where the
 * wording happens to survive.
 */
export async function latinSentence(english) {
  if (!hasProvider()) return null;

  const latin = await ask({
    system: INTO_LATIN,
    messages: [{ role: 'user', content: english }],
    maxTokens: MAX_TOKENS,
  }).then(clean).catch(() => '');

  if (!latin) return null;

  const back = await ask({
    system: DIRECT,
    messages: [{ role: 'user', content: latin }],
    maxTokens: MAX_TOKENS,
  }).then(clean).catch(() => '');

  if (!back) {
    return { text: latin, back: null, agreement: null, verdict: null, confidence: 'single' };
  }

  const judge = async (candidate, reading) => {
    const overlap = agreementBetween(english, reading);
    if (overlap >= AGREES) return { overlap, verdict: null, confidence: 'agreed' };

    const said = await ask({
      system: JUDGE,
      messages: [{ role: 'user', content: `Latin: ${candidate}\n\nA: ${english}\n\nB: ${reading}` }],
      maxTokens: MAX_TOKENS,
    }).then((answer) => clean(answer).toUpperCase().match(/SAME|CLOSE|DIFFERENT/)?.[0] ?? null)
      .catch(() => null);

    return {
      overlap,
      verdict: said,
      confidence: { SAME: 'agreed', CLOSE: 'partial', DIFFERENT: 'differs' }[said]
        ?? (overlap >= PARTLY ? 'partial' : 'differs'),
    };
  };

  let best = { latin, back, ...await judge(latin, back) };
  const leftIn = englishLeftIn(latin);

  /**
   * Something is wrong and it is worth one more question.
   *
   * Either the round trip did not come back saying what was asked, or an
   * English word is sitting in the middle of the Latin. Both are visible
   * without knowing any Latin, and both are things the model can fix once it is
   * told about them.
   */
  if (best.confidence === 'differs' || leftIn.length) {
    const complaint = [
      `Wanted, in English: ${english}`,
      `Your Latin: ${latin}`,
      `Read back as: ${back}`,
      leftIn.length ? `These English words were left in the Latin: ${leftIn.join(', ')}` : null,
    ].filter(Boolean).join('\n\n');

    const second = await repair(REPAIR_LATIN, complaint);
    if (second && second !== latin) {
      const secondBack = await ask({
        system: DIRECT,
        messages: [{ role: 'user', content: second }],
        maxTokens: MAX_TOKENS,
      }).then(clean).catch(() => '');

      if (secondBack) {
        const rejudged = await judge(second, secondBack);
        // Kept only if it is actually better, and never if it still has English
        // in it: a repair that trades one fault for another is not a repair.
        const better = RANK[rejudged.confidence] > RANK[best.confidence]
          && englishLeftIn(second).length === 0;
        if (better) best = { latin: second, back: secondBack, ...rejudged, repaired: true };
      }
    }
  }

  return {
    text: best.latin,
    back: best.back,
    agreement: best.overlap,
    verdict: best.verdict,
    confidence: best.confidence,
    repaired: best.repaired === true,
  };
}

/** Which verdict counts as better than which. */
const RANK = { differs: 0, partial: 1, single: 1, agreed: 2 };
