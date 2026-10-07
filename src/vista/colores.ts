import type { BultoColocado, Item, Orientacion } from '../dominio/tipos';

// Color por tipo de ítem (RF-10). Depende solo de la posición del ítem en la
// lista, así que el mismo conjunto conserva sus colores al reconsolidar (AC-09).

/** Colores elegidos para distinguirse entre sí (paleta de Sasha Trubetskoy). */
const PALETA = [
  0xe6194b, 0x3cb44b, 0x4363d8, 0xf58231, 0x911eb4,
  0x42d4f4, 0xf032e6, 0xbfef45, 0xffe119, 0x9a6324,
];

/** Pasada la paleta, tonos repartidos por el ángulo áureo. */
function colorGenerado(indice: number): number {
  const tono = (indice * 137.508) % 360;
  const s = 0.65;
  const l = 0.5;
  const f = (n: number) => {
    const k = (n + tono / 30) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  const canal = (v: number) => Math.round(v * 255);
  return (canal(f(0)) << 16) | (canal(f(8)) << 8) | canal(f(4));
}

export function colorDeTipo(indice: number): number {
  return PALETA[indice] ?? colorGenerado(indice);
}

export function colorCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function medidasOrientadas(item: Item, orientacion: Orientacion): [number, number, number] {
  const medida = { L: item.largo, A: item.ancho, H: item.alto };
  const [ex, ey, ez] = orientacion.split('') as ('L' | 'A' | 'H')[];
  return [medida[ex!], medida[ey!], medida[ez!]];
}

/**
 * Brillo de cada bulto dentro de su tipo: alterna como un tablero de ajedrez,
 * así dos bultos vecinos del mismo tipo, en una pila o en una fila, se distinguen.
 */
export function brilloDeBulto(bulto: BultoColocado, item: Item): number {
  const [dx, dy, dz] = medidasOrientadas(item, bulto.orientacion);
  const casilla = Math.floor(bulto.x / dx) + Math.floor(bulto.y / dy) + Math.floor(bulto.z / dz);
  return casilla % 2 === 0 ? 1 : 0.72;
}
