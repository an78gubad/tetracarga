import { FallaProveedor, type Mensaje, type ProveedorModelo } from './proveedor.js';

// Implementación de ProveedorModelo para DeepSeek. Corre solo en el servidor:
// la API key no llega nunca al navegador (RNF-07).

const URL_DEEPSEEK = 'https://api.deepseek.com/chat/completions';
const MODELO_POR_DEFECTO = 'deepseek-chat';
const ESPERA_MAXIMA_MS = 20_000;

/** 401/403: credenciales; 402: saldo agotado. Reintentarlos no cambia nada. */
function esTransitoria(estado: number): boolean {
  return estado === 408 || estado === 429 || estado >= 500;
}

export class ProveedorDeepSeek implements ProveedorModelo {
  constructor(
    private readonly apiKey: string,
    private readonly modelo: string = MODELO_POR_DEFECTO,
    private readonly pedir: typeof fetch = fetch,
  ) {}

  async completar(mensajes: readonly Mensaje[]): Promise<string> {
    let respuesta: Response;
    try {
      respuesta = await this.pedir(URL_DEEPSEEK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.modelo,
          messages: mensajes.map((m) => ({ role: m.rol === 'sistema' ? 'system' : 'user', content: m.contenido })),
          response_format: { type: 'json_object' },
          temperature: 0,
        }),
        signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
      });
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error);
      throw new FallaProveedor(`no se pudo contactar al proveedor del modelo (${motivo})`, true);
    }

    if (!respuesta.ok) {
      throw new FallaProveedor(`el proveedor del modelo respondió ${respuesta.status}`, esTransitoria(respuesta.status));
    }

    const datos = (await respuesta.json().catch(() => null)) as {
      choices?: { message?: { content?: unknown } }[];
    } | null;
    const contenido = datos?.choices?.[0]?.message?.content;
    return typeof contenido === 'string' ? contenido : '';
  }
}
