import { Router } from 'express';
import { chainInfo, providerChain } from '../llm.js';

export const router = Router();

const MAX_TURNS = 40;
const MAX_CHARS = 12000;

/**
 * Whatever the site's own data could not answer.
 *
 * There was a topic gate in front of this: anything that did not look like a
 * Latin question was refused, in the browser and again in this prompt, so that
 * a classroom could not be handed a general chatbot. This is not a classroom,
 * and the gate is gone from both ends. Anything the conjugator, the decliner,
 * Whitaker's and the grammar notes could not reach arrives here and is
 * answered.
 */
const SYSTEM = `You are Interpres, a helpful, knowledgeable and friendly
assistant: patient, precise, and honest about what is uncertain.

You live on a Latin site, so when a question touches Latin (grammar,
vocabulary, translation, the Cambridge Latin Course, Roman history and culture)
answer with a teacher's care: give the direct answer first, then a short
example, and correct mistakes gently. Answer in English unless the user writes
in Latin.

For anything else, just be a good general-purpose assistant.

Keep answers tight. Use markdown only when structure genuinely helps.`;

/**
 * In English, like the rest of the site's working language: English is what a
 * Latin lesson is conducted in.
 */
const MESSAGES = {
  noProvider: 'Questions the site cannot answer from its own data need a model. Add GROQ_API_KEY (free) to your .env and restart the server.',
  noMessage: 'A message from the user was expected.',
  noModel: 'No model could answer.',
  noModelNow: (first) => `No model could answer just now (${first}). Try again in a moment.`,
};

/**
 * Providers hand back whole paragraphs of billing advice. Keep the first line,
 * which is the part a visitor can act on, and drop the rest.
 */
function describe(failures) {
  if (!failures.length) return MESSAGES.noModel;
  const first = failures[0].split(/[.\n]/)[0].trim();
  return MESSAGES.noModelNow(first);
}

router.get('/status', (_req, res) => {
  const chain = chainInfo();
  res.json({ enabled: chain.length > 0, provider: chain[0] || null, chain });
});

router.post('/', async (req, res) => {
  const chain = providerChain();
  if (!chain.length) return res.status(503).json({ error: MESSAGES.noProvider });

  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = incoming
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .slice(-MAX_TURNS)
    .map((message) => ({ role: message.role, content: message.content.slice(0, MAX_CHARS) }))
    .filter((message) => message.content.trim());

  if (!messages.length || messages.at(-1).role !== 'user') {
    return res.status(400).json({ error: MESSAGES.noMessage });
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

  // Walk the chain until one provider answers. A provider that fails before
  // producing anything hands straight over to the next.
  for (const provider of chain) {
    if (aborted) break;

    let produced = false;
    try {
      send({ type: 'provider', provider: provider.label });

      for await (const text of provider.askStream({ system: SYSTEM, messages })) {
        if (aborted) break;
        produced = true;
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

  if (aborted) return res.end();

  send({ type: 'error', error: describe(failures) });
  res.end();
});
