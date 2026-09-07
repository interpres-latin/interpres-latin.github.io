/**
 * Pronunciation, from ElevenLabs.
 *
 * A dictionary that cannot say the word out loud is half a dictionary for
 * anybody learning to speak, and the three languages here are exactly the ones
 * where spelling does not tell you the sound: *chaleureux*, *corazón*,
 * *puella*.
 *
 * The budget is the shape of this feature. The free tier is **10,000
 * characters a month** for the whole site — about a thousand headwords — and
 * there is no per-user metering to hide behind. So:
 *
 *   - only single words are spoken, never sentences;
 *   - every clip is cached by word and voice, so a class of twenty-five all
 *     looking up *chaleureux* spends ten characters once, not two hundred and
 *     fifty;
 *   - and when the month runs out the button says so plainly rather than
 *     failing silently, because a study aid that quietly stops working is
 *     worse than one that admits it.
 *
 * **On Latin.** No text-to-speech model has Latin, so this is Italian-ish
 * approximation by a multilingual model — closer to ecclesiastical than to the
 * classical pronunciation a Cambridge Latin Course class is taught. The page
 * says so next to the button. It is a guide to the shape of a word, not an
 * authority on how to say it, and pretending otherwise would teach the wrong
 * thing.
 */

const API = 'https://api.elevenlabs.io/v1/text-to-speech';

/**
 * "Alice — Clear, Engaging Educator", a premade voice. Premade rather than from
 * the voice library, because a free account is refused the library outright
 * (402, `paid_plan_required`) and that reads like a broken key rather than a
 * plan limit.
 */
const DEFAULT_VOICE = 'Xb7hH8MSUJpSbSDYk0k2';

/** The multilingual model; the English-only ones mangle every language here. */
const MODEL = 'eleven_multilingual_v2';

/** 64 kbps mono is ample for one spoken word and a quarter the bytes. */
const FORMAT = 'mp3_44100_64';

/** One word. Long enough for `res publica`, far short of a sentence. */
export const MAX_SPOKEN = 40;

/**
 * Word-shaped, checked here rather than only at the route.
 *
 * The length cap alone is not enough: "the quick brown fox jumps over it" is
 * comfortably under forty characters. Letters and the punctuation inside real
 * headwords, and at most two words — enough for *res publica*, not enough for
 * a sentence. The guard belongs next to the spending, so no caller can skip
 * it.
 */
const LOOKS_LIKE_A_WORD = /^[\p{L}][\p{L}\p{M}'’-]*(?: [\p{L}][\p{L}\p{M}'’-]*)?$/u;

const cache = new Map();
const CACHE_MAX = 400;

export function hasSpeech() {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

function voice() {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE;
}

/**
 * @returns {Promise<{audio: Buffer, cached: boolean}>}
 * @throws {Error & {status?: number, spent?: boolean}}
 */
export async function speak(word) {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    const error = new Error('No speech key configured');
    error.status = 503;
    throw error;
  }

  const text = String(word ?? '').trim().replace(/\s+/g, ' ');
  if (!text || text.length > MAX_SPOKEN || !LOOKS_LIKE_A_WORD.test(text)) {
    const error = new Error('Not a word to pronounce');
    error.status = 400;
    throw error;
  }

  const id = `${voice()}:${text.toLowerCase()}`;
  const hit = cache.get(id);
  if (hit) return { audio: hit, cached: true };

  const response = await fetch(`${API}/${voice()}?output_format=${FORMAT}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text, model_id: MODEL }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`ElevenLabs responded ${response.status}`);
    // 401 with `quota_exceeded`, or 429: the month is gone rather than the
    // key being wrong, and the page says a different thing for each.
    error.spent = response.status === 429 || /quota/i.test(detail);
    error.status = 502;
    throw error;
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (!audio.length) {
    const error = new Error('ElevenLabs returned no audio');
    error.status = 502;
    throw error;
  }

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(id, audio);
  return { audio, cached: false };
}
