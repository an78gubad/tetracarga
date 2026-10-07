import type { Contenedor, Disposicion, Item, Orientacion } from '../dominio/tipos';

// Validador de RF-08. No comparte código ni constantes con el acomodador: las
// medidas de cada bulto se recalculan acá a partir del ítem y su orientación.

export type Regla = 'referencia' | 'limites' | 'superposicion' | 'apoyo' | 'peso';

export interface Violacion {
  regla: Regla;
  detalle: string;
}

/** Fracción mínima de la base de un bulto elevado que tiene que estar apoyada: 4/5. */
const APOYO_NUMERADOR = 4;
const APOYO_DENOMINADOR = 5;

const ORIENTACIONES_VALIDAS = new Set(['LAH', 'LHA', 'ALH', 'AHL', 'HLA', 'HAL']);

interface Caja {
  nombre: string;
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

function medidaSegun(item: Item, letra: string): number {
  if (letra === 'L') return item.largo;
  if (letra === 'A') return item.ancho;
  return item.alto;
}

function solapan(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/**
 * Devuelve todas las violaciones de la disposición; vacía si es válida.
 * El apoyo se exige respecto de los bultos cargados antes en la secuencia, así
 * que también vale para cada prefijo que muestra el control deslizante.
 */
export function validar(
  disposicion: Disposicion,
  items: readonly Item[],
  contenedor: Contenedor,
): Violacion[] {
  const violaciones: Violacion[] = [];
  const porId = new Map(items.map((item) => [item.id, item]));
  const vistos = new Set<string>();
  const cajas: Caja[] = [];
  let pesoTotal = 0;

  for (const bulto of disposicion.colocados) {
    const nombre = `${bulto.itemId}#${bulto.indice}`;
    const item = porId.get(bulto.itemId);

    if (!item || !Number.isInteger(bulto.indice) || bulto.indice < 0 || bulto.indice >= item.cantidad) {
      violaciones.push({ regla: 'referencia', detalle: `${nombre} no corresponde a ningún bulto` });
      continue;
    }
    if (vistos.has(nombre)) {
      violaciones.push({ regla: 'referencia', detalle: `${nombre} está colocado dos veces` });
      continue;
    }
    vistos.add(nombre);

    if (!ORIENTACIONES_VALIDAS.has(bulto.orientacion)) {
      violaciones.push({ regla: 'referencia', detalle: `${nombre} tiene una orientación inválida` });
      continue;
    }
    if (![bulto.x, bulto.y, bulto.z].every(Number.isInteger)) {
      violaciones.push({ regla: 'limites', detalle: `${nombre} no está en milímetros enteros` });
      continue;
    }

    const orientacion: Orientacion = bulto.orientacion;
    const caja: Caja = {
      nombre,
      x0: bulto.x,
      y0: bulto.y,
      z0: bulto.z,
      x1: bulto.x + medidaSegun(item, orientacion[0]!),
      y1: bulto.y + medidaSegun(item, orientacion[1]!),
      z1: bulto.z + medidaSegun(item, orientacion[2]!),
    };

    if (
      caja.x0 < 0 || caja.y0 < 0 || caja.z0 < 0 ||
      caja.x1 > contenedor.largo || caja.y1 > contenedor.ancho || caja.z1 > contenedor.alto
    ) {
      violaciones.push({ regla: 'limites', detalle: `${nombre} sale del contenedor` });
    }

    let areaApoyada = 0;
    for (const otra of cajas) {
      const sx = solapan(caja.x0, caja.x1, otra.x0, otra.x1);
      const sy = solapan(caja.y0, caja.y1, otra.y0, otra.y1);
      const sz = solapan(caja.z0, caja.z1, otra.z0, otra.z1);
      if (sx > 0 && sy > 0 && sz > 0) {
        violaciones.push({ regla: 'superposicion', detalle: `${nombre} se superpone con ${otra.nombre}` });
      }
      if (otra.z1 === caja.z0) areaApoyada += sx * sy;
    }

    const base = (caja.x1 - caja.x0) * (caja.y1 - caja.y0);
    if (caja.z0 > 0 && areaApoyada * APOYO_DENOMINADOR < base * APOYO_NUMERADOR) {
      violaciones.push({
        regla: 'apoyo',
        detalle: `${nombre} tiene apoyado el ${Math.floor((100 * areaApoyada) / base)}% de su base`,
      });
    }

    cajas.push(caja);
    pesoTotal += item.peso;
  }

  if (pesoTotal > contenedor.cargaMaxima) {
    violaciones.push({
      regla: 'peso',
      detalle: `la carga pesa ${pesoTotal} kg y el contenedor admite ${contenedor.cargaMaxima} kg`,
    });
  }

  return violaciones;
}
