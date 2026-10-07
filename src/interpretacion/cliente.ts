import type { ItemInterpretado } from '../dominio/tipos';

/** Pide la interpretación al proxy propio; el navegador nunca habla con el modelo. */
export async function pedirInterpretacion(texto: string): Promise<ItemInterpretado[]> {
  let respuesta: Response;
  try {
    respuesta = await fetch('/api/interpretar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
    });
  } catch {
    throw new Error('No se pudo contactar al servidor.');
  }
  const datos = (await respuesta.json().catch(() => null)) as { items?: ItemInterpretado[]; mensaje?: string } | null;
  if (!respuesta.ok || !datos?.items) {
    throw new Error(datos?.mensaje ?? `El servidor respondió ${respuesta.status}.`);
  }
  return datos.items;
}
