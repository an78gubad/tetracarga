import { describe, expect, it } from 'vitest';
import { CONTENEDOR_20 } from '../catalogo/contenedores';
import { consolidar } from '../consolidar';
import type { Disposicion, Item } from '../dominio/tipos';
import { brilloDeBulto, colorDeTipo } from './colores';
import { bultosDeTipo, primeros, visiblesPorTipo } from './secuencia';

const items: Item[] = [
  { id: 'item-0', nombre: 'caja', cantidad: 30, largo: 600, ancho: 400, alto: 300, peso: 12 },
  { id: 'item-1', nombre: 'bolsa', cantidad: 20, largo: 900, ancho: 500, alto: 200, peso: 25 },
];

function disposicion(): Disposicion {
  const resultado = consolidar(items, CONTENEDOR_20);
  if (!resultado.valida) throw new Error('la carga de prueba no pasó el validador');
  return resultado.disposicion;
}

describe('secuencia de carga (AC-08)', () => {
  it('en la posición k se ven exactamente los primeros k bultos', () => {
    const d = disposicion();
    const n = d.colocados.length;
    for (const k of [0, 1, 17, n - 1, n]) {
      expect(primeros(d, k)).toEqual(d.colocados.slice(0, k));
      const dibujados = [...visiblesPorTipo(d, k).entries()].flatMap(([id, cuenta]) =>
        bultosDeTipo(d, id).slice(0, cuenta),
      );
      expect(new Set(dibujados)).toEqual(new Set(d.colocados.slice(0, k)));
    }
  });

  it('acota k a la cantidad de bultos', () => {
    const d = disposicion();
    expect(primeros(d, -3)).toEqual([]);
    expect(primeros(d, d.colocados.length + 10)).toHaveLength(d.colocados.length);
  });
});

describe('colores (AC-09)', () => {
  it('cada tipo conserva su color al consolidar dos veces', () => {
    const colores = () => items.map((_, i) => colorDeTipo(i));
    expect(colores()).toEqual(colores());
  });

  it('los colores de los primeros tipos son todos distintos', () => {
    const colores = Array.from({ length: 30 }, (_, i) => colorDeTipo(i));
    expect(new Set(colores).size).toBe(30);
  });

  it('dos tipos se distinguen a simple vista', () => {
    const canales = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    const [a, b] = [canales(colorDeTipo(0)), canales(colorDeTipo(1))];
    const distancia = Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
    expect(distancia).toBeGreaterThan(150);
  });

  it('dos bultos apilados del mismo tipo tienen distinto brillo', () => {
    const caja = items[0]!;
    const abajo = { itemId: caja.id, indice: 0, x: 0, y: 0, z: 0, orientacion: 'LAH' as const };
    const arriba = { ...abajo, indice: 1, z: 300 };
    const alLado = { ...abajo, indice: 2, y: 400 };
    expect(brilloDeBulto(abajo, caja)).not.toBe(brilloDeBulto(arriba, caja));
    expect(brilloDeBulto(abajo, caja)).not.toBe(brilloDeBulto(alLado, caja));
  });
});
