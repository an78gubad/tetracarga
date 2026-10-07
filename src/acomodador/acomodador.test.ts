import { describe, expect, it } from 'vitest';
import { CONTENEDOR_20 } from '../catalogo/contenedores';
import type { Item } from '../dominio/tipos';
import { validar } from '../validador/validador';
import { acomodar } from './acomodador';

function item(id: string, cantidad: number, largo: number, ancho: number, alto: number, peso: number): Item {
  return { id, nombre: id, cantidad, largo, ancho, alto, peso };
}

/** Generador pseudoaleatorio con semilla fija: los casos son siempre los mismos. */
function generador(semilla: number) {
  let s = semilla;
  return (min: number, max: number) => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return min + (s % (max - min + 1));
  };
}

function cargaMezclada(semilla: number, tipos: number, bultos: number): Item[] {
  const azar = generador(semilla);
  return Array.from({ length: tipos }, (_, i) =>
    item(`tipo-${i}`, Math.ceil(bultos / tipos), azar(200, 1200), azar(200, 1000), azar(150, 1000), azar(5, 300)),
  );
}

const total = (items: Item[]) => items.reduce((n, i) => n + i.cantidad, 0);

describe('acomodador (RF-07)', () => {
  it('coloca una carga chica completa y válida', () => {
    const items = [item('caja', 40, 600, 400, 300, 12)];
    const d = acomodar(items, CONTENEDOR_20);
    expect(d.colocados).toHaveLength(40);
    expect(d.noColocados).toEqual([]);
    expect(validar(d, items, CONTENEDOR_20)).toEqual([]);
  });

  it('da la misma disposición para la misma entrada, sin tolerancia (AC-21)', () => {
    const items = cargaMezclada(7, 5, 200);
    expect(acomodar(items, CONTENEDOR_20)).toEqual(acomodar(items, CONTENEDOR_20));
  });

  it('no depende del orden en que vienen los ítems', () => {
    const items = cargaMezclada(11, 4, 120);
    expect(acomodar([...items].reverse(), CONTENEDOR_20)).toEqual(acomodar(items, CONTENEDOR_20));
  });

  it('cuando no entra por volumen coloca lo que entra y deja afuera el resto (AC-07)', () => {
    const items = [item('pallet', 30, 1200, 1000, 1000, 100)];
    const d = acomodar(items, CONTENEDOR_20);
    expect(d.colocados.length).toBeGreaterThan(0);
    expect(d.noColocados.length).toBeGreaterThan(0);
    expect(d.colocados.length + d.noColocados.length).toBe(30);
    expect(validar(d, items, CONTENEDOR_20)).toEqual([]);
  });

  it('cuando se pasa de peso no supera la carga máxima (AC-15)', () => {
    const items = [item('lingote', 100, 300, 200, 100, 500)];
    const d = acomodar(items, CONTENEDOR_20);
    expect(d.colocados).toHaveLength(56); // 56 x 500 = 28.000 kg; el 57 se pasa de 28.130
    expect(d.noColocados).toHaveLength(44);
    expect(validar(d, items, CONTENEDOR_20)).toEqual([]);
  });

  it('todo lo que produce pasa el validador', () => {
    for (let semilla = 1; semilla <= 20; semilla++) {
      const items = cargaMezclada(semilla, 1 + (semilla % 6), 60 + semilla * 7);
      const d = acomodar(items, CONTENEDOR_20);
      expect(validar(d, items, CONTENEDOR_20), `semilla ${semilla}`).toEqual([]);
      expect(d.colocados.length + d.noColocados.length).toBe(total(items));
    }
  });

  it('consolida 200 bultos en menos de 5 s (RNF-04)', () => {
    const items = [
      item('caja chica', 80, 400, 300, 250, 8),
      item('caja grande', 60, 800, 600, 500, 25),
      item('tambor', 30, 585, 585, 880, 180),
      item('bolsa', 30, 900, 500, 200, 25),
    ];
    const inicio = performance.now();
    const d = acomodar(items, CONTENEDOR_20);
    expect(performance.now() - inicio).toBeLessThan(5000);
    expect(validar(d, items, CONTENEDOR_20)).toEqual([]);
  });
});
