import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReglaNegocioError } from './citas.service';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly snack = inject(MatSnackBar);

  exito(mensaje: string): void {
    this.snack.open(mensaje, 'OK', { duration: 3500 });
  }

  error(err: unknown): void {
    const esNegocio = err instanceof ReglaNegocioError;
    const mensaje = esNegocio ? (err as Error).message : 'Ocurrió un error inesperado.';
    if (!esNegocio) console.error(err);
    this.snack.open(mensaje, 'Cerrar', { duration: 6000, panelClass: 'snack-error' });
  }

  async ejecutar<T>(accion: () => Promise<T>, mensajeExito?: string): Promise<T | undefined> {
    try {
      const r = await accion();
      if (mensajeExito) this.exito(mensajeExito);
      return r;
    } catch (e) {
      this.error(e);
      return undefined;
    }
  }

  /** Como ejecutar, pero devuelve true/false según haya tenido éxito (útil cuando la acción no regresa valor). */
  async intentar(accion: () => Promise<unknown>, mensajeExito?: string): Promise<boolean> {
    try {
      await accion();
      if (mensajeExito) this.exito(mensajeExito);
      return true;
    } catch (e) {
      this.error(e);
      return false;
    }
  }
}
