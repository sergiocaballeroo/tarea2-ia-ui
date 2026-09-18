import { Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db } from './db';
import {
  CONFIG_DEFAULT,
  Configuracion,
  Libro,
  Prestamo,
  PrestamoDetalle,
  Socio,
  diasEntre,
  hoyISO,
  sumarDias,
} from './models';

/** Error de negocio que se muestra tal cual al usuario. */
export class ReglaNegocioError extends Error {}

/**
 * Servicio central: reglas de negocio de préstamos y acceso a datos.
 * Expone señales reactivas alimentadas por liveQuery de Dexie, de modo que
 * cualquier cambio en IndexedDB actualiza la interfaz automáticamente.
 */
@Injectable({ providedIn: 'root' })
export class BibliotecaService {
  readonly libros: Signal<Libro[]> = toSignal(
    from(liveQuery(() => db.libros.orderBy('titulo').toArray())),
    { initialValue: [] },
  );

  readonly socios: Signal<Socio[]> = toSignal(
    from(liveQuery(() => db.socios.orderBy('nombre').toArray())),
    { initialValue: [] },
  );

  readonly configuracion: Signal<Configuracion> = toSignal(
    from(liveQuery(async () => (await db.configuracion.get(1)) ?? CONFIG_DEFAULT)),
    { initialValue: CONFIG_DEFAULT },
  );

  /** Todos los préstamos con datos de libro y socio ya resueltos. */
  readonly prestamos: Signal<PrestamoDetalle[]> = toSignal(
    from(liveQuery(() => this.cargarPrestamosDetalle())),
    { initialValue: [] },
  );

  // ---------- Libros ----------

  async guardarLibro(libro: Libro): Promise<number> {
    const isbn = libro.isbn.trim();
    const duplicado = await db.libros.where('isbn').equals(isbn).first();
    if (duplicado && duplicado.id !== libro.id) {
      throw new ReglaNegocioError(`Ya existe un libro con el ISBN ${isbn}.`);
    }
    if (libro.id) {
      const actual = await db.libros.get(libro.id);
      if (!actual) throw new ReglaNegocioError('El libro ya no existe.');
      const prestados = actual.ejemplaresTotales - actual.ejemplaresDisponibles;
      if (libro.ejemplaresTotales < prestados) {
        throw new ReglaNegocioError(
          `No puedes tener menos de ${prestados} ejemplares: hay ${prestados} prestados.`,
        );
      }
      libro.ejemplaresDisponibles = libro.ejemplaresTotales - prestados;
      await db.libros.put({ ...libro, isbn });
      return libro.id;
    }
    libro.ejemplaresDisponibles = libro.ejemplaresTotales;
    return db.libros.add({ ...libro, isbn });
  }

  async eliminarLibro(id: number): Promise<void> {
    const activos = await db.prestamos
      .where({ libroId: id })
      .filter((p) => p.estado === 'activo')
      .count();
    if (activos > 0) {
      throw new ReglaNegocioError('No se puede eliminar: el libro tiene préstamos activos.');
    }
    await db.transaction('rw', db.libros, db.prestamos, async () => {
      await db.prestamos.where({ libroId: id }).delete();
      await db.libros.delete(id);
    });
  }

  // ---------- Socios ----------

  async guardarSocio(socio: Socio): Promise<number> {
    if (socio.id) {
      await db.socios.put(socio);
      return socio.id;
    }
    const total = await db.socios.count();
    socio.codigo = `S-${String(total + 1).padStart(4, '0')}`;
    socio.fechaAlta = hoyISO();
    socio.activo = true;
    return db.socios.add(socio);
  }

  async cambiarEstadoSocio(id: number, activo: boolean): Promise<void> {
    if (!activo) {
      const activos = await db.prestamos.where({ socioId: id, estado: 'activo' }).count();
      if (activos > 0) {
        throw new ReglaNegocioError('No se puede desactivar: el socio tiene préstamos activos.');
      }
    }
    await db.socios.update(id, { activo });
  }

  async eliminarSocio(id: number): Promise<void> {
    const activos = await db.prestamos.where({ socioId: id, estado: 'activo' }).count();
    if (activos > 0) {
      throw new ReglaNegocioError('No se puede eliminar: el socio tiene préstamos activos.');
    }
    await db.transaction('rw', db.socios, db.prestamos, async () => {
      await db.prestamos.where({ socioId: id }).delete();
      await db.socios.delete(id);
    });
  }

  // ---------- Préstamos ----------

