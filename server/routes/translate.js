import { Router } from 'express';
import { translate } from '../translators.js';

export const router = Router();

const MAX_INPUT = 5000;

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
  const study = req.body?.study === 'fr' ? 'fr' : 'es';
  const from = req.body?.from === 'en' ? 'en' : study;
  const to = from === 'en' ? study : 'en';

  if (!text.trim()) return res.json({ translation: '', engine: null });

  const key = `${from}>${to}:${text}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return res.json(hit.value);

  try {
    const result = await translate(text, from, to);
    const payload = { translation: result.text, engine: result.engine, notes: result.notes || [] };
    remember(key, payload);
    return res.json(payload);
  } catch (error) {
    console.warn('[translate]', error.message);
    return res.status(502).json({
      error: study === 'fr'
        ? 'Impossible de traduire pour le moment. Réessayez.'
        : 'No se pudo traducir ahora mismo. Inténtalo de nuevo.',
    });
  }
});
