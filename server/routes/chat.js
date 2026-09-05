import { Router } from 'express';
import { askStream, hasKey } from '../claude.js';
import { callerOf, consume, peek, refund } from '../quota.js';

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
  res.json({ enabled: hasKey(), quota: peek(callerOf(req)) });
});

router.post('/', async (req, res) => {
  if (!hasKey()) {
    return res.status(503).json({
      error: 'El chat necesita una clave de API para las preguntas que no son de español. Añade ANTHROPIC_API_KEY a tu .env y reinicia el servidor.',
    });
  }

  const caller = callerOf(req);
  const quota = consume(caller);
  if (!quota.allowed) {
    return res.status(429).json({
      error: `Se acabaron las preguntas libres. Vuelven ${quota.windowMinutes} minutos después de la primera.`,
      quota,
    });
  }

  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = incoming
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .slice(-MAX_TURNS)
    .map((message) => ({ role: message.role, content: message.content.slice(0, MAX_CHARS) }))
    .filter((message) => message.content.trim());

  if (!messages.length || messages.at(-1).role !== 'user') {
    refund(caller);
    return res.status(400).json({ error: 'Se esperaba un mensaje del usuario.' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  let aborted = false;
  let produced = false;
  req.on('close', () => { aborted = true; });

  send({ type: 'quota', quota });

  try {
    for await (const text of askStream({ system: SYSTEM, messages })) {
      if (aborted) return;
      produced = true;
      send({ type: 'delta', text });
    }
    send({ type: 'done' });
  } catch (error) {
    console.error('[chat]', error);
    // Nothing was generated, so the question should not count against them.
    if (!produced) {
      refund(caller);
      send({ type: 'quota', quota: peek(caller) });
    }
    send({ type: 'error', error: error.message || 'Algo salió mal.' });
  } finally {
    res.end();
  }
});
