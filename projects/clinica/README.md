# Clínica Salud Integral: sitio web con agenda de citas

Prototipo de página web para un consultorio multiespecialidad. Presenta la información de la
clínica (servicios, equipo médico, contacto y preguntas frecuentes) y permite a los pacientes
agendar, consultar y cancelar citas sin crear una cuenta. Incluye un panel de recepción para el
personal.

URL publicada: https://sergiocaballeroo.github.io/tarea2-ia-ui/clinica/

## Funcionalidades

- Inicio con presentación, servicios destacados y pasos para agendar.
- Servicios: especialidades con descripción, duración y precio de referencia.
- Equipo médico: perfil, días y horario de atención de cada especialista, con acceso directo a agendar.
- Contacto: dirección, teléfonos, horario y preguntas frecuentes.
- Agendar cita en cuatro pasos: especialidad, médico, fecha y hora (solo horarios libres) y datos
  del paciente. Genera un folio, permite descargar el evento en formato `.ics` e imprimir comprobante.
- Mis citas: consulta con folio y teléfono, descarga a calendario y cancelación.
- Recepción: agenda por día con navegación de fechas, filtros por médico y estado, búsqueda,
  confirmación, registro de asistencia, cancelación con motivo, notas y exportación a CSV.
- Datos de demostración para poblar la agenda.

## Reglas de negocio

1. Las citas se agendan con al menos un día de anticipación y hasta 60 días adelante.
2. Solo se muestran fechas en que atiende el médico y horarios dentro de su jornada.
3. Los horarios se generan según la duración de la consulta de cada especialidad.
4. Un horario ocupado (cita no cancelada) no se puede volver a asignar.
5. Un mismo teléfono no puede tener dos citas activas con el mismo médico el mismo día.
6. La consulta y cancelación requieren folio y teléfono como doble verificación.

## Ejecución

```bash
npm install
npm run start:clinica     # http://localhost:4300
```

Compilación de producción: `npx ng build clinica` genera `dist/clinica/browser`.

## Arquitectura

```
src/app/
  core/
    datos-clinica.ts        Información del consultorio, especialidades y médicos (ficticios)
    models.ts               Tipo Cita, estados y utilidades de fecha
    db.ts                   Esquema Dexie (IndexedDB): citas
    citas.service.ts        Disponibilidad, agendado, consulta, cancelación, ICS y CSV
    notificaciones.service.ts
  features/
    inicio/  servicios/  equipo/  contacto/  agendar/  mis-citas/  recepcion/
  app.ts                    Shell: barra de navegación responsiva y pie de página
  app.routes.ts             Rutas con carga diferida (hash routing para GitHub Pages)
```

Las citas se guardan en IndexedDB del navegador. En un despliegue real se sustituiría el servicio
de citas por llamadas a una API con autenticación para el panel de recepción.

Todos los nombres, cédulas, teléfonos y direcciones son ficticios.
