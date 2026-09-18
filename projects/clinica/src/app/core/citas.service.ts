import { Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db } from './db';
import { CLINICA, MEDICOS, especialidadDe, medicoDe } from './datos-clinica';
import { Cita, EstadoCita, aISO, deISO, hoyISO, sumarDias } from './models';

export class ReglaNegocioError extends Error {}

export interface SolicitudCita {
  especialidadId: string;
  medicoId: string;
  fecha: string;
  hora: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  pacienteEmail: string;
  pacienteNacimiento?: string;
  motivo: string;
  primeraVez: boolean;
}

/** Reglas de agenda: disponibilidad, alta, consulta y cancelación de citas. */
@Injectable({ providedIn: 'root' })
export class CitasService {
  /** Todas las citas, reactivas a cambios en IndexedDB. */
  readonly citas: Signal<Cita[]> = toSignal(
    from(liveQuery(() => db.citas.orderBy('fecha').toArray())),
    { initialValue: [] },
  );

  /** Máximo de días hacia adelante que se puede agendar. */
  readonly diasMaximos = 60;

  /** Fechas ISO en las que el médico atiende, desde mañana hasta el límite. */
  fechasDisponibles(medicoId: string): string[] {
    const medico = medicoDe(medicoId);
    if (!medico) return [];
    const fechas: string[] = [];
    let fecha = hoyISO();
    for (let i = 0; i < this.diasMaximos; i++) {
      fecha = sumarDias(fecha, 1);
      if (medico.dias.includes(deISO(fecha).getDay())) fechas.push(fecha);
    }
    return fechas;
  }

  /** Genera los horarios del día según el horario del médico y la duración de la consulta. */
  horariosDelDia(medicoId: string): string[] {
    const medico = medicoDe(medicoId);
    const especialidad = medico && especialidadDe(medico.especialidadId);
    if (!medico || !especialidad) return [];
    const [hi, mi] = medico.horaInicio.split(':').map(Number);
    const [hf, mf] = medico.horaFin.split(':').map(Number);
    const inicio = hi * 60 + mi;
    const fin = hf * 60 + mf;
    const horarios: string[] = [];
    for (let t = inicio; t + especialidad.duracionMinutos <= fin; t += especialidad.duracionMinutos) {
      horarios.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
    }
    return horarios;
  }

  /** Horarios ocupados (citas no canceladas) de un médico en una fecha. */
  async horariosOcupados(medicoId: string, fecha: string): Promise<Set<string>> {
    const citas = await db.citas.where({ medicoId, fecha }).toArray();
    return new Set(citas.filter((c) => c.estado !== 'cancelada').map((c) => c.hora));
  }

  async agendar(solicitud: SolicitudCita): Promise<Cita> {
    const medico = medicoDe(solicitud.medicoId);
    if (!medico) throw new ReglaNegocioError('Selecciona un médico válido.');
    if (solicitud.fecha <= hoyISO()) {
      throw new ReglaNegocioError('La cita debe agendarse al menos con un día de anticipación.');
    }
    if (!medico.dias.includes(deISO(solicitud.fecha).getDay())) {
      throw new ReglaNegocioError('El médico no atiende ese día.');
    }
    if (!this.horariosDelDia(medico.id).includes(solicitud.hora)) {
      throw new ReglaNegocioError('El horario no es válido para este médico.');
    }

    return db.transaction('rw', db.citas, async () => {
      const ocupados = await this.horariosOcupados(solicitud.medicoId, solicitud.fecha);
      if (ocupados.has(solicitud.hora)) {
        throw new ReglaNegocioError('Ese horario acaba de ocuparse. Elige otro, por favor.');
      }
      const telefono = solicitud.pacienteTelefono.replace(/\D/g, '');
      const duplicada = await db.citas
        .where({ medicoId: solicitud.medicoId, fecha: solicitud.fecha })
        .filter((c) => c.estado !== 'cancelada' && c.pacienteTelefono === telefono)
        .first();
      if (duplicada) {
        throw new ReglaNegocioError(
          `Ya existe una cita para este teléfono con el mismo médico ese día (folio ${duplicada.folio}).`,
        );
      }
      const cita: Cita = {
        ...solicitud,
        pacienteTelefono: telefono,
        pacienteNombre: solicitud.pacienteNombre.trim(),
        pacienteEmail: solicitud.pacienteEmail.trim().toLowerCase(),
        folio: await this.generarFolio(),
        estado: 'programada',
        creadaEn: new Date().toISOString(),
      };
      cita.id = await db.citas.add(cita);
      return cita;
    });
  }

  /** El paciente consulta su cita con folio y teléfono, como doble verificación. */
  async buscar(folio: string, telefono: string): Promise<Cita> {
    const cita = await db.citas.where('folio').equals(folio.trim().toUpperCase()).first();
    if (!cita || cita.pacienteTelefono !== telefono.replace(/\D/g, '')) {
      throw new ReglaNegocioError('No encontramos una cita con ese folio y teléfono.');
    }
    return cita;
  }

