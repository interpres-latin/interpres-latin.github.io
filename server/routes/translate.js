import { Router } from 'express';
import { translate } from '../translators.js';
import { checkLatin } from '../latin-check.js';

export const router = Router();

// 500, matching the box on the page. A translator for a lesson is for
// sentences, not essays, and every engine below charges by the character.
const MAX_INPUT = 500;

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 12;
const CACHE_MAX = 500;

function remember(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), value });
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

  const key = `${from}>${to}:${text}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return res.json(hit.value);

  try {
    const result = await translate(text, from, to);
    const payload = {
      translation: result.text,
      engine: result.engine,
      notes: result.notes || [],
      uncertain: result.uncertain === true,
      uncertainWhy: result.uncertainWhy ?? null,
      // Words the engine could not translate and left as they were. The page
      // colours these rather than letting them pass as translation.
      unsure: result.unsure ?? [],
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

    remember(key, payload);
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
