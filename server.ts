import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { handlePipAIAsk } from './server/ai.ts';
import {
  handleDeleteAccount,
  handleGetMe,
  handleLogin,
  handleLogout,
  handleSignup,
  handleVerifyToken,
} from './server/auth.ts';
import { handleGetCloudDataset, handleSyncDataset } from './server/sync.ts';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '4mb' }));

  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Health & config status (exposes boolean flags only, never secrets)
  app.get('/api/health', (_req, res) => {
    const hasGemini = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY'
    );
    const hasResend = Boolean(
      process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'YOUR_RESEND_API_KEY'
    );
    res.json({
      ok: true,
      service: 'PancakePilot AI API',
      geminiConfigured: hasGemini,
      resendConfigured: hasResend,
    });
  });

  // Authentication endpoints
  app.post('/api/auth/signup', handleSignup);
  app.post('/api/auth/login', handleLogin);
  app.post('/api/auth/verify', handleVerifyToken);
  app.get('/api/auth/me', handleGetMe);
  app.post('/api/auth/logout', handleLogout);
  app.delete('/api/auth/account', handleDeleteAccount);

  // Pip AI Copilot endpoint
  app.post('/api/ai/ask', handlePipAIAsk);

  // Cloud synchronisation endpoints
  app.get('/api/sync', handleGetCloudDataset);
  app.post('/api/sync', handleSyncDataset);

  // Vite dev middleware or production static assets
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PancakePilot AI running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PancakePilot AI server:', err);
  process.exit(1);
});
