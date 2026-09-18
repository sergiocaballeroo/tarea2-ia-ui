export type EstadoCita = 'programada' | 'confirmada' | 'atendida' | 'cancelada';

export interface Cita {
  id?: number;
  /** Folio público que el paciente usa para consultar o cancelar. */
  folio: string;
  especialidadId: string;
  medicoId: string;
  /** Fecha ISO YYYY-MM-DD y hora HH:mm en horario local. */
  fecha: string;
  hora: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  pacienteEmail: string;
  pacienteNacimiento?: string;
  motivo: string;
  primeraVez: boolean;
  estado: EstadoCita;
  creadaEn: string;
  notas?: string;
}

export const ESTADOS: { valor: EstadoCita; texto: string; clase: string }[] = [
  { valor: 'programada', texto: 'Programada', clase: 'chip-aviso' },
  { valor: 'confirmada', texto: 'Confirmada', clase: 'chip-ok' },
  { valor: 'atendida', texto: 'Atendida', clase: 'chip-neutro' },
  { valor: 'cancelada', texto: 'Cancelada', clase: 'chip-error' },
];

export function estadoVisual(estado: EstadoCita) {
  return ESTADOS.find((e) => e.valor === estado) ?? ESTADOS[0];
}

export function hoyISO(): string {
  return aISO(new Date());
}

export function aISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function deISO(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function sumarDias(fechaISO: string, dias: number): string {
  const f = deISO(fechaISO);
  f.setDate(f.getDate() + dias);
  return aISO(f);
}

/** Formatea una fecha ISO como "lunes 21 de septiembre de 2026". */
export function fechaLarga(fechaISO: string): string {
  return deISO(fechaISO).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
