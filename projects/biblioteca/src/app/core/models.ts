/**
 * Modelos de dominio de la biblioteca.
 * Los identificadores numéricos los asigna IndexedDB (autoincremento).
 */

export type TipoSocio = 'estudiante' | 'docente' | 'externo';
export type EstadoPrestamo = 'activo' | 'devuelto';

export interface Libro {
  id?: number;
  isbn: string;
  titulo: string;
  autor: string;
  editorial: string;
  anio: number;
  categoria: string;
  ejemplaresTotales: number;
  ejemplaresDisponibles: number;
}

export interface Socio {
  id?: number;
  /** Código visible para el bibliotecario, ej. S-0001 */
  codigo: string;
  nombre: string;
  email: string;
  telefono: string;
  tipo: TipoSocio;
  activo: boolean;
  /** Fecha ISO (YYYY-MM-DD) */
  fechaAlta: string;
}

export interface Prestamo {
  id?: number;
  libroId: number;
  socioId: number;
  /** Fechas ISO (YYYY-MM-DD) */
  fechaPrestamo: string;
  fechaVencimiento: string;
  fechaDevolucion?: string;
  estado: EstadoPrestamo;
  /** Multa cobrada al devolver, en MXN */
  multa: number;
}

/** Préstamo enriquecido con los datos del libro y del socio para mostrar en tablas. */
export interface PrestamoDetalle extends Prestamo {
  libroTitulo: string;
  libroIsbn: string;
  socioNombre: string;
  socioCodigo: string;
  /** Días de retraso respecto a hoy (0 si no está vencido). */
  diasRetraso: number;
  /** Multa estimada a hoy según la configuración. */
  multaEstimada: number;
}

export interface Configuracion {
  id: 1;
  nombreBiblioteca: string;
  diasPrestamo: number;
  limitePrestamos: number;
  multaPorDia: number;
}

export const CONFIG_DEFAULT: Configuracion = {
  id: 1,
  nombreBiblioteca: 'Biblioteca Central',
  diasPrestamo: 14,
  limitePrestamos: 3,
  multaPorDia: 10,
};

export const CATEGORIAS = [
  'Literatura',
  'Ciencia',
  'Tecnología',
  'Historia',
  'Arte',
  'Ingeniería',
  'Matemáticas',
  'Infantil',
  'Otro',
] as const;

/** Devuelve la fecha local de hoy como YYYY-MM-DD. */
export function hoyISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Suma días a una fecha ISO y regresa otra fecha ISO. */
export function sumarDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1, d + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Días completos entre dos fechas ISO (b - a). Puede ser negativo. */
export function diasEntre(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ms = new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime();
  return Math.round(ms / 86_400_000);
}
