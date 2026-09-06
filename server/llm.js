/**
 * Picks whichever language-model provider is configured.
 *
 * Free tiers come first, so the site costs nothing to run unless you
 * deliberately point it at a paid one. Set LLM_PROVIDER to force a choice.
 *
 * Nothing here is on the critical path for Spanish questions — those are
 * answered by the grounded tutor in the browser, from the site's own data.
 * The model is only reached for off-topic questions, translations and the
 * dictionary's example sentences.
 */

import * as gemini from './providers/gemini.js';
import * as groq from './providers/groq.js';
import * as openrouter from './providers/openrouter.js';
import * as anthropic from './providers/anthropic.js';

/**
 * Preference order. Free tiers first, and OpenRouter last among them because
 * it is the designated overflow: the primary's allowance is spent before
 * anything reaches it.
 */
const PROVIDERS = [gemini, groq, openrouter, anthropic];

export function activeProvider() {
  const forced = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (forced) return PROVIDERS.find((provider) => provider.id === forced && provider.configured()) || null;
  return PROVIDERS.find((provider) => provider.configured()) || null;
}

export function hasProvider() {
  return activeProvider() !== null;
}

/**
 * Every configured provider, in the order the chat should fall through them.
 * Each becomes its own quota tier, so spending the first one's allowance moves
 * traffic to the next rather than cutting the visitor off.
 */
export function providerChain() {
  const forced = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (forced) {
    const only = PROVIDERS.find((provider) => provider.id === forced && provider.configured());
    return only ? [only] : [];
  }
  return PROVIDERS.filter((provider) => provider.configured());
}

/** Describe the chain for the UI and the startup banner. */
export function chainInfo() {
  return providerChain().map((provider) => ({
    id: provider.id,
    label: provider.label,
    model: provider.model(),
    free: provider.free,
  }));
}

/** What to show in the UI and the startup banner. */
export function providerInfo() {
  const provider = activeProvider();
  if (!provider) return null;
  return { id: provider.id, label: provider.label, model: provider.model(), free: provider.free };
}

function required() {
  const provider = activeProvider();
  if (provider) return provider;
  const error = new Error(
    'No language-model provider is configured. Set GEMINI_API_KEY (free), GROQ_API_KEY (free) or ANTHROPIC_API_KEY.',
  );
  error.status = 503;
  error.code = 'NO_PROVIDER';
  throw error;
}

/**
 * Walk the chain until one provider answers. Translation and the dictionary's
 * example sentences come through here, and they used to give up on the first
 * provider's bad day — which, on a free tier with a daily cap, is most of the
 * time. The chat route walks the chain itself, because it has to interleave
 * quota accounting with the attempts.
 */
export async function ask(options) {
  const chain = providerChain();
  if (!chain.length) required();

  let last = null;
  for (const provider of chain) {
    try {
      return await provider.ask(options);
    } catch (error) {
      console.warn(`[llm] ${provider.id} failed:`, error.message.split('\n')[0]);
      last = error;
    }
  }
  throw last;
}

export function askStream(options) {
  return required().askStream(options);
}

/**
 * Models sometimes wrap JSON in prose or a code fence. Pull the first
 * balanced JSON value out of the text and parse it.
 */
export function parseJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[[{]/);
  if (start === -1) return null;
  const open = body[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < body.length; i += 1) {
    const char = body[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(body.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}