  /**
   * Registra un préstamo aplicando las reglas:
   * 1. El socio debe estar activo.
   * 2. El socio no debe exceder el límite de préstamos simultáneos.
   * 3. El socio no debe tener préstamos vencidos.
   * 4. Debe haber ejemplares disponibles.
   */
  async prestar(libroId: number, socioId: number, fechaPrestamo = hoyISO()): Promise<number> {
    const config = this.configuracion();
    return db.transaction('rw', db.libros, db.socios, db.prestamos, async () => {
      const socio = await db.socios.get(socioId);
      const libro = await db.libros.get(libroId);
      if (!socio || !libro) throw new ReglaNegocioError('Socio o libro no encontrado.');
      if (!socio.activo) throw new ReglaNegocioError(`El socio ${socio.codigo} está inactivo.`);

      const activos = await db.prestamos.where({ socioId, estado: 'activo' }).toArray();
      if (activos.length >= config.limitePrestamos) {
        throw new ReglaNegocioError(
          `El socio ya tiene ${activos.length} préstamos activos (límite ${config.limitePrestamos}).`,
        );
      }
      const hoy = hoyISO();
      if (activos.some((p) => p.fechaVencimiento < hoy)) {
        throw new ReglaNegocioError('El socio tiene préstamos vencidos. Debe devolverlos primero.');
      }
      if (libro.ejemplaresDisponibles <= 0) {
        throw new ReglaNegocioError(`No hay ejemplares disponibles de "${libro.titulo}".`);
      }

      await db.libros.update(libroId, { ejemplaresDisponibles: libro.ejemplaresDisponibles - 1 });
      return db.prestamos.add({
        libroId,
        socioId,
        fechaPrestamo,
        fechaVencimiento: sumarDias(fechaPrestamo, config.diasPrestamo),
        estado: 'activo',
        multa: 0,
      });
    });
  }

  /** Calcula la multa que correspondería devolver hoy un préstamo. */
  calcularMulta(prestamo: Prestamo, fechaDevolucion = hoyISO()): number {
    const retraso = Math.max(0, diasEntre(prestamo.fechaVencimiento, fechaDevolucion));
    return retraso * this.configuracion().multaPorDia;
  }

  /** Marca el préstamo como devuelto, libera el ejemplar y registra la multa. */
  async devolver(prestamoId: number, fechaDevolucion = hoyISO()): Promise<number> {
    return db.transaction('rw', db.libros, db.prestamos, async () => {
      const prestamo = await db.prestamos.get(prestamoId);
      if (!prestamo || prestamo.estado !== 'activo') {
        throw new ReglaNegocioError('El préstamo no existe o ya fue devuelto.');
      }
      const multa = this.calcularMulta(prestamo, fechaDevolucion);
      const libro = await db.libros.get(prestamo.libroId);
      if (libro) {
        await db.libros.update(libro.id!, {
          ejemplaresDisponibles: Math.min(libro.ejemplaresTotales, libro.ejemplaresDisponibles + 1),
        });
      }
      await db.prestamos.update(prestamoId, { estado: 'devuelto', fechaDevolucion, multa });
      return multa;
    });
  }

  /** Extiende la fecha de vencimiento (renovación) si el préstamo no está vencido. */
  async renovar(prestamoId: number): Promise<string> {
    const prestamo = await db.prestamos.get(prestamoId);
    if (!prestamo || prestamo.estado !== 'activo') {
      throw new ReglaNegocioError('El préstamo no existe o ya fue devuelto.');
    }
    if (prestamo.fechaVencimiento < hoyISO()) {
      throw new ReglaNegocioError('No se puede renovar un préstamo vencido.');
    }
    const nueva = sumarDias(prestamo.fechaVencimiento, this.configuracion().diasPrestamo);
    await db.prestamos.update(prestamoId, { fechaVencimiento: nueva });
    return nueva;
  }

  // ---------- Configuración ----------

  async guardarConfiguracion(config: Configuracion): Promise<void> {
    await db.configuracion.put({ ...config, id: 1 });
  }

  // ---------- Utilidades ----------

