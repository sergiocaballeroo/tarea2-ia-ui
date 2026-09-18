# Biblioteca: gestión de préstamos (aplicación de escritorio, PWA)

Aplicación para que el personal de una biblioteca registre libros y socios, preste y reciba
ejemplares, controle vencimientos y calcule multas. Se distribuye como **Progressive Web App**:
se instala desde el navegador y funciona como aplicación de escritorio en Windows, macOS y Linux,
con su propia ventana y sin conexión.

URL publicada: https://sergiocaballeroo.github.io/tarea2-ia-ui/biblioteca/

## Funcionalidades

- Catálogo de libros: alta, edición, eliminación, búsqueda por título, autor o ISBN, filtro por
  categoría y disponibilidad, exportación a CSV.
- Socios: alta con código automático (S-0001...), edición, activar o desactivar, exportación a CSV.
- Préstamos: registro con búsqueda de socio y libro, fecha de vencimiento calculada, devolución con
  cálculo de multa, renovación, historial y exportación a CSV.
- Vencidos: lista de préstamos atrasados con días de retraso, multa acumulada y devolución directa.
- Reglas configurables: días de préstamo, límite de préstamos simultáneos por socio y multa por día.
- Datos: carga de datos de demostración, respaldo e importación en JSON, borrado total.
- Inicio con indicadores y últimos movimientos.

## Reglas de negocio

1. Un socio inactivo no puede recibir préstamos.
2. Un socio no puede exceder el límite de préstamos simultáneos (3 por defecto).
3. Un socio con préstamos vencidos no puede recibir nuevos préstamos.
4. Solo se prestan libros con ejemplares disponibles.
5. La multa es `días de retraso x multa por día` (10 MXN por defecto) y se registra al devolver.
6. No se puede eliminar un libro o socio con préstamos activos.

## Ejecución

```bash
npm install
npm run start:biblioteca     # http://localhost:4200
```

Compilación de producción: `npx ng build biblioteca` genera `dist/biblioteca/browser`.

## Instalación como app de escritorio

En Chrome o Edge, abre la URL publicada y usa **Instalar aplicación** (menú lateral) o el icono de
instalación de la barra de direcciones. También funciona en desarrollo local (`ng serve`) aunque el
service worker solo se activa en compilación de producción.

## Arquitectura

```
src/app/
  core/
    models.ts                 Tipos Libro, Socio, Prestamo, Configuracion y utilidades de fecha
    db.ts                     Esquema Dexie (IndexedDB): libros, socios, prestamos, configuracion
    biblioteca.service.ts     Reglas de negocio y señales reactivas (liveQuery)
    notificaciones.service.ts Mensajes al usuario y manejo de errores de negocio
    confirmar.dialog.ts       Diálogo genérico de confirmación
  features/
    dashboard/  libros/  socios/  prestamos/  vencidos/  ajustes/
  app.ts                      Shell: menú lateral, barra superior, botón de instalación PWA
  app.routes.ts               Rutas con carga diferida (hash routing para GitHub Pages)
```

Los datos se persisten en IndexedDB con Dexie. Las tablas se exponen como señales de Angular a
través de `liveQuery`, por lo que cualquier cambio en la base actualiza la interfaz sin recargar.
