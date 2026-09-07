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
const SUBJECT = { es: 'Spanish', fr: 'French', la: 'Latin' };

const SYSTEM = (study) => `You are ProfeGPT, a helpful, knowledgeable and friendly assistant.

You live on a ${SUBJECT[study]}-learning site, so when a question touches
${SUBJECT[study]} — grammar, vocabulary, translation, culture — answer with a
teacher's care: give the direct answer first, then a short example, and correct
mistakes gently. Reply in the language the user writes in. For anything else,
just be a good general-purpose assistant.

Keep answers tight. Use markdown only when structure genuinely helps.`;

/**
 * The allowance deliberately has no language in it.
 *
 * A visitor gets one bucket of off-topic questions per window, whichever side
 * of the site they are on: switching to French is a different subject, not a
 * second helping. See server/quota.js, which keys on the browser alone.
 */
const MESSAGES = {
  es: {
    noProvider: 'Las preguntas que no son de español necesitan un modelo. Añade GEMINI_API_KEY (gratis) a tu .env y reinicia el servidor.',
    noMessage: 'Se esperaba un mensaje del usuario.',
    spent: (minutes) => `Se acabaron las preguntas libres. Vuelven ${minutes} minutos después de la primera.`,
    noModel: 'Ningún modelo pudo responder.',
    noModelNow: (first) => `Ningún modelo pudo responder ahora mismo (${first}). Inténtalo de nuevo en un momento.`,
  },
  fr: {
    noProvider: 'Les questions qui ne portent pas sur le français ont besoin d’un modèle. Ajoutez GEMINI_API_KEY (gratuite) à votre .env et redémarrez le serveur.',
    noMessage: 'Un message de l’utilisateur était attendu.',
    spent: (minutes) => `Il ne reste plus de questions libres. Elles reviennent ${minutes} minutes après la première.`,
    noModel: 'Aucun modèle n’a pu répondre.',
    noModelNow: (first) => `Aucun modèle n’a pu répondre pour le moment (${first}). Réessayez dans un instant.`,
  },
  // In English, like the rest of the Latin side: the chrome there defaults to
  // English because English is the working language of a Latin lesson.
  la: {
    noProvider: 'Questions that are not about Latin need a model. Add GEMINI_API_KEY (free) to your .env and restart the server.',
    noMessage: 'A message from the user was expected.',
    spent: (minutes) => `No free questions left. They come back ${minutes} minutes after the first.`,
    noModel: 'No model could answer.',
    noModelNow: (first) => `No model could answer just now (${first}). Try again in a moment.`,
  },
};

/**
 * Providers hand back whole paragraphs of billing advice. Keep the first line,
 * which is the part a visitor can act on, and drop the rest.
 */
function describe(failures, strings) {
  if (!failures.length) return strings.noModel;
  const first = failures[0].split(/[.\n]/)[0].trim();
  return strings.noModelNow(first);
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
  const study = ['fr', 'la'].includes(req.body?.study) ? req.body.study : 'es';
  const strings = MESSAGES[study];

  const chain = providerChain();
  if (!chain.length) return res.status(503).json({ error: strings.noProvider });

  const caller = identify(req, res);
  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = incoming
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .slice(-MAX_TURNS)
    .map((message) => ({ role: message.role, content: message.content.slice(0, MAX_CHARS) }))
    .filter((message) => message.content.trim());

  if (!messages.length || messages.at(-1).role !== 'user') {
    return res.status(400).json({ error: strings.noMessage });
  }

  // One slot per question, whichever model ends up answering it. Refuse before
  // opening a stream, so the client gets a plain 429 to roll the tape from.
  const quota = consume(caller);
  if (!quota.allowed) {
    return res.status(429).json({ error: strings.spent(quota.windowMinutes), quota });
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

      for await (const text of provider.askStream({ system: SYSTEM(study), messages })) {
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
  send({ type: 'error', error: describe(failures, strings) });
  res.end();
});