  private async cargarPrestamosDetalle(): Promise<PrestamoDetalle[]> {
    const [prestamos, libros, socios, config] = await Promise.all([
      db.prestamos.toArray(),
      db.libros.toArray(),
      db.socios.toArray(),
      db.configuracion.get(1),
    ]);
    const multaPorDia = (config ?? CONFIG_DEFAULT).multaPorDia;
    const librosMap = new Map(libros.map((l) => [l.id!, l]));
    const sociosMap = new Map(socios.map((s) => [s.id!, s]));
    const hoy = hoyISO();
    return prestamos
      .map((p) => {
        const libro = librosMap.get(p.libroId);
        const socio = sociosMap.get(p.socioId);
        const referencia = p.estado === 'activo' ? hoy : (p.fechaDevolucion ?? hoy);
        const diasRetraso = Math.max(0, diasEntre(p.fechaVencimiento, referencia));
        return {
          ...p,
          libroTitulo: libro?.titulo ?? '(libro eliminado)',
          libroIsbn: libro?.isbn ?? '',
          socioNombre: socio?.nombre ?? '(socio eliminado)',
          socioCodigo: socio?.codigo ?? '',
          diasRetraso,
          multaEstimada: p.estado === 'activo' ? diasRetraso * multaPorDia : p.multa,
        };
      })
      .sort(
        (a, b) => b.fechaPrestamo.localeCompare(a.fechaPrestamo) || (b.id ?? 0) - (a.id ?? 0),
      );
  }

