import { Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ESPECIALIDADES, MEDICOS } from '../../core/datos-clinica';

@Component({
  selector: 'app-servicios',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <section class="seccion">
      <h1 class="seccion-titulo">Servicios y especialidades</h1>
      <p class="seccion-sub">
        Precios de referencia por consulta. El costo final puede variar según el tratamiento indicado por el especialista.
      </p>
      <div class="lista">
        @for (e of especialidades; track e.id) {
          <mat-card appearance="outlined" class="servicio">
            <div class="icono"><mat-icon>{{ e.icono }}</mat-icon></div>
            <div class="cuerpo">
              <h2>{{ e.nombre }}</h2>
              <p>{{ e.descripcion }}</p>
              <div class="meta">
                <span><mat-icon>schedule</mat-icon> {{ e.duracionMinutos }} min por consulta</span>
                <span><mat-icon>payments</mat-icon> Desde {{ e.precioDesde | currency: 'MXN' : 'symbol-narrow' : '1.0-0' }}</span>
                <span><mat-icon>groups</mat-icon> {{ medicosDe(e.id) }} especialista(s)</span>
              </div>
            </div>
            <div class="accion">
              <a matButton="filled" routerLink="/agendar" [queryParams]="{ especialidad: e.id }">Agendar</a>
            </div>
          </mat-card>
        }
      </div>
    </section>
  `,
  styles: `
    .lista { display: grid; gap: 16px; }
    .servicio { display: grid; grid-template-columns: auto 1fr auto; gap: 20px; align-items: center; padding: 20px; }
    @media (max-width: 700px) { .servicio { grid-template-columns: 1fr; } }
    .icono { width: 64px; height: 64px; border-radius: 16px; background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); display: grid; place-items: center; }
    .icono mat-icon { font-size: 32px; width: 32px; height: 32px; }
    h2 { margin: 0 0 4px; font: var(--mat-sys-title-large); }
    .cuerpo p { margin: 0 0 8px; opacity: .8; }
    .meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 14px; opacity: .85; }
    .meta span { display: inline-flex; align-items: center; gap: 4px; }
    .meta mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `,
})
export class Servicios {
  protected readonly especialidades = ESPECIALIDADES;
  protected medicosDe(id: string): number {
    return MEDICOS.filter((m) => m.especialidadId === id).length;
  }
}
