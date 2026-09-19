# Bitácora de prompts y decisiones con Claude Code

Registro de cómo se usó Claude Code (herramienta de IA seleccionada) para generar ambas
implementaciones. Sesión de trabajo: 2026-09-16 y 2026-09-17, en Windows 11, desde la terminal
de Claude Code (modelo Claude Fable 5.1).

Las capturas de pantalla de la sesión y de las aplicaciones están en `evidencias/capturas/`.

## Fase 0. Planeación asistida

Prompt inicial (resumido): "Me ayudarías a planificar esta tarea" seguido del enunciado completo
de la Tarea 2.

Claude Code propuso un plan de trabajo, calendario y reparto, y después hizo preguntas de
orientación una por una. Decisiones tomadas en ese diálogo:

| Decisión | Opción elegida | Alternativas descartadas y motivo |
|---|---|---|
| Herramienta para implementar 1B y 2B | Claude Code | Cursor y GitHub Copilot requieren que el estudiante opere el editor; Claude Code ya estaba en uso y la evidencia es directa |
| Segunda herramienta de escritorio | GitHub Copilot | Cursor, Uizard, Windsurf |
| Segunda herramienta web | Claude Design (Anthropic), elegida el 2026-09-18 en sustitución de v0 | v0 de Vercel, Lovable, Bolt.new, Figma Make |
| Stack de escritorio | Angular 21 + Angular Material como PWA instalable | Python/Tkinter (sin dependencias pero menos vistoso), Electron (más pesado, un instalador por SO), Tauri (requiere Rust), Capacitor (orientado a móvil) |
| Persistencia | IndexedDB con Dexie | localStorage (límite aprox. 5 MB, sin índices), SQLite nativo (compilación nativa) |
| Publicación | Un repositorio, GitHub Actions y GitHub Pages con ambas apps | Dos repositorios separados |
| Formato del reporte | Word y PDF generados con python-docx | Solo Markdown |

Restricción detectada por la herramienta: Node 22.14 instalado no cumple el mínimo de Angular 22,
por lo que se fijó Angular CLI 21 en lugar de actualizar Node.

## Fase 1. Aplicación de escritorio: biblioteca

Prompt efectivo (síntesis de las respuestas dadas en el diálogo):

> Crea una aplicación Angular 21 con Angular Material llamada biblioteca, como PWA instalable,
> para gestionar préstamos de libros. Alcance ampliado: catálogo de libros con búsqueda y filtros,
> socios con activar/desactivar, préstamos con devolución y renovación, lista de vencidos, multas
> por día de retraso, límite de préstamos por socio y exportación a CSV. Guarda los datos en
> IndexedDB con Dexie. Usa hash routing para que funcione en GitHub Pages.

Archivos generados por Claude Code (todos en `projects/biblioteca/src/app/`):

- `core/models.ts`, `core/db.ts`, `core/biblioteca.service.ts`, `core/notificaciones.service.ts`,
  `core/confirmar.dialog.ts`
- `features/dashboard/dashboard.ts`
- `features/libros/libros.ts`, `features/libros/libro.dialog.ts`
- `features/socios/socios.ts`, `features/socios/socio.dialog.ts`
- `features/prestamos/prestamos.ts`, `features/prestamos/prestamo.dialog.ts`,
  `features/prestamos/estado-prestamo.pipe.ts`
- `features/vencidos/vencidos.ts`, `features/ajustes/ajustes.ts`
- `app.ts`, `app.config.ts`, `app.routes.ts`, `styles.scss`, `index.html`,
  `manifest.webmanifest`, `ngsw-config.json`

Resultado de la primera compilación: sin errores de TypeScript ni de plantilla. Único aviso: el
bundle inicial superó el presupuesto por defecto de 500 kB (Angular Material pesa), se ajustó el
presupuesto en `angular.json`.

Correcciones manuales o iteraciones posteriores:

1. Reemplazo del método `toPromise()` (obsoleto en RxJS 7) por `firstValueFrom` en los diálogos de
   confirmación.
2. Las ayudas (`mat-hint`) de los campos del diálogo "Nuevo préstamo" se encimaban con la fila
   siguiente; se acortaron los textos y se aumentó el espacio de la cuadrícula.
3. El comando `ng build --base-href /tarea2-ia-ui/biblioteca/` ejecutado desde Git Bash en Windows
   convertía la ruta en una ruta de Windows. Se resolvió moviendo la compilación a scripts de npm
   (`npm run build:pages`), que no sufren esa conversión.

## Fase 2. Aplicación web: clínica

Prompt efectivo:

> Crea la app Angular clinica con Angular Material: sitio de un consultorio multiespecialidad
> (medicina general, pediatría, odontología, ginecología y nutrición) con páginas de inicio,
> servicios, equipo médico y contacto, y un flujo de agendado de citas en pasos: especialidad,
> médico, fecha y hora disponibles según el horario del médico, y datos del paciente, con folio de
> confirmación. Agrega "Mis citas" para consultar y cancelar con folio y teléfono, y un panel de
> recepción con la agenda del día, filtros y cambio de estado. Datos en IndexedDB con Dexie.
> Inventa los datos del consultorio con nombres claramente ficticios.

Archivos generados (en `projects/clinica/src/app/`): `core/datos-clinica.ts`, `core/models.ts`,
`core/db.ts`, `core/citas.service.ts`, `core/notificaciones.service.ts`, y una carpeta por página en
`features/` (inicio, servicios, equipo, contacto, agendar, mis-citas, recepcion), más `app.ts`,
`app.config.ts`, `app.routes.ts`, `styles.scss` e `index.html`.

