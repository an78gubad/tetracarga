/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { atenderInterpretar, type Entorno } from './server/http.js';

/**
 * En desarrollo, Vite sirve /api/interpretar con el mismo manejador que la
 * función de Vercel. La clave se lee acá, del lado del servidor, y no pasa al bundle.
 */
function apiLocal(entorno: Entorno): Plugin {
  return {
    name: 'api-local',
    configureServer(server) {
      server.middlewares.use('/api/interpretar', async (req, res) => {
        const partes: Buffer[] = [];
        for await (const parte of req) partes.push(parte as Buffer);
        const respuesta = await atenderInterpretar(
          new Request('http://localhost/api/interpretar', {
            method: req.method,
            headers: { 'Content-Type': req.headers['content-type'] ?? 'application/json' },
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(partes),
          }),
          entorno,
        );
        res.statusCode = respuesta.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(await respuesta.text());
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // El tercer argumento '' lee también las variables sin prefijo VITE_, solo acá.
  const entorno = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      apiLocal({ DEEPSEEK_API_KEY: entorno.DEEPSEEK_API_KEY, DEEPSEEK_MODEL: entorno.DEEPSEEK_MODEL }),
    ],
    test: {
      include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    },
  };
});
