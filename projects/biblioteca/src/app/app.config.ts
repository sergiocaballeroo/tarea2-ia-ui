import {
  ApplicationConfig,
  LOCALE_ID,
  isDevMode,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { DateAdapter, MAT_DATE_LOCALE, NativeDateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';

import { routes } from './app.routes';

registerLocaleData(localeEsMx);

/**
 * El adaptador nativo muestra las fechas como d/M/aaaa pero, al escribirlas a mano, las interpreta
 * con Date.parse (formato M/d/aaaa). Este adaptador acepta lo que el propio campo muestra.
 */
class AdaptadorFechaMX extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value === 'string') {
      const texto = value.trim();
      const dma = texto.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
      if (dma) return new Date(Number(dma[3]), Number(dma[2]) - 1, Number(dma[1]));
      const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    }
    return super.parse(value);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash routing: las rutas funcionan en GitHub Pages sin configurar redirecciones.
    provideRouter(routes, withHashLocation()),
    provideNativeDateAdapter(),
    { provide: DateAdapter, useClass: AdaptadorFechaMX },
    { provide: LOCALE_ID, useValue: 'es-MX' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-MX' },
    provideServiceWorker('ngsw-worker.js', {
      // En Electron la app se abre desde file:// y no aplica el service worker.
      enabled: !isDevMode() && typeof location !== 'undefined' && location.protocol.startsWith('http'),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
