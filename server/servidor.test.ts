import { describe, expect, it } from 'vitest';
import { ProveedorDeepSeek } from './deepseek';
import { atenderInterpretar } from './http';
import { FallaProveedor } from './proveedor';
import { ProveedorDePrueba } from './proveedor-de-prueba';

function pedido(cuerpo: unknown, method = 'POST') {
  return new Request('http://local/api/interpretar', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(cuerpo) : undefined,
  });
}

const respuesta = JSON.stringify({
  items: [{ nombre: 'caja', cantidad: 2, largo_mm: 600, ancho_mm: 400, alto_mm: 300, peso_kg: 12 }],
});

describe('proxy /api/interpretar (RNF-07)', () => {
  it('devuelve los ítems interpretados', async () => {
    const r = await atenderInterpretar(pedido({ texto: '2 cajas' }), {}, () => new ProveedorDePrueba([respuesta]));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      items: [{ nombre: 'caja', cantidad: 2, largo: 600, ancho: 400, alto: 300, peso: 12 }],
    });
  });

  it('rechaza pedidos sin texto o con otro método', async () => {
    const prueba = () => new ProveedorDePrueba([respuesta]);
    expect((await atenderInterpretar(pedido({ texto: '  ' }), {}, prueba)).status).toBe(400);
    expect((await atenderInterpretar(pedido({}), {}, prueba)).status).toBe(400);
    expect((await atenderInterpretar(pedido(null, 'GET'), {}, prueba)).status).toBe(405);
  });

  it('sin API key informa la falta de configuración', async () => {
    const r = await atenderInterpretar(pedido({ texto: '2 cajas' }), {});
    expect(r.status).toBe(500);
  });

  it('distingue la falla del proveedor del error de interpretación', async () => {
    const falla = () => new ProveedorDePrueba([new FallaProveedor('el proveedor respondió 401', false)]);
    expect((await atenderInterpretar(pedido({ texto: 'x' }), {}, falla)).status).toBe(502);
    const basura = () => new ProveedorDePrueba(['no es json']);
    expect((await atenderInterpretar(pedido({ texto: 'x' }), {}, basura)).status).toBe(422);
  });
});

describe('proveedor DeepSeek, sin red', () => {
  function conRespuesta(estado: number, cuerpo: unknown = {}) {
    const llamadas: RequestInit[] = [];
    const pedir = (async (_url: string, init: RequestInit) => {
      llamadas.push(init);
      return Response.json(cuerpo, { status: estado });
    }) as typeof fetch;
    return { proveedor: new ProveedorDeepSeek('clave-de-prueba', undefined, pedir), llamadas };
  }

  it('manda la clave en el encabezado y devuelve el contenido', async () => {
    const { proveedor, llamadas } = conRespuesta(200, { choices: [{ message: { content: respuesta } }] });
    expect(await proveedor.completar([{ rol: 'usuario', contenido: 'x' }])).toBe(respuesta);
    expect(new Headers(llamadas[0]?.headers).get('Authorization')).toBe('Bearer clave-de-prueba');
  });

  it('una respuesta sin contenido vuelve vacía', async () => {
    const { proveedor } = conRespuesta(200, { choices: [] });
    expect(await proveedor.completar([])).toBe('');
  });

  it('autenticación y cuota no son transitorias; 429 y 5xx sí', async () => {
    for (const [estado, transitoria] of [[401, false], [402, false], [403, false], [429, true], [500, true], [503, true]] as const) {
      const { proveedor } = conRespuesta(estado);
      await expect(proveedor.completar([]), String(estado)).rejects.toMatchObject({ transitoria });
    }
  });

  it('un error de red es transitorio', async () => {
    const pedir = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    await expect(new ProveedorDeepSeek('k', undefined, pedir).completar([])).rejects.toMatchObject({
      transitoria: true,
    });
  });
});
