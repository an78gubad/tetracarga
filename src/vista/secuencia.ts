import type { BultoColocado, Disposicion } from '../dominio/tipos';

/** Los bultos visibles con el control deslizante en k: los primeros k de la secuencia (AC-08). */
export function primeros(disposicion: Disposicion, k: number): BultoColocado[] {
  return disposicion.colocados.slice(0, Math.max(0, Math.min(k, disposicion.colocados.length)));
}

/**
 * Cuántos bultos de cada tipo se dibujan en k. Cada tipo es una malla
 * instanciada con sus bultos en orden de carga, así que alcanza con fijar cuántas
 * instancias dibuja.
 */
export function visiblesPorTipo(disposicion: Disposicion, k: number): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const bulto of primeros(disposicion, k)) {
    cuenta.set(bulto.itemId, (cuenta.get(bulto.itemId) ?? 0) + 1);
  }
  return cuenta;
}

/** Los bultos de un tipo, en el orden en que se cargan. */
export function bultosDeTipo(disposicion: Disposicion, itemId: string): BultoColocado[] {
  return disposicion.colocados.filter((b) => b.itemId === itemId);
}
