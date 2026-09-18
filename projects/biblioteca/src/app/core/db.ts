import Dexie, { Table } from 'dexie';
import { Configuracion, Libro, Prestamo, Socio } from './models';

/**
 * Base de datos local en IndexedDB usando Dexie.
 * Todo se guarda en el navegador del usuario; no hay servidor.
 */
export class BibliotecaDB extends Dexie {
  libros!: Table<Libro, number>;
  socios!: Table<Socio, number>;
  prestamos!: Table<Prestamo, number>;
  configuracion!: Table<Configuracion, number>;

  constructor() {
    super('biblioteca-db');
    this.version(1).stores({
      // '++id' = clave primaria autoincremental; el resto son índices.
      libros: '++id, isbn, titulo, autor, categoria',
      socios: '++id, codigo, nombre, email, tipo, activo',
      prestamos: '++id, libroId, socioId, estado, fechaVencimiento, [socioId+estado]',
      configuracion: 'id',
    });
  }
}

export const db = new BibliotecaDB();
