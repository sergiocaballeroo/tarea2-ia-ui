import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CitasService } from '../../core/citas.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { Cita, estadoVisual, fechaLarga } from '../../core/models';
import { CLINICA, especialidadDe, medicoDe } from '../../core/datos-clinica';

@Component({
  selector: 'app-mis-citas',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="seccion estrecha">
      <h1 class="seccion-titulo">Mis citas</h1>
      <p class="seccion-sub">Escribe el folio que recibiste al agendar y el teléfono con el que registraste la cita.</p>

      <mat-card appearance="outlined">
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="buscar()" class="formulario">
            <mat-form-field appearance="outline">
              <mat-label>Folio</mat-label>
              <input matInput formControlName="folio" placeholder="CIT-XXXXXX" style="text-transform: uppercase" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Teléfono</mat-label>
              <input matInput formControlName="telefono" type="tel" placeholder="10 dígitos" />
            </mat-form-field>
            <div class="ancho-completo acciones">
              <button matButton="filled" type="submit" [disabled]="form.invalid"><mat-icon>search</mat-icon> Buscar cita</button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      @if (cita(); as c) {
        <mat-card appearance="outlined" class="detalle">
          <mat-card-content>
            <div class="cabecera">
              <div>
                <div class="folio">Folio {{ c.folio }}</div>
                <h2>{{ especialidad(c.especialidadId) }}</h2>
              </div>
              <span class="chip" [class]="estado(c).clase">{{ estado(c).texto }}</span>
            </div>
            <dl>
              <dt>Médico</dt><dd>{{ medico(c.medicoId) }}</dd>
              <dt>Fecha</dt><dd>{{ fecha(c.fecha) }}</dd>
              <dt>Hora</dt><dd>{{ c.hora }} h</dd>
              <dt>Paciente</dt><dd>{{ c.pacienteNombre }}</dd>
              <dt>Motivo</dt><dd>{{ c.motivo }}</dd>
              <dt>Lugar</dt><dd>{{ clinica.direccion }}</dd>
              @if (c.notas) { <dt>Notas</dt><dd>{{ c.notas }}</dd> }
            </dl>
            <div class="acciones">
              @if (c.estado === 'programada' || c.estado === 'confirmada') {
                <button matButton="outlined" (click)="servicio.descargarICS(c)"><mat-icon>calendar_add_on</mat-icon> Agregar al calendario</button>
                <button matButton="outlined" class="texto-error" (click)="cancelar(c)"><mat-icon>event_busy</mat-icon> Cancelar cita</button>
              } @else {
                <a matButton="filled" routerLink="/agendar"><mat-icon>event_available</mat-icon> Agendar nueva cita</a>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </section>
  `,
  styles: `
    .estrecha { max-width: 760px; }
    .detalle { margin-top: 16px; }
    .cabecera { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .folio { font-size: 13px; opacity: .7; letter-spacing: .5px; }
    h2 { margin: 4px 0 12px; font: var(--mat-sys-title-large); }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; margin: 0 0 16px; }
    dt { opacity: .7; } dd { margin: 0; }
  `,
})
export class MisCitas {
  protected readonly servicio = inject(CitasService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly fb = inject(FormBuilder);

  protected readonly clinica = CLINICA;
  protected readonly cita = signal<Cita | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    folio: ['', Validators.required],
    telefono: ['', [Validators.required, Validators.pattern(/^[\d\s-]{10,14}$/)]],
  });

  protected async buscar(): Promise<void> {
    const { folio, telefono } = this.form.getRawValue();
    const cita = await this.notificaciones.ejecutar(() => this.servicio.buscar(folio, telefono));
    this.cita.set(cita ?? null);
  }

  protected async cancelar(c: Cita): Promise<void> {
    if (!confirm(`¿Cancelar la cita ${c.folio} del ${c.fecha} a las ${c.hora}?`)) return;
    const ok = await this.notificaciones.ejecutar(() => this.servicio.cancelar(c.id!), 'Tu cita fue cancelada.');
    if (ok !== undefined) this.cita.set({ ...c, estado: 'cancelada' });
  }

  protected especialidad = (id: string) => especialidadDe(id)?.nombre ?? '';
  protected medico = (id: string) => medicoDe(id)?.nombre ?? '';
  protected estado = (c: Cita) => estadoVisual(c.estado);
  protected fecha = fechaLarga;
}
