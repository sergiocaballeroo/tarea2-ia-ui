import Dexie, { Table } from 'dexie';
import { Cita } from './models';

/** Base de datos local (IndexedDB) del prototipo. Las citas viven en el navegador. */
export class ClinicaDB extends Dexie {
  citas!: Table<Cita, number>;

  constructor() {
    super('clinica-db');
    this.version(1).stores({
      citas: '++id, &folio, medicoId, fecha, estado, pacienteTelefono, [medicoId+fecha]',
    });
  }
}

export const db = new ClinicaDB();
