import { Router } from 'express';
import { chainInfo, providerChain } from '../llm.js';
import { callerOf, consume, overall, refund } from '../quota.js';

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

router.get('/status', (req, res) => {
  const chain = chainInfo();
  res.json({
    enabled: chain.length > 0,
    provider: chain[0] || null,
    chain,
    quota: overall(callerOf(req), chain.length),
  });
});

router.post('/', async (req, res) => {
  const chain = providerChain();
  if (!chain.length) {
    return res.status(503).json({
      error: 'Las preguntas que no son de español necesitan un modelo. Añade GEMINI_API_KEY (gratis) a tu .env y reinicia el servidor.',
    });
  }

  const caller = callerOf(req);
  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = incoming
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .slice(-MAX_TURNS)
    .map((message) => ({ role: message.role, content: message.content.slice(0, MAX_CHARS) }))
    .filter((message) => message.content.trim());

  if (!messages.length || messages.at(-1).role !== 'user') {
    return res.status(400).json({ error: 'Se esperaba un mensaje del usuario.' });
  }

  // Nothing left in any tier: refuse before opening a stream, so the client
  // gets a plain 429 to roll the tape from.
  const before = overall(caller, chain.length);
  if (before.remaining <= 0) {
    return res.status(429).json({
      error: `Se acabaron las preguntas libres. Vuelven ${before.windowMinutes} minutos después de la primera.`,
      quota: before,
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

  // Walk the chain. A tier whose allowance is spent, or which fails before
  // producing anything, hands straight over to the next one.
  for (let tier = 0; tier < chain.length; tier += 1) {
    if (aborted) return;

    const provider = chain[tier];
    const quota = consume(caller, tier);
    if (!quota.allowed) continue;

    let produced = false;
    try {
      send({ type: 'quota', quota: overall(caller, chain.length), provider: provider.label });

      for await (const text of provider.askStream({ system: SYSTEM, messages })) {
        if (aborted) return;
        produced = true;
        send({ type: 'delta', text });
      }

      send({ type: 'done', provider: provider.label });
      return res.end();
    } catch (error) {
      console.warn(`[chat] ${provider.id} failed:`, error.message);
      failures.push(`${provider.label}: ${error.message}`);

      // Nothing was generated, so the question should not count against them.
      if (!produced) {
        refund(caller, tier);
        continue;
      }

      // Half an answer is already on screen; do not start a second one over it.
      send({ type: 'error', error: error.message });
      return res.end();
    }
  }

  const quota = overall(caller, chain.length);
  send({ type: 'quota', quota });
  send({
    type: 'error',
    error: failures.length
      ? `Ningún modelo pudo responder. ${failures.join(' · ')}`
      : `Se acabaron las preguntas libres. Vuelven ${quota.windowMinutes} minutos después de la primera.`,
    exhausted: quota.remaining <= 0,
  });
  res.end();
});
