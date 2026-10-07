// Interfaz propia de acceso al modelo (RNF-08). Cambiar de proveedor es escribir
// otra implementación de ProveedorModelo; el resto del sistema no se entera.

export interface Mensaje {
  rol: 'sistema' | 'usuario';
  contenido: string;
}

export interface ProveedorModelo {
  /** Devuelve el texto de la respuesta; vacío si el proveedor no devolvió nada. */
  completar(mensajes: readonly Mensaje[]): Promise<string>;
}

/** El proveedor falló: no se llegó a interpretar nada. */
export class FallaProveedor extends Error {
  constructor(
    mensaje: string,
    /** Si vale la pena reintentar: red, tiempo agotado, 5xx. No: autenticación o cuota. */
    readonly transitoria: boolean,
  ) {
    super(mensaje);
    this.name = 'FallaProveedor';
  }
}

/** El proveedor respondió, pero la respuesta no es una lista de ítems válida. */
export class ErrorInterpretacion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorInterpretacion';
  }
}
