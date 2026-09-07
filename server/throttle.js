/**
 * A queue that keeps a shared host from being asked too fast.
 *
 * One French dictionary lookup can be three Wikimedia requests — the
 * Wiktionnaire entry, a search when the word was typed without its accents, and
 * the English gloss beside the headword — so a class of twenty-five looking
 * words up at once is a burst, not a trickle. Wikimedia answers a burst with
 * 429s that then persist for a while, which is how a working dictionary turns
 * into a dead one for everybody at once.
 *
 * So calls are spaced rather than thrown: a few lanes, each waiting out a gap
 * between its own calls.
 */

const queues = new Map();

/**
 * Three, measured rather than guessed. Twenty-five lookups at once, twice over:
 * one lane took 75s, three took 23s, six took 40s. None of them drew a 429 —
 * past three the host stops answering faster, so the extra lanes only queue up
 * behind its own pacing. Three is where the curve turns.
 */
const LANES = 3;

/**
 * Run `task` on the named queue, no sooner than `gap` ms after the last call in
 * its lane.
 * @param {string} name  hosts sharing a limit share a queue
 * @param {number} gap   minimum milliseconds between starts within a lane
 */
export function throttle(name, gap, task) {
  const queue = queues.get(name)
    ?? { lanes: Array.from({ length: LANES }, () => Promise.resolve()), next: 0 };
  queues.set(name, queue);

  // Round robin. Picking the lane that looks freest needs a completion time to
  // compare, and reading one off a pending promise is how the first attempt at
  // this quietly sent everything down lane zero.
  const lane = queue.next;
  queue.next = (queue.next + 1) % queue.lanes.length;

  // The chain is what serialises; each link waits out the gap before running.
  const next = queue.lanes[lane]
    .catch(() => {})
    .then(async () => {
      await new Promise((resolve) => { setTimeout(resolve, gap); });
      return task();
    });

  // The lane holds a settled-either-way promise, so one failure does not break
  // the chain for everyone behind it.
  queue.lanes[lane] = next.catch(() => {});
  return next;
}

/** Wikimedia asks for a descriptive agent with a way to make contact. */
export const USER_AGENT = 'ProfeGPT/1.0 (https://github.com/yuzhe-chen/profegpt; educational language site)';
