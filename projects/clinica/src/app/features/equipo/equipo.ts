import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MEDICOS, diasTexto, especialidadDe } from '../../core/datos-clinica';

@Component({
  selector: 'app-equipo',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <section class="seccion">
      <h1 class="seccion-titulo">Equipo médico</h1>
      <p class="seccion-sub">Profesionales con cédula vigente y experiencia comprobada. Conoce sus horarios y agenda directamente.</p>
      <div class="tarjetas">
        @for (m of medicos; track m.id) {
          <mat-card appearance="outlined" class="medico">
            <mat-card-content>
              <div class="cabecera">
                <div class="avatar" [style.background]="m.color">{{ m.iniciales }}</div>
                <div>
                  <h2>{{ m.nombre }}</h2>
                  <div class="especialidad">{{ especialidad(m.especialidadId) }}</div>
                </div>
              </div>
              <p>{{ m.resumen }}</p>
              <ul>
                <li><mat-icon>badge</mat-icon> {{ m.cedula }}</li>
                <li><mat-icon>calendar_month</mat-icon> {{ dias(m.dias) }}</li>
                <li><mat-icon>schedule</mat-icon> {{ m.horaInicio }} a {{ m.horaFin }}</li>
              </ul>
            </mat-card-content>
            <mat-card-actions align="end">
              <a matButton="filled" routerLink="/agendar" [queryParams]="{ especialidad: m.especialidadId, medico: m.id }">Agendar con {{ m.nombre.split(' ')[0] }} {{ m.nombre.split(' ')[1] }}</a>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    </section>
  `,
  styles: `
    .medico { display: flex; flex-direction: column; }
    .medico mat-card-content { flex: 1; }
    .cabecera { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
    h2 { margin: 0; font: var(--mat-sys-title-medium); }
    .especialidad { color: var(--mat-sys-primary); font-size: 14px; font-weight: 500; }
    p { opacity: .8; }
    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; font-size: 14px; }
    li { display: flex; align-items: center; gap: 8px; }
    li mat-icon { font-size: 18px; width: 18px; height: 18px; opacity: .7; }
  `,
})
export class Equipo {
  protected readonly medicos = MEDICOS;
  protected especialidad(id: string): string {
    return especialidadDe(id)?.nombre ?? '';
  }
  protected dias = diasTexto;
}