Resultado de la primera compilación: sin errores.

Correcciones detectadas con las pruebas automatizadas (Playwright):

1. Al llegar a "Agendar" con parámetros en la URL (`?especialidad=general&medico=m1`) desde la
   misma página, la preselección no se aplicaba porque Angular reutiliza el componente y el código
   leía los parámetros una sola vez (`snapshot`). Se cambió a una suscripción a `queryParamMap`.
2. Los iconos médicos (estetoscopio, diente, nutrición) no existen en la fuente clásica Material
   Icons; se cambió a Material Symbols y se configuró `MatIconRegistry` en el arranque.
3. El botón de menú del panel de recepción solo tenía un tooltip y no un `aria-label`, por lo que
   Playwright (y un lector de pantalla) no podían identificarlo; se agregó la etiqueta accesible.
4. La carga de citas de demostración fallaba si ya existía cualquier cita. Se cambió para que pueda
   ejecutarse varias veces, con un prefijo de folio por lote y respetando los horarios ya ocupados.
5. La fecha larga del panel de recepción se mostraba con todas las palabras en mayúscula inicial
   ("Miércoles, 16 De Septiembre") por usar `text-transform: capitalize`; se limitó a la primera letra.

## Fase 3. CI/CD, verificación y evidencias

- Claude Code generó `.github/workflows/pages.yml` (compila ambas apps con `npm run build:pages` y
  publica `_site` con `actions/deploy-pages`), `scripts/ensamblar-pages.mjs` (une ambas
  compilaciones y una portada) y `scripts/servir-local.mjs` (vista previa local con el mismo
  prefijo de ruta que GitHub Pages).
- También generó `scripts/capturas.mjs`, un guion de Playwright que recorre ambas aplicaciones,
  carga datos de demostración, completa el flujo de agendado de una cita de principio a fin y toma
  las capturas usadas en el reporte. Este guion sirvió además como prueba funcional: los dos
  errores de la clínica listados arriba se detectaron con él.

## Observaciones sobre el uso de la herramienta

- Lo que mejor funcionó: generar módulos completos y coherentes entre sí (modelos, servicio,
  pantallas) a partir de una descripción de reglas de negocio; el código compiló a la primera en
  ambas aplicaciones.
- Lo que requirió supervisión: detalles visuales (espaciados que se enciman), comportamientos que
  solo aparecen en tiempo de ejecución (reutilización de componentes del router) y particularidades
  del entorno (conversión de rutas de Git Bash, versión de Node).
- La herramienta pidió confirmación antes de decisiones con impacto (stack, persistencia, nombre
  del repositorio) y explicó las alternativas, lo que ayudó a que las decisiones fueran del
  estudiante y no de la IA.

## Fase 4. Prueba de Claude Design (segunda herramienta web)

El 2026-09-18 se decidió sustituir la ficha de v0 por Claude Design, para que la segunda herramienta
web fuera una que el alumno sí pudiera probar con su suscripción de Claude. Prompt utilizado en la
pestaña Design de claude.ai (mismo enunciado que la implementación con Claude Code):

> Diseña un prototipo web interactivo para "Clinica Salud Integral", un consultorio medico
> multiespecialidad en Ciudad de Mexico. Publico objetivo: pacientes que quieren informarse y agendar
> una cita en linea sin crear cuenta. Paginas: 1. Inicio (menu, eslogan "Atencion medica cercana, con
> cita en minutos", horario, tarjetas de cinco especialidades y seccion "Como funciona" en tres pasos).
> 2. Servicios (descripcion, duracion y precio de referencia en MXN). 3. Equipo medico (seis tarjetas
> con nombre ficticio, especialidad, dias y horario, boton "Agendar"). 4. Agendar cita en cuatro pasos
> (especialidad, medico, fecha y hora entre horarios disponibles, datos del paciente) con confirmacion
> y folio tipo CIT-XXXXXX. 5. Mis citas (folio y telefono para consultar y cancelar). 6. Contacto
> (direccion, telefonos, horario, aviso de urgencias 911 y preguntas frecuentes). Estilo: Material
> Design 3, paleta verde azulado con acentos verdes, Roboto, fondo claro, responsivo. Datos ficticios y
> pie "Sitio de demostracion academica".

Captura esperada: `evidencias/capturas/c12-claude-design.png`. Si existe, el generador del reporte la
incluye automáticamente en la ficha de Claude Design.

## Fase 5. Aplicación de escritorio nativa con Electron

El 2026-09-18, al releer el enunciado ("aplicación de escritorio"), se decidió reforzar el Ejercicio 1B
empaquetando la biblioteca con Electron además de la PWA. Prompt efectivo:

> Empaqueta la app Angular biblioteca con Electron: proceso principal con ventana nativa, menú en
> español, sin integración de Node en la página, cargando el build con base-href relativo. Configura
> electron-builder para generar instaladores de Windows (NSIS), macOS (DMG) y Linux (AppImage), y un
> workflow de GitHub Actions con matriz de los tres sistemas que publique los instaladores en Releases
> al crear una etiqueta de versión.

Archivos generados: `electron/main.cjs`, sección `build` y scripts `electron`, `electron:dist`,
`build:electron` en `package.json`, `.github/workflows/electron.yml`, `build/icon.png`. Ajuste en
`app.config.ts` para no registrar el service worker cuando la app corre desde `file://`.
