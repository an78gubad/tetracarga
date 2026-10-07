import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// AC-19, sobre el código que termina en el navegador: todo lo que está en src/
// salvo los tests. Lo que habla con el proveedor vive en server/ y api/.

function archivosDelCliente(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) return archivosDelCliente(ruta);
    return /\.tsx?$/.test(entrada.name) && !/\.test\.tsx?$/.test(entrada.name) ? [ruta] : [];
  });
}

describe('el cliente no habla con el proveedor (RNF-07)', () => {
  const archivos = archivosDelCliente(join(import.meta.dirname, '.'));

  it('encuentra el código del cliente', () => {
    expect(archivos.length).toBeGreaterThan(5);
  });

  it.each([/api\.deepseek\.com/i, /authorization/i, /bearer/i, /api[_-]?key/i, /VITE_/, /server\//])(
    'ningún archivo del cliente contiene %s',
    (patron) => {
      const conPatron = archivos.filter((archivo) => patron.test(readFileSync(archivo, 'utf8')));
      expect(conPatron).toEqual([]);
    },
  );
});
