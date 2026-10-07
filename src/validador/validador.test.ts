import { describe, expect, it } from 'vitest';
import type { BultoColocado, Contenedor, Disposicion, Item } from '../dominio/tipos';
import { validar } from './validador';

// Disposiciones armadas a mano, sin pasar por el acomodador.

const contenedor: Contenedor = {
  id: 'prueba',
  nombre: 'contenedor de prueba',
  largo: 1000,
  ancho: 1000,
  alto: 1000,
  cargaMaxima: 100,
  fuente: 'test',
};

const caja: Item = { id: 'caja', nombre: 'caja', cantidad: 4, largo: 500, ancho: 400, alto: 300, peso: 10 };

function colocado(indice: number, x: number, y: number, z: number, orientacion: BultoColocado['orientacion'] = 'LAH'): BultoColocado {
  return { itemId: 'caja', indice, x, y, z, orientacion };
}

function disposicion(...colocados: BultoColocado[]): Disposicion {
  return { contenedorId: 'prueba', colocados, noColocados: [] };
}

function reglas(d: Disposicion, items: Item[] = [caja], c: Contenedor = contenedor) {
  return validar(d, items, c).map((v) => v.regla);
}

describe('validador (RF-08)', () => {
  it('acepta una disposición válida: piso, apilado completo y al lado', () => {
    const d = disposicion(colocado(0, 0, 0, 0), colocado(1, 0, 0, 300), colocado(2, 500, 0, 0));
    expect(validar(d, [caja], contenedor)).toEqual([]);
  });

  it('detecta dos bultos superpuestos', () => {
    expect(reglas(disposicion(colocado(0, 0, 0, 0), colocado(1, 499, 0, 0)))).toEqual(['superposicion']);
  });

  it('acepta dos bultos que solo se tocan', () => {
    expect(reglas(disposicion(colocado(0, 0, 0, 0), colocado(1, 500, 0, 0)))).toEqual([]);
  });

  it('detecta un bulto que sale del contenedor por cualquier lado', () => {
    expect(reglas(disposicion(colocado(0, 501, 0, 0)))).toEqual(['limites']);
    expect(reglas(disposicion(colocado(0, 0, 601, 0)))).toEqual(['limites']);
    expect(reglas(disposicion(colocado(0, -1, 0, 0)))).toEqual(['limites']);
  });

  it('usa la orientación para calcular las medidas', () => {
    // Tal como se declaró ocupa 500 en x; acostado ('HAL'), 300.
    expect(reglas(disposicion(colocado(0, 600, 0, 0, 'LAH')))).toEqual(['limites']);
    expect(reglas(disposicion(colocado(0, 600, 0, 0, 'HAL')))).toEqual([]);
  });

  it('detecta un bulto flotando', () => {
    expect(reglas(disposicion(colocado(0, 0, 0, 1)))).toEqual(['apoyo']);
  });

  it('exige el 80% de la base apoyada', () => {
    // Base de 500 x 400. Corrido 100 mm en x queda apoyado el 80%; corrido 101, menos.
    expect(reglas(disposicion(colocado(0, 0, 0, 0), colocado(1, 100, 0, 300)))).toEqual([]);
    expect(reglas(disposicion(colocado(0, 0, 0, 0), colocado(1, 101, 0, 300)))).toEqual(['apoyo']);
  });

  it('suma el apoyo de varios bultos', () => {
    const d = disposicion(colocado(0, 0, 0, 0), colocado(1, 500, 0, 0), colocado(2, 250, 0, 300));
    expect(reglas(d)).toEqual([]);
  });

  it('exige que el apoyo esté cargado antes en la secuencia', () => {
    expect(reglas(disposicion(colocado(1, 0, 0, 300), colocado(0, 0, 0, 0)))).toEqual(['apoyo']);
  });

  it('detecta que se supera la carga máxima', () => {
    const pesada: Item = { ...caja, peso: 60 };
    expect(reglas(disposicion(colocado(0, 0, 0, 0), colocado(1, 500, 0, 0)), [pesada])).toEqual(['peso']);
  });

  it('detecta referencias a bultos inexistentes o repetidos', () => {
    expect(reglas(disposicion(colocado(4, 0, 0, 0)))).toEqual(['referencia']);
    expect(reglas(disposicion(colocado(0, 0, 0, 0), colocado(0, 500, 0, 0)))).toEqual(['referencia']);
    expect(reglas(disposicion({ ...colocado(0, 0, 0, 0), itemId: 'otro' }))).toEqual(['referencia']);
  });

  it('rechaza posiciones que no son milímetros enteros', () => {
    expect(reglas(disposicion(colocado(0, 0.5, 0, 0)))).toEqual(['limites']);
  });
});
