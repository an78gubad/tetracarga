import { describe, expect, it } from 'vitest';
import { INTENTOS, interpretar } from './interpretar';
import { ErrorInterpretacion, FallaProveedor } from './proveedor';
import { ProveedorDePrueba } from './proveedor-de-prueba';

const AC01 = '40 cajas de 60x40x30 de 12 kilos y 15 tambores de 200 litros';

const respuestaAC01 = JSON.stringify({
  items: [
    { nombre: 'caja', cantidad: 40, largo_mm: 600, ancho_mm: 400, alto_mm: 300, peso_kg: 12 },
    { nombre: 'tambor de 200 litros', cantidad: 15, largo_mm: null, ancho_mm: null, alto_mm: null, peso_kg: null },
  ],
});

describe('interpretación (RF-02)', () => {
  it('arma la lista con cantidades y medidas declaradas (AC-01)', async () => {
    const proveedor = new ProveedorDePrueba([respuestaAC01]);
    const items = await interpretar(AC01, proveedor);
    expect(items).toEqual([
      { nombre: 'caja', cantidad: 40, largo: 600, ancho: 400, alto: 300, peso: 12 },
      { nombre: 'tambor de 200 litros', cantidad: 15, largo: null, ancho: null, alto: null, peso: null },
    ]);
    expect(proveedor.pedidos[0]?.at(-1)).toEqual({ rol: 'usuario', contenido: AC01 });
  });

  it('redondea las longitudes a milímetros enteros', async () => {
    const respuesta = JSON.stringify({
      items: [{ nombre: 'caja', cantidad: 1, largo_mm: 600.4, ancho_mm: 399.6, alto_mm: 300, peso_kg: 1.5 }],
    });
    const [item] = await interpretar('una caja', new ProveedorDePrueba([respuesta]));
    expect(item).toMatchObject({ largo: 600, ancho: 400, peso: 1.5 });
  });

  it('rechaza respuestas que no son una lista de ítems válida', async () => {
    for (const respuesta of [
      'no es json',
      '{"bultos": []}',
      '{"items": []}',
      '{"items": [{"cantidad": 3}]}',
      '{"items": [{"nombre": "caja", "cantidad": 2.5}]}',
      '{"items": [{"nombre": "caja", "cantidad": 2, "largo_mm": -10}]}',
    ]) {
      await expect(interpretar('x', new ProveedorDePrueba([respuesta])), respuesta).rejects.toBeInstanceOf(
        ErrorInterpretacion,
      );
    }
  });
});

describe('reintentos (RNF-08, AC-20)', () => {
  it('ante una respuesta vacía vuelve a preguntar', async () => {
    const proveedor = new ProveedorDePrueba(['', '  ', respuestaAC01]);
    await expect(interpretar(AC01, proveedor)).resolves.toHaveLength(2);
    expect(proveedor.pedidos).toHaveLength(3);
  });

  it('reintenta un número acotado de veces y después informa la falla del proveedor', async () => {
    const proveedor = new ProveedorDePrueba(Array(INTENTOS + 2).fill(''));
    await expect(interpretar(AC01, proveedor)).rejects.toBeInstanceOf(FallaProveedor);
    expect(proveedor.pedidos).toHaveLength(INTENTOS);
  });

  it('reintenta las fallas transitorias', async () => {
    const proveedor = new ProveedorDePrueba([new FallaProveedor('503', true), respuestaAC01]);
    await expect(interpretar(AC01, proveedor)).resolves.toHaveLength(2);
    expect(proveedor.pedidos).toHaveLength(2);
  });

  it('ante un error de autenticación o de cuota no reintenta', async () => {
    const proveedor = new ProveedorDePrueba([new FallaProveedor('401', false), respuestaAC01]);
    await expect(interpretar(AC01, proveedor)).rejects.toMatchObject({ transitoria: false });
    expect(proveedor.pedidos).toHaveLength(1);
  });

  it('un error de interpretación no se confunde con una falla del proveedor', async () => {
    const proveedor = new ProveedorDePrueba(['{"items": "nada"}', respuestaAC01]);
    await expect(interpretar(AC01, proveedor)).rejects.toBeInstanceOf(ErrorInterpretacion);
    expect(proveedor.pedidos).toHaveLength(1);
  });
});
