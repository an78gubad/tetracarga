import { describe, expect, it } from 'vitest';
import { aItems } from './items';

describe('ítems interpretados a consolidables', () => {
  it('convierte los ítems completos, con un id por posición', () => {
    const resultado = aItems([
      { nombre: 'caja', cantidad: 40, largo: 600, ancho: 400, alto: 300, peso: 12 },
      { nombre: 'bolsa', cantidad: 10, largo: 900, ancho: 500, alto: 200, peso: 25 },
    ]);
    expect(resultado).toEqual({
      completa: true,
      items: [
        { id: 'item-0', nombre: 'caja', cantidad: 40, largo: 600, ancho: 400, alto: 300, peso: 12 },
        { id: 'item-1', nombre: 'bolsa', cantidad: 10, largo: 900, ancho: 500, alto: 200, peso: 25 },
      ],
    });
  });

  it('bloquea y dice qué falta, sin completar ningún valor', () => {
    const resultado = aItems([
      { nombre: 'caja', cantidad: 40, largo: 600, ancho: 400, alto: 300, peso: 12 },
      { nombre: 'tambor de 200 litros', cantidad: 15, largo: null, ancho: null, alto: null, peso: null },
    ]);
    expect(resultado).toEqual({
      completa: false,
      faltantes: [{ nombre: 'tambor de 200 litros', campos: ['largo', 'ancho', 'alto', 'peso'] }],
    });
  });
});
