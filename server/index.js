import path from 'node:path';
import express from 'express';
import { loadEnv, ROOT } from './env.js';
import { chainInfo, hasProvider, providerInfo } from './llm.js';
import { router as translate } from './routes/translate.js';
import { router as dictionary } from './routes/dictionary.js';
import { router as report } from './routes/report.js';
import { router as speak } from './routes/speak.js';

loadEnv();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const PUBLIC_DIR = path.join(ROOT, 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.use('/api/translate', translate);
app.use('/api/dictionary', dictionary);
app.use('/api/report', report);
app.use('/api/speak', speak);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: hasProvider(), provider: providerInfo() });
});

/**
 * The app is a single page, so a stale module can survive in an open tab for a
 * long time — navigating between pages never re-fetches it. Code and markup
 * therefore revalidate on every load (cheap: a 304 when nothing changed), and so
 * do the SVG illustrations, which get redrawn. Anything else in assets/ caches hard.
 */
app.use(express.static(PUBLIC_DIR, {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (/\.(?:html|js|css|svg)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// Single-page app: anything that is not an API route falls through to the shell.
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((error, _req, res, _next) => {
  console.error('[server]', error);
  res.status(error.status || 500).json({ error: error.message || 'Internal server error.' });
});

const server = app.listen(PORT, () => {
  console.log(`Interpres → http://localhost:${PORT}`);
  const chain = chainInfo();
  if (!chain.length) {
    console.log('  Models: none configured — translation, the conjugator, the decliner and');
    console.log('          the dictionary all still work, since none of them uses one. Only a');
    console.log('          Latin question the site cannot answer itself needs a model:');
    console.log('          set GROQ_API_KEY for a free one.');
  } else {
    chain.forEach((provider, index) => {
      const role = index === 0 ? 'Model' : ' ↳ then';
      console.log(`  ${role}: ${provider.label} (${provider.model})${provider.free ? ' — free' : ' — PAID'}`);
    });
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Start on another one with: PORT=4100 npm start`);
    process.exit(1);
  }
  throw error;
});
