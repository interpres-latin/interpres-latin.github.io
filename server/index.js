import path from 'node:path';
import express from 'express';
import { loadEnv, ROOT } from './env.js';
import { hasKey } from './claude.js';
import { router as translate } from './routes/translate.js';
import { router as dictionary } from './routes/dictionary.js';
import { router as verbs } from './routes/verbs.js';
import { router as chat } from './routes/chat.js';

loadEnv();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const PUBLIC_DIR = path.join(ROOT, 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.use('/api/translate', translate);
app.use('/api/dictionary', dictionary);
app.use('/api/verbs', verbs);
app.use('/api/chat', chat);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: hasKey() });
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

// Single-page app: anything that is not an API route falls through to the shell.
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((error, _req, res, _next) => {
  console.error('[server]', error);
  res.status(error.status || 500).json({ error: error.message || 'Error interno del servidor.' });
});

const server = app.listen(PORT, () => {
  console.log(`ProfeGPT → http://localhost:${PORT}`);
  console.log(hasKey()
    ? '  Claude: enabled (translation, examples, chat)'
    : '  Claude: no ANTHROPIC_API_KEY — translation falls back to MyMemory, chat is disabled');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Start on another one with: PORT=4100 npm start`);
    process.exit(1);
  }
  throw error;
});
