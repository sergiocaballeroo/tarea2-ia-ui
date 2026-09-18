import { Pipe, PipeTransform } from '@angular/core';
import { PrestamoDetalle, diasEntre, hoyISO } from '../../core/models';

export interface EstadoVisual {
  texto: string;
  clase: string;
}

/** Traduce el estado de un préstamo a una etiqueta legible y una clase de color. */
@Pipe({ name: 'estadoPrestamo' })
export class EstadoPrestamoPipe implements PipeTransform {
  transform(p: PrestamoDetalle): EstadoVisual {
    if (p.estado === 'devuelto') {
      return p.multa > 0
        ? { texto: 'Devuelto con multa', clase: 'chip-neutro' }
        : { texto: 'Devuelto', clase: 'chip-neutro' };
    }
    if (p.diasRetraso > 0) {
      return { texto: `Vencido (${p.diasRetraso} d)`, clase: 'chip-error' };
    }
    const faltan = diasEntre(hoyISO(), p.fechaVencimiento);
    if (faltan <= 2) {
      return { texto: faltan === 0 ? 'Vence hoy' : `Vence en ${faltan} d`, clase: 'chip-aviso' };
    }
    return { texto: 'Al corriente', clase: 'chip-ok' };
  }
}
