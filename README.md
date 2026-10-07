# Tetracarga

Describís una carga en castellano y la ves consolidada dentro de un contenedor, en 3D.

Proyecto del **AI-First Builders Lab 2026** (MUG).

## Estado

Feature central andando: descripción en castellano → lista de ítems → disposición validada en 3D,
sobre un contenedor 20' fijo. El alcance completo está en [`PRD.md`](PRD.md).

## Cómo funciona

1. Describís la carga en lenguaje natural: *"40 cajas de 60x40x30 de 12 kilos y 15 tambores de 200 litros"*.
2. El sistema arma la lista de ítems y completa lo que falta, marcando cada dato estimado.
3. Corregís lo que quieras y elegís el contenedor.
4. Un algoritmo determinístico calcula la disposición, un validador la verifica y la ves en 3D.

## Stack

TypeScript sobre Node 22, React con Vite, Three.js, Vitest. Acomodador y validador propios.
DeepSeek detrás de una función serverless de Vercel.

## Desarrollo

```sh
npm install
cp .env.example .env   # y completar DEEPSEEK_API_KEY
npm run dev            # la app y /api/interpretar en http://localhost:5173
npm test               # sin red ni API key
```

En Vercel, `DEEPSEEK_API_KEY` se configura como variable de entorno del proyecto.
