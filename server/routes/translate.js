import { Router } from 'express';
import { translate } from '../translators.js';
import { checkLatin } from '../latin-check.js';

export const router = Router();

const MAX_INPUT = 5000;

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 12;
const CACHE_MAX = 500;

function remember(key, value, settled = false) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), value, settled });
}

/**
 * No language model is involved here. Translation runs on dedicated engines —
 * see server/translators.js — so the box can be used all lesson without
 * touching an allowance meant for open-ended questions.
 *
 * The site always translates between English and the language it is currently
 * about, so `study` picks the other end of the pair and `from` says which way
 * round it is going.
 */
router.post('/', async (req, res) => {
  const text = String(req.body?.text ?? '').slice(0, MAX_INPUT);
  const study = ['fr', 'la'].includes(req.body?.study) ? req.body.study : 'es';
  const from = req.body?.from === 'en' ? 'en' : study;
  const to = from === 'en' ? study : 'en';

  if (!text.trim()) return res.json({ translation: '', engine: null });

  /**
   * Whether the sentence is finished, which decides whether a model may see it.
   *
   * The box translates as you type, so a sentence being typed produces a
   * request per pause — each one a different prefix, so each one a cache miss.
   * Sending those to a model would spend a day's free quota on half-sentences
   * nobody asked about. The free engines answer the preview; the page asks
   * again once typing has stopped, and that request is the one allowed to be
   * good. See public/js/views/home.js.
   */
  const settled = req.body?.settled === true;

  const key = `${from}>${to}:${text}`;
  const hit = cache.get(key);
  // A finished translation is served to a preview too — never the other way
  // round, or a half-typed answer would outlive the good one.
  if (hit && Date.now() - hit.at < CACHE_TTL && (hit.settled || !settled)) {
    return res.json(hit.value);
  }

  try {
    const result = await translate(text, from, to, { model: settled });
    const payload = {
      translation: result.text,
      engine: result.engine,
      notes: result.notes || [],
      uncertain: result.uncertain === true,
    };

    // Latin is checked rather than trusted. Every word is parsed, so the page
    // can show the case of each one, and a head noun in the wrong case is put
    // right where the English leaves no room for doubt — see latin-check.js.
    if (to === 'la' && payload.translation.trim()) {
      const checked = await checkLatin(text, payload.translation).catch(() => null);
      if (checked) {
        payload.translation = checked.text;
        payload.latin = {
          parses: checked.parses, notes: checked.notes, reliable: checked.reliable,
        };
      }
    }

    remember(key, payload, settled);
    return res.json(payload);
  } catch (error) {
    console.warn('[translate]', error.message);
    return res.status(502).json({
      error: {
        fr: 'Impossible de traduire pour le moment. Réessayez.',
        la: 'Could not translate just now. Try again.',
        es: 'No se pudo traducir ahora mismo. Inténtalo de nuevo.',
      }[study],
      // Why each engine declined. Not shown to a reader — the page uses
      // `error` — but a translator that works on a laptop and fails on the
      // deployed site is otherwise diagnosable only from server logs, and the
      // engines fail for reasons that depend on which IP is asking.
      detail: error.message,
    });
  }
});
