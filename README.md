# Tarea 2: Herramientas de IA para el desarrollo de interfaces de usuario

Repositorio con las dos implementaciones de la Tarea 2, generadas con asistencia de **Claude Code**
y construidas con **Angular 21 + Angular Material**. Ambas se publican automáticamente en
**GitHub Pages** mediante **GitHub Actions** en cada push a `main`.

| Aplicación | Ejercicio | URL publicada | Código |
|---|---|---|---|
| Biblioteca (aplicación de escritorio: Electron y PWA) | 1B | https://sergiocaballeroo.github.io/tarea2-ia-ui/biblioteca/ | `projects/biblioteca` |
| Clínica (aplicación web con agenda de citas) | 2B | https://sergiocaballeroo.github.io/tarea2-ia-ui/clinica/ | `projects/clinica` |

Portada con enlaces a ambas: https://sergiocaballeroo.github.io/tarea2-ia-ui/

## Tres formas de ver las aplicaciones

1. **Sin instalar nada:** abre https://sergiocaballeroo.github.io/tarea2-ia-ui/ en cualquier navegador.
   Desde ahí entras a la biblioteca y a la clínica; se publican automáticamente con GitHub Actions.
2. **Instalador de escritorio de la biblioteca (sin Node ni Git):** descarga el `.exe`, `.dmg` o
   `.AppImage` desde https://github.com/sergiocaballeroo/tarea2-ia-ui/releases y ábrelo.
3. **Desde el código fuente con Node.js:** sigue las secciones siguientes (`npm install` y `npm run start:...`).

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
npm run start:biblioteca   # luego abre http://localhost:4200

# Clínica (abre http://localhost:4300)
npm run start:clinica      # luego abre http://localhost:4300
```

## Compilar y previsualizar tal como queda en GitHub Pages

```bash
npm run build:pages   # compila ambas apps en _site/ con el prefijo /tarea2-ia-ui/
npm run preview       # sirve _site en http://localhost:8080/tarea2-ia-ui/
```

## Aplicación de escritorio nativa (Electron)

La biblioteca también se distribuye como aplicación de escritorio con Electron, en tres formas:

1. **Instalador listo para usar**, sin instalar Node: descarga el archivo de tu sistema desde
   https://github.com/sergiocaballeroo/tarea2-ia-ui/releases (Windows `.exe`, macOS `.dmg`,
   Linux `.AppImage`) y ábrelo. Como la app no tiene firma digital, Windows muestra el aviso de
   SmartScreen ("Más información" y "Ejecutar de todas formas"); en macOS, clic derecho y "Abrir".
2. **Desde el código**, en la carpeta del proyecto ya con `npm install`:

   ```bash
   npm run electron          # compila la biblioteca y la abre en una ventana de Electron
   npm run electron:dist     # genera el instalador de tu sistema operativo en la carpeta release/
   ```

3. **Como PWA instalable** desde el navegador (siguiente sección).

Los instaladores se generan en GitHub Actions (`.github/workflows/electron.yml`) para los tres
sistemas operativos cada vez que se publica una etiqueta `v*`.

## Instalar la biblioteca como PWA desde el navegador

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
electron/              Proceso principal de Electron (ventana nativa de la biblioteca)
evidencias/            Bitácora de prompts usados con Claude Code y capturas de pantalla
.github/workflows/     Pipeline de CI/CD hacia GitHub Pages
```

## Tecnologías

- Angular 21 (componentes standalone, signals, zoneless)
- Angular Material 21 (Material Design 3)
- Dexie 4 (IndexedDB)
- Angular Service Worker (PWA)
- Electron 44 + electron-builder (instaladores de escritorio)
- GitHub Actions + GitHub Pages
- Playwright (capturas automáticas para el reporte y pruebas funcionales)

## Capturas automáticas

```bash
npx playwright install chromium
npm run capturas       # genera evidencias/capturas/*.png a partir de _site
```

## Pruebas funcionales (Playwright)

Ochenta y dos pruebas de extremo a extremo recorren ambas aplicaciones en Chromium como lo haría una
persona: alta y edición de libros y socios, reglas de préstamo (límite, vencidos, socio inactivo,
sin ejemplares), devoluciones con multa, renovaciones, ajustes, respaldo JSON, exportación CSV,
agenda de citas (horarios, ocupados, duplicados, cancelación), panel de recepción, vista móvil, casos límite de fechas, entradas inválidas, dos pestañas compitiendo por el mismo recurso y el modo sin conexión de la PWA.
Cada prueba usa un contexto nuevo del navegador, así que parte de una base de datos vacía.

```bash
npm run build:pages    # las pruebas usan el build de _site
npm run pruebas        # imprime el resultado; deja evidencias/pruebas/resultado.md y capturas de las fallas
PRUEBA=B19 npm run pruebas   # corre solo las pruebas cuyo nombre coincida con la expresión
BASE=https://sergiocaballeroo.github.io/tarea2-ia-ui npm run pruebas   # contra el sitio publicado
```

## Documentación por aplicación

- [projects/biblioteca/README.md](projects/biblioteca/README.md)
- [projects/clinica/README.md](projects/clinica/README.md)
- [evidencias/bitacora-prompts.md](evidencias/bitacora-prompts.md)
