# AGENTS.md — Tetracarga

## Propósito
Describís una carga en castellano —"40 cajas de 60x40x30 de 12 kilos y 15 tambores de 200 litros"— y la ves consolidada dentro de un contenedor, en 3D.
El modelo solo interpreta el texto; un algoritmo determinístico calcula la disposición y un validador bloqueante descarta lo imposible. El alcance vive en `PRD.md`.

## Stack
- TypeScript en todo el proyecto, sobre Node 22 LTS.
- React con Vite para la interfaz.
- Three.js para la vista 3D.
- Vitest para los tests.
- Acomodador y validador propios, sin librería de packing (ninguna modela gravedad ni apilabilidad).
- Una función serverless propia como único punto que habla con DeepSeek, detrás de la interfaz de RNF-08.

## Qué NO hacer
- **El modelo no ubica bultos.** Interpreta la descripción y nada más. La posición y la orientación de cada bulto las calcula el acomodador determinístico (RF-07).
- **No completar un dato que no salga del catálogo.** Medidas y peso ausentes se toman de la entrada del catálogo, marcados como estimado y mostrando qué entrada se usó. Lo que no está en el catálogo se le pregunta al usuario: no se inventa un valor para salir del paso (RF-03, AC-03).
- **No renderizar ni guardar una disposición que no pasó el validador.** Nada de mostrarla "con advertencia" (RF-08, RNF-03).
- **No meter la API key en el cliente.** Vive en `.env` sin prefijo `VITE_` y la lee únicamente el servidor. Cualquier variable con prefijo `VITE_` termina en el bundle del navegador, que es justo lo que RNF-07 prohíbe.
- **No hacer que los tests llamen al proveedor.** Corren sin red y sin API key (AC-16).
