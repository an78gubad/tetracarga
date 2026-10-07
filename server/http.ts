import { ProveedorDeepSeek } from './deepseek.js';
import { interpretar } from './interpretar.js';
import { ErrorInterpretacion, FallaProveedor, type ProveedorModelo } from './proveedor.js';

// Proxy propio entre el navegador y el modelo (RNF-07). Lo usan la función de
// Vercel (api/interpretar.ts) y el servidor de desarrollo de Vite.

const LARGO_MAXIMO = 4000;

export interface Entorno {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
}

function json(estado: number, cuerpo: unknown): Response {
  return Response.json(cuerpo, { status: estado });
}

export async function atenderInterpretar(
  request: Request,
  entorno: Entorno,
  crearProveedor: (entorno: Entorno) => ProveedorModelo | null = deEntorno,
): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'metodo', mensaje: 'Usá POST.' });

  const cuerpo = (await request.json().catch(() => null)) as { texto?: unknown } | null;
  const texto = typeof cuerpo?.texto === 'string' ? cuerpo.texto.trim() : '';
  if (texto === '') return json(400, { error: 'pedido', mensaje: 'Falta la descripción de la carga.' });
  if (texto.length > LARGO_MAXIMO) {
    return json(400, { error: 'pedido', mensaje: `La descripción supera los ${LARGO_MAXIMO} caracteres.` });
  }

  const proveedor = crearProveedor(entorno);
  if (!proveedor) {
    return json(500, { error: 'configuracion', mensaje: 'El servidor no tiene configurada la clave del modelo.' });
  }

  try {
    return json(200, { items: await interpretar(texto, proveedor) });
  } catch (error) {
    if (error instanceof ErrorInterpretacion) {
      return json(422, { error: 'interpretacion', mensaje: `No se pudo interpretar la descripción: ${error.message}.` });
    }
    if (error instanceof FallaProveedor) {
      return json(502, { error: 'proveedor', mensaje: `El servicio del modelo falló: ${error.message}.` });
    }
    throw error;
  }
}

function deEntorno(entorno: Entorno): ProveedorModelo | null {
  if (!entorno.DEEPSEEK_API_KEY) return null;
  return new ProveedorDeepSeek(entorno.DEEPSEEK_API_KEY, entorno.DEEPSEEK_MODEL || undefined);
}
