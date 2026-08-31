# Nexobook

Nexobook es un organizador académico local para carreras, tecnicaturas, bootcamps, cursos y recorridos autodidactas. Permite administrar materias, PDFs, resúmenes visuales, evaluaciones, calendarios y progreso sin cuentas ni una base de datos externa.

> Estado actual: **1.0.0 Alpha 1**. Esta versión está destinada a pruebas y todavía puede cambiar antes de la publicación estable.

## Privacidad y almacenamiento

Nexobook funciona en tu computadora. La aplicación de escritorio guarda la información en:

```text
Documentos/Nexobook/
├── storage/   # espacios, materias, PDFs y resúmenes
└── backups/   # copias automáticas recuperables
```

Estas carpetas nunca se incluyen en Git ni dentro del instalador. Una actualización de la aplicación no reemplaza los datos personales.

## Ejecutar la aplicación de escritorio

Requiere Node.js 20 o posterior durante el desarrollo:

```bash
npm install
npm run desktop
```

Electron inicia internamente el almacenamiento local y abre Nexobook como una aplicación independiente del navegador.

## Generar Nexobook para macOS

```bash
npm run desktop:mac -- --arm64
```

Los instaladores se generan dentro de `release/`:

```text
Nexobook-1.0.0-alpha.1-arm64.dmg
Nexobook-1.0.0-alpha.1-mac-arm64.zip
```

La Alpha no está firmada ni notarizada por Apple. Para distribución pública será necesario configurar un certificado Apple Developer y notarización.

## Generar Nexobook para Windows

```bash
npm run desktop:win
```

El instalador NSIS se genera dentro de `release/`. También puede generarse automáticamente desde GitHub Actions sin disponer de una computadora Windows local.

## GitHub Actions

Cada cambio enviado a `main` ejecuta las pruebas y genera artefactos descargables para:

- Windows x64 (`.exe`).
- macOS Apple Silicon (`.dmg` y `.zip`).

Cuando se publica un tag `v*`, por ejemplo `v1.0.0-beta.1`, GitHub crea automáticamente una Release y adjunta los instaladores. Las versiones cuyo tag contiene `-alpha`, `-beta` o `-rc` se publican como preliminares.

## Desarrollo web

```bash
npm run app
```

- Interfaz: `http://localhost:5173`
- API local: `http://localhost:3001`

## Verificaciones

```bash
npm run test:all
```

Este comando prueba el almacenamiento atómico, la seguridad de rutas, papelera, restauración, backups, espacios, planes académicos y la compilación del frontend.

## Comandos principales

- `npm run desktop`: abre Nexobook mediante Electron.
- `npm run desktop:mac`: genera DMG y ZIP para macOS.
- `npm run app`: abre el entorno web de desarrollo.
- `npm run build`: compila la interfaz de producción.
- `npm run test:all`: ejecuta todas las verificaciones.
- `npm run import`: escanea PDFs existentes desde el entorno de desarrollo.

## Versiones previstas

```text
1.0.0-alpha.1  Primera versión instalable para pruebas internas
1.0.0-beta.1   Funciones cerradas y pruebas ampliadas
1.0.0-rc.1     Candidata final
1.0.0          Primera versión estable
```

## Tecnologías

React, Vite, Electron, Express y almacenamiento local mediante archivos JSON seguros.
