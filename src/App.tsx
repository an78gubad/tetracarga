import { useEffect, useMemo, useState } from 'react';
import { CONTENEDOR_20 } from './catalogo/contenedores';
import { consolidar } from './consolidar';
import { aItems, type Campo } from './dominio/items';
import type { ItemInterpretado } from './dominio/tipos';
import { pedirInterpretacion } from './interpretacion/cliente';
import { colorCss, colorDeTipo } from './vista/colores';
import { Vista3D } from './vista/Vista3D';

const EJEMPLO = '40 cajas de 60x40x30 de 12 kilos, 20 bolsas de 90x50x20 de 25 kg y 6 pallets de 120x100x110 de 400 kg';

const contenedor = CONTENEDOR_20;
const mm = (n: number) => n.toLocaleString('es-AR');

const NOMBRE_CAMPO: Record<Campo, string> = {
  cantidad: 'cantidad',
  largo: 'largo',
  ancho: 'ancho',
  alto: 'alto',
  peso: 'peso',
};

export function App() {
  const [texto, setTexto] = useState('');
  const [interpretados, setInterpretados] = useState<ItemInterpretado[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversion = useMemo(() => (interpretados ? aItems(interpretados) : null), [interpretados]);
  const items = conversion?.completa ? conversion.items : null;
  const consolidacion = useMemo(() => (items ? consolidar(items, contenedor) : null), [items]);
  const disposicion = consolidacion?.valida ? consolidacion.disposicion : null;

  const [visibles, setVisibles] = useState(0);
  useEffect(() => setVisibles(disposicion?.colocados.length ?? 0), [disposicion]);

  async function interpretar() {
    if (texto.trim() === '' || cargando) return;
    setCargando(true);
    setError(null);
    try {
      setInterpretados(await pedirInterpretacion(texto));
    } catch (e) {
      setInterpretados(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }

  const total = items?.reduce((n, i) => n + i.cantidad, 0) ?? 0;
  const faltantes = conversion && !conversion.completa ? conversion.faltantes : [];

  return (
    <div className="app">
      <header>
        <h1>Tetracarga</h1>
        <p>
          {contenedor.nombre}: {mm(contenedor.largo)} × {mm(contenedor.ancho)} × {mm(contenedor.alto)} mm internos,
          carga máxima {mm(contenedor.cargaMaxima)} kg.{' '}
          <span className="fuente" title={contenedor.fuente}>Fuente: Hapag-Lloyd</span>
        </p>
      </header>

      <main>
        <section className="panel">
          <label htmlFor="descripcion">Describí la carga</label>
          <textarea
            id="descripcion"
            rows={5}
            value={texto}
            placeholder={EJEMPLO}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) interpretar();
            }}
          />
          <div className="acciones">
            <button onClick={interpretar} disabled={cargando || texto.trim() === ''}>
              {cargando ? 'Interpretando…' : 'Ver la carga'}
            </button>
            <button className="secundario" onClick={() => setTexto(EJEMPLO)} disabled={cargando}>
              Usar un ejemplo
            </button>
          </div>

          {error && <p className="aviso error">{error}</p>}

          {interpretados && (
            <table>
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th>Cant.</th>
                  <th>Largo × ancho × alto (mm)</th>
                  <th>Peso (kg)</th>
                </tr>
              </thead>
              <tbody>
                {interpretados.map((item, i) => (
                  <tr key={i}>
                    <td>
                      {items && <span className="muestra" style={{ background: colorCss(colorDeTipo(i)) }} />}
                      {item.nombre}
                    </td>
                    <td>{dato(item.cantidad)}</td>
                    <td>
                      {dato(item.largo)} × {dato(item.ancho)} × {dato(item.alto)}
                    </td>
                    <td>{dato(item.peso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {faltantes.length > 0 && (
            <div className="aviso">
              <p>Faltan datos que la descripción no trae, así que no se puede consolidar:</p>
              <ul>
                {faltantes.map((f, i) => (
                  <li key={i}>
                    <strong>{f.nombre}</strong>: {f.campos.map((c) => NOMBRE_CAMPO[c]).join(', ')}
                  </li>
                ))}
              </ul>
              <p>Agregalos a la descripción y volvé a interpretar.</p>
            </div>
          )}

          {consolidacion && !consolidacion.valida && (
            <div className="aviso error">
              <p>El validador rechazó la disposición y no se muestra:</p>
              <ul>
                {consolidacion.violaciones.slice(0, 5).map((v, i) => (
                  <li key={i}>{v.detalle}</li>
                ))}
              </ul>
            </div>
          )}

          {disposicion && (
            <p className="resumen">
              {disposicion.colocados.length} de {total} bultos colocados.
              {disposicion.noColocados.length > 0 && ` ${disposicion.noColocados.length} quedaron afuera.`}
            </p>
          )}
        </section>

        <section className="escena">
          {disposicion && items ? (
            <>
              <Vista3D items={items} contenedor={contenedor} disposicion={disposicion} visibles={visibles} />
              <label className="deslizador">
                <span>
                  Secuencia de carga: {visibles} / {disposicion.colocados.length}
                </span>
                <input
                  type="range"
                  min={0}
                  max={disposicion.colocados.length}
                  value={visibles}
                  onChange={(e) => setVisibles(Number(e.target.value))}
                />
              </label>
            </>
          ) : (
            <div className="vacio">La carga consolidada aparece acá.</div>
          )}
        </section>
      </main>
    </div>
  );
}

function dato(valor: number | null) {
  return valor === null ? <span className="falta">falta</span> : mm(valor);
}
