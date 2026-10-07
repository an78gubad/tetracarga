import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Contenedor, Disposicion, Item } from '../dominio/tipos';
import { brilloDeBulto, colorDeTipo, medidasOrientadas } from './colores';
import { bultosDeTipo, visiblesPorTipo } from './secuencia';

// Vista 3D (RF-10). Una malla instanciada por tipo de ítem: el costo de dibujo
// crece con los tipos, no con los bultos (RNF-06).
//
// El dominio usa z hacia arriba y Three.js usa y. Se pasa en metros:
//   three.x = x, three.y = z, three.z = -y   (conserva la orientación de los ejes).

const MM = 0.001;
/** Separación visible entre bultos vecinos, en mm. */
const JUNTA = 12;

interface Props {
  items: readonly Item[];
  contenedor: Contenedor;
  disposicion: Disposicion;
  /** Cuántos bultos de la secuencia se ven. */
  visibles: number;
}

interface Escena {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  grupo: THREE.Group;
  mallas: Map<string, THREE.InstancedMesh>;
}

const cubo = new THREE.BoxGeometry(1, 1, 1);

export function Vista3D({ items, contenedor, disposicion, visibles }: Props) {
  const lienzo = useRef<HTMLDivElement>(null);
  const escena = useRef<Escena | null>(null);

  // Renderer, cámara y controles: una sola vez.
  useEffect(() => {
    const div = lienzo.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    div.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x15171c);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6);
    sol.position.set(4, 10, 6);
    scene.add(sol);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const grupo = new THREE.Group();
    scene.add(grupo);
    escena.current = { scene, camera, controls, grupo, mallas: new Map() };

    const ajustar = () => {
      const { clientWidth: ancho, clientHeight: alto } = div;
      renderer.setSize(ancho, alto);
      camera.aspect = ancho / Math.max(alto, 1);
      camera.updateProjectionMatrix();
    };
    const observador = new ResizeObserver(ajustar);
    observador.observe(div);
    ajustar();

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      observador.disconnect();
      controls.dispose();
      renderer.dispose();
      div.removeChild(renderer.domElement);
      escena.current = null;
    };
  }, []);

  // Contenedor y bultos: cada vez que cambia la disposición.
  useEffect(() => {
    const e = escena.current;
    if (!e) return;
    vaciar(e.grupo);
    e.mallas.clear();

    const largo = contenedor.largo * MM;
    const ancho = contenedor.ancho * MM;
    const alto = contenedor.alto * MM;

    const piso = new THREE.Mesh(
      new THREE.PlaneGeometry(largo, ancho),
      new THREE.MeshLambertMaterial({ color: 0x3a3f4a }),
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(largo / 2, -0.002, -ancho / 2);
    e.grupo.add(piso);

    const paredes = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(largo, alto, ancho)),
      new THREE.LineBasicMaterial({ color: 0xc8ccd4 }),
    );
    paredes.position.set(largo / 2, alto / 2, -ancho / 2);
    e.grupo.add(paredes);

    const matriz = new THREE.Matrix4();
    const posicion = new THREE.Vector3();
    const escala = new THREE.Vector3();
    const rotacion = new THREE.Quaternion();
    const brillo = new THREE.Color();

    items.forEach((item, indiceTipo) => {
      const bultos = bultosDeTipo(disposicion, item.id);
      if (bultos.length === 0) return;
      const malla = new THREE.InstancedMesh(
        cubo,
        new THREE.MeshLambertMaterial({ color: colorDeTipo(indiceTipo) }),
        bultos.length,
      );
      bultos.forEach((bulto, i) => {
        const [dx, dy, dz] = medidasOrientadas(item, bulto.orientacion);
        posicion.set((bulto.x + dx / 2) * MM, (bulto.z + dz / 2) * MM, -(bulto.y + dy / 2) * MM);
        escala.set((dx - JUNTA) * MM, (dz - JUNTA) * MM, (dy - JUNTA) * MM);
        malla.setMatrixAt(i, matriz.compose(posicion, rotacion, escala));
        const b = brilloDeBulto(bulto, item);
        malla.setColorAt(i, brillo.setRGB(b, b, b));
      });
      e.mallas.set(item.id, malla);
      e.grupo.add(malla);
    });

    e.controls.target.set(largo / 2, alto / 3, -ancho / 2);
    e.camera.position.set(largo * 1.35, alto * 2.1, ancho * 1.9);
    e.controls.update();
  }, [items, contenedor, disposicion]);

  // Control deslizante: solo cambia cuántas instancias dibuja cada malla.
  useEffect(() => {
    const e = escena.current;
    if (!e) return;
    const cuenta = visiblesPorTipo(disposicion, visibles);
    for (const [id, malla] of e.mallas) malla.count = cuenta.get(id) ?? 0;
  }, [disposicion, visibles]);

  return <div ref={lienzo} className="vista3d" />;
}

function vaciar(grupo: THREE.Group) {
  for (const hijo of [...grupo.children]) {
    grupo.remove(hijo);
    if (hijo instanceof THREE.Mesh || hijo instanceof THREE.LineSegments) {
      if (hijo.geometry !== cubo) hijo.geometry.dispose();
      (hijo.material as THREE.Material).dispose();
    }
    if (hijo instanceof THREE.InstancedMesh) hijo.dispose();
  }
}
