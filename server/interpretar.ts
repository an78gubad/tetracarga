import type { ItemInterpretado } from '../src/dominio/tipos.js';
import { ErrorInterpretacion, FallaProveedor, type Mensaje, type ProveedorModelo } from './proveedor.js';

// Interpretación de la descripción (RF-02). El modelo solo extrae lo que la
// descripción declara: lo que no está escrito vuelve en null y no se completa.

export const INTENTOS = 3;

const INSTRUCCIONES = `Extraés los bultos de una descripción de carga escrita en castellano y respondés únicamente con JSON.

Formato de la respuesta:
{"items": [{"nombre": string, "cantidad": entero o null, "largo_mm": número o null, "ancho_mm": número o null, "alto_mm": número o null, "peso_kg": número o null}]}

Reglas:
- Un elemento por cada tipo de bulto, en el orden en que aparecen. La descripción puede venir de corrido, con varios tipos en la misma frase.
- "nombre": el tipo de bulto en singular, con el detalle que lo identifica (por ejemplo "tambor de 200 litros").
- Solo datos escritos en la descripción. Si un dato no está escrito, va null. No lo deduzcas de tu conocimiento: ni medidas típicas, ni medidas a partir de una capacidad en litros, ni pesos estimados.
- Medidas en milímetros. Si no traen unidad, son centímetros. "AxBxC" se lee como largo x ancho x alto.
- "peso_kg" es el peso de un solo bulto. Si la descripción da el peso total de ese tipo, dividilo por la cantidad. Toneladas a kilos.
- "cantidad": el número de bultos de ese tipo. "una caja" es 1; si no hay número, null.`;

function mensajes(texto: string): Mensaje[] {
  return [
    { rol: 'sistema', contenido: INSTRUCCIONES },
    { rol: 'usuario', contenido: texto },
  ];
}

/**
 * Pide la interpretación, reintentando hasta INTENTOS veces solo las fallas
 * transitorias y las respuestas vacías. Autenticación o cuota fallan de una.
 */
export async function interpretar(
  texto: string,
  proveedor: ProveedorModelo,
  intentos: number = INTENTOS,
): Promise<ItemInterpretado[]> {
  let ultimaFalla = new FallaProveedor('el proveedor no respondió', true);

  for (let intento = 1; intento <= intentos; intento++) {
    let respuesta: string;
    try {
      respuesta = await proveedor.completar(mensajes(texto));
    } catch (error) {
      if (error instanceof FallaProveedor && error.transitoria) {
        ultimaFalla = error;
        continue;
      }
      throw error;
    }
    if (respuesta.trim() === '') {
      ultimaFalla = new FallaProveedor('el proveedor devolvió una respuesta vacía', true);
      continue;
    }
    return leerRespuesta(respuesta);
  }

  throw ultimaFalla;
}

function medida(valor: unknown, campo: string): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    throw new ErrorInterpretacion(`"${campo}" no es una medida válida`);
  }
  return valor;
}

/** Valida la forma de la respuesta. Las longitudes quedan en milímetros enteros (RF-07). */
export function leerRespuesta(respuesta: string): ItemInterpretado[] {
  let datos: unknown;
  try {
    datos = JSON.parse(respuesta);
  } catch {
    throw new ErrorInterpretacion('la respuesta del modelo no es JSON');
  }

  const lista = (datos as { items?: unknown })?.items;
  if (!Array.isArray(lista)) throw new ErrorInterpretacion('la respuesta no trae una lista de ítems');
  if (lista.length === 0) throw new ErrorInterpretacion('no se encontró ningún bulto en la descripción');

  return lista.map((crudo: Record<string, unknown>) => {
    if (typeof crudo?.nombre !== 'string' || crudo.nombre.trim() === '') {
      throw new ErrorInterpretacion('hay un ítem sin nombre');
    }
    const cantidad = medida(crudo.cantidad, 'cantidad');
    if (cantidad !== null && !Number.isInteger(cantidad)) {
      throw new ErrorInterpretacion(`la cantidad de "${crudo.nombre}" no es un número entero`);
    }
    const longitud = (campo: string) => {
      const valor = medida(crudo[campo], campo);
      return valor === null ? null : Math.round(valor);
    };
    return {
      nombre: crudo.nombre.trim(),
      cantidad,
      largo: longitud('largo_mm'),
      ancho: longitud('ancho_mm'),
      alto: longitud('alto_mm'),
      peso: medida(crudo.peso_kg, 'peso_kg'),
    };
  });
}
