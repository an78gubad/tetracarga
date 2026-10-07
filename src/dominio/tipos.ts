// Tipos del dominio. Sin lógica: los usan el acomodador, el validador y la vista.
//
// Unidades: longitudes en milímetros enteros (RF-07), pesos en kilos.
// Ejes del contenedor, con origen en la esquina del fondo, abajo, a la izquierda:
//   x = largo (del fondo hacia la puerta), y = ancho, z = alto (vertical).

/** Milímetros, siempre enteros. */
export type Mm = number;

/** Kilos. */
export type Kg = number;

/** Un tipo de bulto con todos sus datos: lo único que se puede consolidar. */
export interface Item {
  id: string;
  nombre: string;
  cantidad: number;
  largo: Mm;
  ancho: Mm;
  alto: Mm;
  peso: Kg;
}

/**
 * Lo que sale de interpretar la descripción. Un campo que la descripción no
 * declara queda en null: no se completa ni se inventa, y bloquea la consolidación.
 */
export interface ItemInterpretado {
  nombre: string;
  cantidad: number | null;
  largo: Mm | null;
  ancho: Mm | null;
  alto: Mm | null;
  peso: Kg | null;
}

/** Medidas internas y carga máxima, tal como figuran en el catálogo. */
export interface Contenedor {
  id: string;
  nombre: string;
  largo: Mm;
  ancho: Mm;
  alto: Mm;
  cargaMaxima: Kg;
  fuente: string;
}

/**
 * Qué medida del ítem queda sobre cada eje (x, y, z): L = largo, A = ancho,
 * H = alto. 'LAH' es el bulto tal como se declaró; 'LHA' lo acuesta, con el
 * ancho hacia arriba.
 */
export type Orientacion = 'LAH' | 'LHA' | 'ALH' | 'AHL' | 'HLA' | 'HAL';

/** Un bulto puntual, identificado por su ítem y su número dentro de él. */
export interface Bulto {
  itemId: string;
  /** De 0 a cantidad - 1. */
  indice: number;
}

export interface BultoColocado extends Bulto {
  /** Esquina mínima del bulto (la más cercana al origen). */
  x: Mm;
  y: Mm;
  z: Mm;
  orientacion: Orientacion;
}

/**
 * Resultado del acomodador. El orden de `colocados` es la secuencia de carga:
 * el primero es el primer bulto que entra al contenedor.
 */
export interface Disposicion {
  contenedorId: string;
  colocados: BultoColocado[];
  noColocados: Bulto[];
}