  async cancelar(id: number, motivo = 'Cancelada por el paciente'): Promise<void> {
    const cita = await db.citas.get(id);
    if (!cita) throw new ReglaNegocioError('La cita no existe.');
    if (cita.estado === 'atendida') throw new ReglaNegocioError('La cita ya fue atendida.');
    if (cita.estado === 'cancelada') throw new ReglaNegocioError('La cita ya estaba cancelada.');
    await db.citas.update(id, { estado: 'cancelada', notas: motivo });
  }

  async cambiarEstado(id: number, estado: EstadoCita): Promise<void> {
    await db.citas.update(id, { estado });
  }

  async guardarNotas(id: number, notas: string): Promise<void> {
    await db.citas.update(id, { notas });
  }

  /** Genera un archivo .ics para agregar la cita al calendario del paciente. */
  descargarICS(cita: Cita): void {
    const medico = medicoDe(cita.medicoId);
    const especialidad = especialidadDe(cita.especialidadId);
    const inicio = deISO(cita.fecha);
    const [h, m] = cita.hora.split(':').map(Number);
    inicio.setHours(h, m, 0, 0);
    const fin = new Date(inicio.getTime() + (especialidad?.duracionMinutos ?? 30) * 60_000);
    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T` +
      `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Clinica Demo//Citas//ES',
      'BEGIN:VEVENT',
      `UID:${cita.folio}@clinica-demo`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(inicio)}`,
      `DTEND:${fmt(fin)}`,
      `SUMMARY:Cita ${especialidad?.nombre ?? ''} - ${CLINICA.nombre}`,
      `DESCRIPTION:Folio ${cita.folio}. ${medico?.nombre ?? ''}. Motivo: ${cita.motivo}`,
      `LOCATION:${CLINICA.direccion}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cita-${cita.folio}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  descargarCSV(nombre: string, encabezados: string[], filas: (string | number)[][]): void {
    const escapar = (v: string | number) => '"' + String(v).replace(/"/g, '""') + '"';
    const contenido = [encabezados, ...filas].map((f) => f.map(escapar).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Carga citas ficticias para la vista de recepción. */
  async cargarDatosDemo(): Promise<number> {
    // Se puede cargar varias veces: cada lote usa un prefijo de folio distinto y respeta horarios ya ocupados.
    const lote = Date.now().toString(36).toUpperCase().slice(-4);
    const ocupadosPorClave = new Set(
      (await db.citas.toArray()).filter((c) => c.estado !== 'cancelada').map((c) => `${c.medicoId}|${c.fecha}|${c.hora}`),
    );
    const nombres = ['Paciente Demo Uno', 'Paciente Demo Dos', 'Paciente Demo Tres', 'Paciente Demo Cuatro', 'Paciente Demo Cinco', 'Paciente Demo Seis'];
    const motivos = ['Revisión general', 'Dolor de cabeza recurrente', 'Control de peso', 'Limpieza dental', 'Control prenatal', 'Vacunación'];
    const estados: EstadoCita[] = ['programada', 'confirmada', 'atendida', 'cancelada'];
    const citas: Cita[] = [];
    let n = 0;
    for (let offset = -3; offset <= 7; offset++) {
      const fecha = sumarDias(hoyISO(), offset);
      const dia = deISO(fecha).getDay();
      for (const medico of MEDICOS.filter((m) => m.dias.includes(dia))) {
        const horarios = this.horariosDelDia(medico.id);
        const cuantas = 1 + ((n + offset) % 2);
        for (let i = 0; i < cuantas; i++) {
          const hora = horarios[(n * 3 + i * 5) % horarios.length];
          const clave = `${medico.id}|${fecha}|${hora}`;
          if (ocupadosPorClave.has(clave)) {
            n++;
            continue;
          }
          ocupadosPorClave.add(clave);
          const estado: EstadoCita = offset < 0 ? (n % 4 === 0 ? 'cancelada' : 'atendida') : estados[n % 2];
          citas.push({
            folio: `DEMO-${lote}-${String(n + 1).padStart(3, '0')}`,
            especialidadId: medico.especialidadId,
            medicoId: medico.id,
            fecha,
            hora,
            pacienteNombre: nombres[n % nombres.length],
            pacienteTelefono: `55000000${String(n % 100).padStart(2, '0')}`,
            pacienteEmail: `paciente${n + 1}@correo.test`,
            motivo: motivos[n % motivos.length],
            primeraVez: n % 3 === 0,
            estado,
            creadaEn: new Date().toISOString(),
          });
          n++;
        }
      }
    }
    await db.citas.bulkAdd(citas);
    return citas.length;
  }

  async borrarTodo(): Promise<void> {
    await db.citas.clear();
  }

  private async generarFolio(): Promise<string> {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let intento = 0; intento < 10; intento++) {
      let folio = 'CIT-';
      for (let i = 0; i < 6; i++) folio += alfabeto[Math.floor(Math.random() * alfabeto.length)];
      if (!(await db.citas.where('folio').equals(folio).first())) return folio;
    }
    return `CIT-${Date.now().toString(36).toUpperCase()}`;
  }

  /** Utilidad para mostrar la fecha de hoy en la vista de recepción. */
  hoy(): Date {
    return deISO(hoyISO());
  }

  aISO = aISO;
}
