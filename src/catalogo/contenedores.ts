import type { Contenedor } from '../dominio/tipos';

// Catálogo de contenedores. Toda entrada lleva su fuente; ninguna medida se estima.
// La carga máxima es la carga útil (max payload), no el peso bruto.

export const CONTENEDOR_20: Contenedor = {
  id: '20-standard',
  nombre: "20' standard",
  largo: 5900,
  ancho: 2352,
  alto: 2395,
  cargaMaxima: 28130,
  fuente:
    "Hapag-Lloyd, 20' Standard (22GP): https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/20-standard.html, consultado el 2026-10-07",
};

export const CONTENEDORES: readonly Contenedor[] = [CONTENEDOR_20];
