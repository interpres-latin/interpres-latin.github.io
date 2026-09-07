/**
 * DeepL: a real translation engine, and the best one here for French.
 *
 * It is what Lingva was supposed to be — accurate, dedicated, and answering to
 * a published contract rather than to whether Google feels like serving a
 * volunteer's proxy today. The free tier is 500,000 characters a month, which a
 * class typing sentences will not come close to spending.
 *
 * It goes above the model because it is better at the job and cheaper to ask:
 * a specialist translator, deterministic, with no habit of explaining itself
 * and no daily request cap to exhaust by lunchtime.
 *
 * **It has no Latin.** Nothing does, among dedicated engines — Latin is why the
 * model is in the chain at all. So this declines Latin by name and the model
 * takes it, which is the one place a model is not merely the best option but
 * the only one.
 */

import { throttle, USER_AGENT } from './throttle.js';

/**
 * A free key ends in `:fx` and must go to the free host; a paid one must not.
 * Sending either to the wrong host is a 403 that looks like a bad key.
 */
function endpoint(key) {
  return key.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
}

/** DeepL's own codes. Latin is absent from this list because it is absent. */
const CODES = { en: 'EN', es: 'ES', fr: 'FR' };

/** Target codes are regional where DeepL insists on it. */
const TARGETS = { en: 'EN-GB', es: 'ES', fr: 'FR' };

export function hasDeepl() {
  return Boolean(process.env.DEEPL_API_KEY?.trim());
}

export async function deepl(text, from, to) {
  const key = process.env.DEEPL_API_KEY?.trim();
  if (!key) throw new Error('No DeepL key');
  if (!CODES[from] || !TARGETS[to]) throw new Error(`DeepL has no ${from}|${to} pair`);

  const body = new URLSearchParams({
    text,
    source_lang: CODES[from],
    target_lang: TARGETS[to],
    // The box is for sentences a student is reading, not for markup.
    preserve_formatting: '0',
  });

  const response = await throttle('deepl', 80, () => fetch(endpoint(key), {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body,
    signal: AbortSignal.timeout(15000),
  }));

  if (response.status === 456) throw new Error('DeepL quota for this month is spent');
  if (response.status === 403) throw new Error('DeepL refused the key');
  if (!response.ok) throw new Error(`DeepL responded ${response.status}`);

  const payload = await response.json();
  const translated = payload?.translations?.[0]?.text;
  if (!translated?.trim()) throw new Error('DeepL returned no translation');

  return { text: translated.trim(), engine: 'DeepL' };
}
