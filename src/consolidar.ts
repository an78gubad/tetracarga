import { acomodar } from './acomodador/acomodador';
import type { Contenedor, Disposicion, Item } from './dominio/tipos';
import { validar, type Violacion } from './validador/validador';

export type Consolidacion =
  | { valida: true; disposicion: Disposicion }
  | { valida: false; violaciones: Violacion[] };

/**
 * Único camino hacia la vista (RNF-03): acomoda y valida. Si el validador
 * encuentra algo, la disposición se descarta y solo vuelven las violaciones.
 */
export function consolidar(
  items: readonly Item[],
  contenedor: Contenedor,
  acomodador: typeof acomodar = acomodar,
): Consolidacion {
  const disposicion = acomodador(items, contenedor);
  const violaciones = validar(disposicion, items, contenedor);
  if (violaciones.length > 0) return { valida: false, violaciones };
  return { valida: true, disposicion };
}
