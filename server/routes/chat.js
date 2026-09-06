import { Router } from 'express';
import { chainInfo, providerChain } from '../llm.js';
import { consume, peek, refund } from '../quota.js';
import { identify } from '../identity.js';

export const router = Router();

const MAX_TURNS = 40;
const MAX_CHARS = 12000;

// Kept deliberately general for now — this is the knob to turn when ProfeGPT
// gets its real teaching persona. Only questions the grounded tutor could not
// answer from the site's own data ever reach it.
const SYSTEM = `You are ProfeGPT, a helpful, knowledgeable and friendly assistant.

You live on a Spanish-learning site, so when a question touches Spanish —
grammar, vocabulary, translation, culture — answer with a teacher's care: give
the direct answer first, then a short example, and correct mistakes gently.
Reply in the language the user writes in. For anything else, just be a good
general-purpose assistant.

Keep answers tight. Use markdown only when structure genuinely helps.`;

/**
 * Providers hand back whole paragraphs of billing advice. Keep the first line,
 * which is the part a visitor can act on, and drop the rest.
 */
function describe(failures) {
  if (!failures.length) return 'Ningún modelo pudo responder.';
  const first = failures[0].split(/[.\n]/)[0].trim();
  return `Ningún modelo pudo responder ahora mismo (${first}). Inténtalo de nuevo en un momento.`;
}

router.get('/status', (req, res) => {
  const chain = chainInfo();
  res.json({
    enabled: chain.length > 0,
    provider: chain[0] || null,
    chain,
    quota: peek(identify(req, res)),
  });
});

router.post('/', async (req, res) => {
  const chain = providerChain();
  if (!chain.length) {
    return res.status(503).json({
      error: 'Las preguntas que no son de español necesitan un modelo. Añade GEMINI_API_KEY (gratis) a tu .env y reinicia el servidor.',
    });
  }

  const caller = identify(req, res);
  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = incoming
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .slice(-MAX_TURNS)
    .map((message) => ({ role: message.role, content: message.content.slice(0, MAX_CHARS) }))
    .filter((message) => message.content.trim());

  if (!messages.length || messages.at(-1).role !== 'user') {
    return res.status(400).json({ error: 'Se esperaba un mensaje del usuario.' });
  }

  // One slot per question, whichever model ends up answering it. Refuse before
  // opening a stream, so the client gets a plain 429 to roll the tape from.
  const quota = consume(caller);
  if (!quota.allowed) {
    return res.status(429).json({
      error: `Se acabaron las preguntas libres. Vuelven ${quota.windowMinutes} minutos después de la primera.`,
      quota,
    });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  let aborted = false;
  // On the *response*, not the request: in modern Node a request emits 'close'
  // as soon as its body has been read, which is immediately for a POST —
  // listening there aborts every stream before the first token arrives.
  res.on('close', () => { aborted = true; });

  const failures = [];
  send({ type: 'quota', quota });

  // Walk the chain until one provider answers. A provider that fails before
  // producing anything hands straight over to the next; the question still
  // only costs the one slot taken above.
  let generated = false;

  for (const provider of chain) {
    if (aborted) break;

    let produced = false;
    try {
      send({ type: 'provider', provider: provider.label });

      for await (const text of provider.askStream({ system: SYSTEM, messages })) {
        if (aborted) break;
        produced = true;
        generated = true;
        send({ type: 'delta', text });
      }
      if (aborted) break;

      send({ type: 'done', provider: provider.label });
      return res.end();
    } catch (error) {
      console.warn(`[chat] ${provider.id} failed:`, error.message);
      failures.push(`${provider.label}: ${error.message}`);

      // Another provider may still answer, so do not give up the slot yet.
      if (!produced) continue;

      // Half an answer is already on screen; do not start a second one over it.
      send({ type: 'error', error: error.message });
      return res.end();
    }
  }

  // Nothing was ever generated — whether every provider failed or the visitor
  // left before the first token, the question should not cost them a slot.
  if (!generated) refund(caller);
  if (aborted) return res.end();

  send({ type: 'quota', quota: peek(caller) });
  send({ type: 'error', error: describe(failures) });
  res.end();
});
