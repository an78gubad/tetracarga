import type { Bulto, BultoColocado, Contenedor, Disposicion, Item, Orientacion } from '../dominio/tipos';

// Acomodador determinístico (RF-07). Heurística de puntos extremos: arma paredes
// desde el fondo del contenedor, llenando primero el piso a lo ancho y después
// hacia arriba. No optimiza: misma entrada, misma disposición, bulto por bulto.
// No comparte código con el validador.

/** Primero las dos orientaciones con el alto declarado hacia arriba. */
const ORIENTACIONES: readonly Orientacion[] = ['LAH', 'ALH', 'LHA', 'HLA', 'AHL', 'HAL'];

interface Punto {
  x: number;
  y: number;
  z: number;
}

interface Hueco {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

interface Giro {
  orientacion: Orientacion;
  dx: number;
  dy: number;
  dz: number;
}

function giros(item: Item): Giro[] {
  const medida = { L: item.largo, A: item.ancho, H: item.alto } as const;
  const vistos = new Set<string>();
  const resultado: Giro[] = [];
  for (const orientacion of ORIENTACIONES) {
    const [ex, ey, ez] = orientacion.split('') as ('L' | 'A' | 'H')[];
    const giro = { orientacion, dx: medida[ex!], dy: medida[ey!], dz: medida[ez!] };
    const clave = `${giro.dx}x${giro.dy}x${giro.dz}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    resultado.push(giro);
  }
  return resultado;
}

/** Del fondo hacia la puerta, de abajo hacia arriba, de izquierda a derecha. */
function compararPuntos(a: Punto, b: Punto): number {
  return a.x - b.x || a.z - b.z || a.y - b.y;
}

/** Los bultos más grandes primero; a igual volumen, por id. */
function compararItems(a: Item, b: Item): number {
  const volumen = b.largo * b.ancho * b.alto - a.largo * a.ancho * a.alto;
  if (volumen !== 0) return volumen;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function entra(p: Punto, g: Giro, contenedor: Contenedor, ocupados: readonly Hueco[]): boolean {
  const x1 = p.x + g.dx;
  const y1 = p.y + g.dy;
  const z1 = p.z + g.dz;
  if (x1 > contenedor.largo || y1 > contenedor.ancho || z1 > contenedor.alto) return false;

  let apoyo = 0;
  for (const o of ocupados) {
    const ax = Math.min(x1, o.x1) - Math.max(p.x, o.x0);
    const ay = Math.min(y1, o.y1) - Math.max(p.y, o.y0);
    if (ax <= 0 || ay <= 0) continue;
    if (Math.min(z1, o.z1) - Math.max(p.z, o.z0) > 0) return false;
    if (o.z1 === p.z) apoyo += ax * ay;
  }
  // Un bulto elevado necesita apoyada al menos el 80% de su base.
  return p.z === 0 || apoyo * 10 >= g.dx * g.dy * 8;
}

export function acomodar(items: readonly Item[], contenedor: Contenedor): Disposicion {
  const colocados: BultoColocado[] = [];
  const noColocados: Bulto[] = [];
  const ocupados: Hueco[] = [];
  let puntos: Punto[] = [{ x: 0, y: 0, z: 0 }];
  let peso = 0;

  for (const item of [...items].sort(compararItems)) {
    const opciones = giros(item);
    // Si un bulto no encontró lugar, los siguientes del mismo ítem tampoco: nada cambió.
    let sinLugar = false;

    for (let indice = 0; indice < item.cantidad; indice++) {
      if (sinLugar || peso + item.peso > contenedor.cargaMaxima) {
        noColocados.push({ itemId: item.id, indice });
        continue;
      }

      let elegido: { punto: Punto; giro: Giro } | undefined;
      for (const punto of puntos) {
        const giro = opciones.find((g) => entra(punto, g, contenedor, ocupados));
        if (giro) {
          elegido = { punto, giro };
          break;
        }
      }

      if (!elegido) {
        sinLugar = true;
        noColocados.push({ itemId: item.id, indice });
        continue;
      }

      const { punto: p, giro: g } = elegido;
      const hueco: Hueco = { x0: p.x, y0: p.y, z0: p.z, x1: p.x + g.dx, y1: p.y + g.dy, z1: p.z + g.dz };
      ocupados.push(hueco);
      colocados.push({ itemId: item.id, indice, x: p.x, y: p.y, z: p.z, orientacion: g.orientacion });
      peso += item.peso;

      const nuevos: Punto[] = [
        { x: hueco.x1, y: p.y, z: p.z },
        { x: p.x, y: hueco.y1, z: p.z },
        { x: p.x, y: p.y, z: hueco.z1 },
      ].filter((n) => n.x < contenedor.largo && n.y < contenedor.ancho && n.z < contenedor.alto);

      const dentroDelHueco = (q: Punto) =>
        q.x >= hueco.x0 && q.x < hueco.x1 && q.y >= hueco.y0 && q.y < hueco.y1 && q.z >= hueco.z0 && q.z < hueco.z1;
      const claves = new Set<string>();
      puntos = [...puntos, ...nuevos]
        .filter((q) => !dentroDelHueco(q))
        .filter((q) => {
          const clave = `${q.x},${q.y},${q.z}`;
          if (claves.has(clave)) return false;
          claves.add(clave);
          return true;
        })
        .sort(compararPuntos);
    }
  }

  return { contenedorId: contenedor.id, colocados, noColocados };
}