  /** Genera un CSV (separado por comas, con BOM para Excel) a partir de filas. */
  descargarCSV(nombre: string, encabezados: string[], filas: (string | number)[][]): void {
    const escapar = (v: string | number) => '"' + String(v).replace(/"/g, '""') + '"';
    const contenido = [encabezados, ...filas].map((f) => f.map(escapar).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' });
    this.descargarBlob(blob, nombre);
  }

  /** Exporta toda la base a JSON para respaldo. */
  async exportarRespaldo(): Promise<void> {
    const datos = {
      exportadoEn: new Date().toISOString(),
      libros: await db.libros.toArray(),
      socios: await db.socios.toArray(),
      prestamos: await db.prestamos.toArray(),
      configuracion: await db.configuracion.toArray(),
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    this.descargarBlob(blob, `biblioteca-respaldo-${hoyISO()}.json`);
  }

  /** Restaura un respaldo JSON, reemplazando todo lo existente. */
  async importarRespaldo(archivo: File): Promise<void> {
    const texto = await archivo.text();
    const datos = JSON.parse(texto);
    if (
      !Array.isArray(datos.libros) ||
      !Array.isArray(datos.socios) ||
      !Array.isArray(datos.prestamos)
    ) {
      throw new ReglaNegocioError('El archivo no tiene el formato de respaldo esperado.');
    }
    await db.transaction('rw', db.libros, db.socios, db.prestamos, db.configuracion, async () => {
      await this.vaciarTablas();
      await db.libros.bulkAdd(datos.libros);
      await db.socios.bulkAdd(datos.socios);
      await db.prestamos.bulkAdd(datos.prestamos);
      if (Array.isArray(datos.configuracion) && datos.configuracion.length) {
        await db.configuracion.bulkAdd(datos.configuracion);
      }
    });
  }

  async borrarTodo(): Promise<void> {
    await db.transaction('rw', db.libros, db.socios, db.prestamos, db.configuracion, () =>
      this.vaciarTablas(),
    );
  }

  /** Carga un conjunto de datos ficticios de demostración. */
  async cargarDatosDemo(): Promise<void> {
    const hayDatos = (await db.libros.count()) > 0;
    if (hayDatos) {
      throw new ReglaNegocioError('Ya hay datos. Borra todo antes de cargar la demostración.');
    }

    const hoy = hoyISO();
    await db.transaction('rw', db.libros, db.socios, db.prestamos, db.configuracion, async () => {
      await db.configuracion.put(CONFIG_DEFAULT);

      const librosDemo: Libro[] = LIBROS_DEMO.map((l) => ({ ...l, ejemplaresDisponibles: l.ejemplaresTotales }));
      const libroIds = await db.libros.bulkAdd(librosDemo, { allKeys: true });

      const sociosDemo: Socio[] = SOCIOS_DEMO.map((s, i) => ({
        ...s,
        codigo: `S-${String(i + 1).padStart(4, '0')}`,
        activo: true,
        fechaAlta: sumarDias(hoy, -60),
      }));
      const socioIds = await db.socios.bulkAdd(sociosDemo, { allKeys: true });

      // Préstamos: uno al corriente, uno por vencer, uno vencido y uno devuelto con multa.
      const prestamos: Prestamo[] = [
        { libroId: libroIds[0], socioId: socioIds[0], fechaPrestamo: sumarDias(hoy, -3), fechaVencimiento: sumarDias(hoy, 11), estado: 'activo', multa: 0 },
        { libroId: libroIds[3], socioId: socioIds[1], fechaPrestamo: sumarDias(hoy, -13), fechaVencimiento: sumarDias(hoy, 1), estado: 'activo', multa: 0 },
        { libroId: libroIds[4], socioId: socioIds[2], fechaPrestamo: sumarDias(hoy, -20), fechaVencimiento: sumarDias(hoy, -6), estado: 'activo', multa: 0 },
        { libroId: libroIds[1], socioId: socioIds[3], fechaPrestamo: sumarDias(hoy, -40), fechaVencimiento: sumarDias(hoy, -26), fechaDevolucion: sumarDias(hoy, -24), estado: 'devuelto', multa: 20 },
      ];
      await db.prestamos.bulkAdd(prestamos);
      for (const p of prestamos.filter((x) => x.estado === 'activo')) {
        const libro = await db.libros.get(p.libroId);
        await db.libros.update(p.libroId, { ejemplaresDisponibles: libro!.ejemplaresDisponibles - 1 });
      }
    });
  }

  private async vaciarTablas(): Promise<void> {
    await Promise.all([
      db.libros.clear(),
      db.socios.clear(),
      db.prestamos.clear(),
      db.configuracion.clear(),
    ]);
  }

  private descargarBlob(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** Catálogo ficticio de demostración (obras reales, ejemplares inventados). */
const LIBROS_DEMO: Omit<Libro, 'ejemplaresDisponibles'>[] = [
  { isbn: '9786070712456', titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', editorial: 'Diana', anio: 1967, categoria: 'Literatura', ejemplaresTotales: 3 },
  { isbn: '9788437604947', titulo: 'Pedro Páramo', autor: 'Juan Rulfo', editorial: 'Cátedra', anio: 1955, categoria: 'Literatura', ejemplaresTotales: 2 },
  { isbn: '9780262033848', titulo: 'Introduction to Algorithms', autor: 'Cormen, Leiserson, Rivest y Stein', editorial: 'MIT Press', anio: 2009, categoria: 'Tecnología', ejemplaresTotales: 2 },
  { isbn: '9780132350884', titulo: 'Clean Code', autor: 'Robert C. Martin', editorial: 'Prentice Hall', anio: 2008, categoria: 'Tecnología', ejemplaresTotales: 4 },
  { isbn: '9780553380163', titulo: 'A Brief History of Time', autor: 'Stephen Hawking', editorial: 'Bantam', anio: 1998, categoria: 'Ciencia', ejemplaresTotales: 1 },
  { isbn: '9786073124577', titulo: 'Historia mínima de México', autor: 'Daniel Cosío Villegas y otros', editorial: 'El Colegio de México', anio: 2011, categoria: 'Historia', ejemplaresTotales: 2 },
  { isbn: '9780321125215', titulo: 'Domain-Driven Design', autor: 'Eric Evans', editorial: 'Addison-Wesley', anio: 2003, categoria: 'Ingeniería', ejemplaresTotales: 1 },
  { isbn: '9780134685991', titulo: 'Effective Java', autor: 'Joshua Bloch', editorial: 'Addison-Wesley', anio: 2018, categoria: 'Tecnología', ejemplaresTotales: 2 },
  { isbn: '9788478884452', titulo: 'Harry Potter y la piedra filosofal', autor: 'J. K. Rowling', editorial: 'Salamandra', anio: 1997, categoria: 'Infantil', ejemplaresTotales: 3 },
  { isbn: '9780471504474', titulo: 'Cálculo', autor: 'Tom M. Apostol', editorial: 'Reverté', anio: 1991, categoria: 'Matemáticas', ejemplaresTotales: 2 },
];

/** Socios ficticios de demostración. */
const SOCIOS_DEMO: Pick<Socio, 'nombre' | 'email' | 'telefono' | 'tipo'>[] = [
  { nombre: 'Ana Torres Ejemplo', email: 'ana.ejemplo@correo.test', telefono: '5550000001', tipo: 'estudiante' },
  { nombre: 'Luis Ramírez Ejemplo', email: 'luis.ejemplo@correo.test', telefono: '5550000002', tipo: 'docente' },
  { nombre: 'María López Ejemplo', email: 'maria.ejemplo@correo.test', telefono: '5550000003', tipo: 'estudiante' },
  { nombre: 'Carlos Díaz Ejemplo', email: 'carlos.ejemplo@correo.test', telefono: '5550000004', tipo: 'externo' },
];
