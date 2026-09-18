# Tarea 2: Herramientas de IA para el desarrollo de interfaces de usuario

Repositorio con las dos implementaciones de la Tarea 2, generadas con asistencia de **Claude Code**
y construidas con **Angular 21 + Angular Material**. Ambas se publican automáticamente en
**GitHub Pages** mediante **GitHub Actions** en cada push a `main`.

| Aplicación | Ejercicio | URL publicada | Código |
|---|---|---|---|
| Biblioteca (aplicación de escritorio, PWA instalable) | 1B | https://sergiocaballeroo.github.io/tarea2-ia-ui/biblioteca/ | `projects/biblioteca` |
| Clínica (aplicación web con agenda de citas) | 2B | https://sergiocaballeroo.github.io/tarea2-ia-ui/clinica/ | `projects/clinica` |

Portada con enlaces a ambas: https://sergiocaballeroo.github.io/tarea2-ia-ui/

## Requisitos para ejecutar en cualquier sistema operativo

Solo se necesita **Node.js 20.19 o superior** (probado con Node 22) y **npm**. Funciona igual en
Windows, macOS y Linux. Descarga: https://nodejs.org

Verifica la instalación:

```bash
node --version
npm --version
```

## Ejecución local (modo desarrollo)

```bash
git clone https://github.com/sergiocaballeroo/tarea2-ia-ui.git
cd tarea2-ia-ui
npm install

# Biblioteca (abre http://localhost:4200)
npm run start:biblioteca

# Clínica (abre http://localhost:4300)
npm run start:clinica
```

## Compilar y previsualizar tal como queda en GitHub Pages

```bash
npm run build:pages   # compila ambas apps en _site/ con el prefijo /tarea2-ia-ui/
npm run preview       # sirve _site en http://localhost:8080/tarea2-ia-ui/
```

## Instalar la biblioteca como aplicación de escritorio

1. Abre https://sergiocaballeroo.github.io/tarea2-ia-ui/biblioteca/ en Chrome o Edge.
2. Haz clic en el botón **Instalar aplicación** del menú lateral, o en el icono de instalación
   de la barra de direcciones.
3. La app se agrega al menú Inicio (Windows), Launchpad (macOS) o al lanzador (Linux) y se abre en
   su propia ventana, sin barra de direcciones. Funciona sin conexión gracias al service worker.

Los datos se guardan en IndexedDB del navegador. Desde **Ajustes** se pueden cargar datos de
demostración, exportar e importar respaldos en JSON.

## Estructura del repositorio

```
projects/biblioteca/   Aplicación de escritorio (PWA) de gestión de préstamos
projects/clinica/      Sitio web del consultorio con agenda de citas y panel de recepción
scripts/               Ensamblado de _site, servidor local de vista previa y capturas automáticas
evidencias/            Bitácora de prompts usados con Claude Code y capturas de pantalla
.github/workflows/     Pipeline de CI/CD hacia GitHub Pages
```

## Tecnologías

- Angular 21 (componentes standalone, signals, zoneless)
- Angular Material 21 (Material Design 3)
- Dexie 4 (IndexedDB)
- Angular Service Worker (PWA)
- GitHub Actions + GitHub Pages
- Playwright (capturas automáticas para el reporte)

## Capturas automáticas

```bash
npx playwright install chromium
npm run capturas       # genera evidencias/capturas/*.png a partir de _site
```

## Documentación por aplicación

- [projects/biblioteca/README.md](projects/biblioteca/README.md)
- [projects/clinica/README.md](projects/clinica/README.md)
- [evidencias/bitacora-prompts.md](evidencias/bitacora-prompts.md)
