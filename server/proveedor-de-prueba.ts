import { FallaProveedor, type Mensaje, type ProveedorModelo } from './proveedor.js';

/**
 * Implementación de prueba de la interfaz del modelo (AC-16): devuelve, en orden,
 * las respuestas o fallas que se le pasan. Sin red y sin API key.
 */
export class ProveedorDePrueba implements ProveedorModelo {
  readonly pedidos: Mensaje[][] = [];

  constructor(private readonly guion: (string | FallaProveedor)[]) {}

  async completar(mensajes: readonly Mensaje[]): Promise<string> {
    this.pedidos.push([...mensajes]);
    const siguiente = this.guion[this.pedidos.length - 1];
    if (siguiente === undefined) throw new Error('el guion de la prueba se quedó sin respuestas');
    if (siguiente instanceof FallaProveedor) throw siguiente;
    return siguiente;
  }
}
