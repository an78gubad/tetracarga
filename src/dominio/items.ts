import type { Item, ItemInterpretado } from './tipos';

export type Campo = 'cantidad' | 'largo' | 'ancho' | 'alto' | 'peso';

const CAMPOS: readonly Campo[] = ['cantidad', 'largo', 'ancho', 'alto', 'peso'];

export interface Faltante {
  nombre: string;
  campos: Campo[];
}

export type Conversion =
  | { completa: true; items: Item[] }
  | { completa: false; faltantes: Faltante[] };

/**
 * Pasa lo interpretado a ítems consolidables. Si algún ítem tiene un campo sin
 * declarar, no se completa con nada: se informa y la consolidación queda bloqueada.
 */
export function aItems(interpretados: readonly ItemInterpretado[]): Conversion {
  const faltantes: Faltante[] = [];
  const items: Item[] = [];

  interpretados.forEach((i, indice) => {
    const campos = CAMPOS.filter((campo) => i[campo] === null);
    if (campos.length > 0) {
      faltantes.push({ nombre: i.nombre, campos });
      return;
    }
    items.push({
      id: `item-${indice}`,
      nombre: i.nombre,
      cantidad: i.cantidad!,
      largo: i.largo!,
      ancho: i.ancho!,
      alto: i.alto!,
      peso: i.peso!,
    });
  });

  return faltantes.length > 0 ? { completa: false, faltantes } : { completa: true, items };
}
