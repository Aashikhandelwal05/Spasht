import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import handler from './api-spasht-ai.mjs';

function aiDevApi() {
  return {
    name: 'spasht-ai-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/spasht-ai', async (req, res) => {
        try {
          await handler(req, res);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), aiDevApi()],
});