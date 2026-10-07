import { atenderInterpretar } from '../server/http.js';

// Función serverless de Vercel: único punto que habla con el modelo.
// Lo importado desde acá lleva extensión .js porque Vercel compila cada archivo
// por separado y Node, en ESM, no completa extensiones.

export function POST(request: Request): Promise<Response> {
  return atenderInterpretar(request, process.env);
}
