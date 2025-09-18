# Simulador NFL por Drive

Aplicacion web en React que estima el marcador de un partido NFL a partir de la eficiencia ofensiva y defensiva por drive de cada franquicia. Permite configurar reglas de tiempo extra, controlar el numero de posesiones y repetir resultados con una semilla fija.

## Requisitos
- Node.js 18 o superior
- npm 9 o superior (incluido con Node)

## Instalacion
1. Clona este repositorio en tu equipo.
2. Ejecuta `npm install` para descargar dependencias.

## Scripts disponibles
- `npm run dev`: levanta el entorno de desarrollo con recarga en caliente en `http://localhost:5173`.
- `npm run build`: genera la version de produccion en la carpeta `dist/` usando TypeScript y Vite.
- `npm run preview`: sirve el resultado de `dist/` para validarlo localmente.
- `npm run lint`: ejecuta la comprobacion de tipos de TypeScript.

## Estructura principal
- `src/App.tsx`: punto de entrada de la interfaz.
- `src/components/NFLSimulator.tsx`: componente principal con formularios, simulacion y resumen de resultados.
- `src/components/simulation.ts`: logica de simulacion por drive.
- `src/components/NFLSimulator.module.css`: estilos modulares para el layout.

## Build de produccion
```bash
npm run build
```
El comando genera artefactos listos para desplegar en cualquier hosting estatico.

## Publicacion en GitHub
1. Inicializa git (si aun no lo hiciste):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Crea un repositorio vacio en GitHub y agrega el remoto:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git push -u origin main
   ```

Lista para compartir y seguir iterando.
