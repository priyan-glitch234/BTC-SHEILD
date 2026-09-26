import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes/api.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mode: 'OFFLINE_ANALYSIS_MODE', timestamp: new Date().toISOString() });
  });

  app.use('/api', apiRouter);

  const httpServer = createHttpServer(app);

  // Vite middleware for development vs Static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
          // The preview is served over HTTPS behind a reverse proxy that
          // terminates TLS on the default port, so the HMR client must be
          // told to connect via wss on 443 rather than inferring ws on the
          // internal port (3000), otherwise the socket closes immediately.
          protocol: 'wss',
          clientPort: 443,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[BTC-SHIELD] Server listening on http://0.0.0.0:${PORT} [OFFLINE INTELLIGENCE MODE]`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
