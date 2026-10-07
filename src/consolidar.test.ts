import { describe, expect, it } from 'vitest';
import { CONTENEDOR_20 } from './catalogo/contenedores';
import { consolidar } from './consolidar';
import type { Item } from './dominio/tipos';

const cajas: Item[] = [{ id: 'caja', nombre: 'caja', cantidad: 2, largo: 600, ancho: 400, alto: 300, peso: 12 }];

describe('consolidar (RNF-03)', () => {
  it('devuelve la disposición cuando pasa el validador', () => {
    const resultado = consolidar(cajas, CONTENEDOR_20);
    expect(resultado.valida).toBe(true);
  });

  it('descarta la disposición cuando el validador la rechaza', () => {
    const flotante = () => ({
      contenedorId: CONTENEDOR_20.id,
      colocados: [{ itemId: 'caja', indice: 0, x: 0, y: 0, z: 10, orientacion: 'LAH' as const }],
      noColocados: [],
    });
    const resultado = consolidar(cajas, CONTENEDOR_20, flotante);
    expect(resultado).toEqual({ valida: false, violaciones: [expect.objectContaining({ regla: 'apoyo' })] });
    expect(resultado).not.toHaveProperty('disposicion');
  });
});
