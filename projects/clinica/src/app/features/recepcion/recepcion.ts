import { Component, computed, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { CitasService } from '../../core/citas.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { Cita, ESTADOS, EstadoCita, aISO, deISO, estadoVisual, fechaLarga, hoyISO, sumarDias } from '../../core/models';
import { MEDICOS, especialidadDe, medicoDe } from '../../core/datos-clinica';

@Component({
  selector: 'app-recepcion',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTooltipModule,
    MatCardModule,
    MatMenuModule,
  ],
  template: `
    <section class="seccion">
      <div class="encabezado">
        <div>
          <h1 class="seccion-titulo">Panel de recepción</h1>
          <p class="seccion-sub">Agenda del día, confirmaciones y control de asistencia.</p>
        </div>
        <div class="acciones">
          <button matButton="outlined" (click)="exportar()" [disabled]="!filtradas().length"><mat-icon>download</mat-icon> Exportar CSV</button>
          <button matIconButton [matMenuTriggerFor]="menu" matTooltip="Más opciones" aria-label="Más opciones"><mat-icon>more_vert</mat-icon></button>
          <mat-menu #menu="matMenu">
            <button mat-menu-item (click)="demo()"><mat-icon>science</mat-icon> Cargar citas de demostración</button>
            <button mat-menu-item (click)="borrar()"><mat-icon>delete_forever</mat-icon> Borrar todas las citas</button>
          </mat-menu>
        </div>
      </div>

      <div class="aviso-demo">
        <mat-icon>info</mat-icon>
        Vista de demostración. En un despliegue real esta sección requeriría inicio de sesión del personal.
      </div>

      <div class="filtros">
        <div class="navegacion-fecha">
          <button matIconButton (click)="moverDia(-1)" matTooltip="Día anterior"><mat-icon>chevron_left</mat-icon></button>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Fecha</mat-label>
            <input matInput [matDatepicker]="picker" [value]="fechaDate()" (dateChange)="fecha.set(aISO($event.value!))" readonly />
            <mat-datepicker-toggle matIconSuffix [for]="picker" />
            <mat-datepicker #picker />
          </mat-form-field>
          <button matIconButton (click)="moverDia(1)" matTooltip="Día siguiente"><mat-icon>chevron_right</mat-icon></button>
          <button matButton (click)="fecha.set(hoy)">Hoy</button>
        </div>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Médico</mat-label>
          <mat-select [value]="medicoId()" (valueChange)="medicoId.set($event)">
            <mat-option value="">Todos</mat-option>
            @for (m of medicos; track m.id) { <mat-option [value]="m.id">{{ m.nombre }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Estado</mat-label>
          <mat-select [value]="estado()" (valueChange)="estado.set($event)">
            <mat-option value="">Todos</mat-option>
            @for (e of estados; track e.valor) { <mat-option [value]="e.valor">{{ e.texto }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="buscador">
          <mat-label>Buscar paciente o folio</mat-label>
          <input matInput [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>

      <div class="resumen">
        <div class="fecha-larga">{{ fechaLarga(fecha()) }}</div>
        @for (r of resumen(); track r.texto) {
          <span class="chip" [class]="r.clase">{{ r.valor }} {{ r.texto }}</span>
        }
      </div>

      <div class="tabla-contenedor">
        <table mat-table [dataSource]="filtradas()">
          <ng-container matColumnDef="hora">
            <th mat-header-cell *matHeaderCellDef>Hora</th>
            <td mat-cell *matCellDef="let c"><strong>{{ c.hora }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="paciente">
            <th mat-header-cell *matHeaderCellDef>Paciente</th>
            <td mat-cell *matCellDef="let c">
              {{ c.pacienteNombre }} @if (c.primeraVez) { <span class="chip chip-aviso">1a vez</span> }
              <div class="sub">{{ c.pacienteTelefono }} · {{ c.folio }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="medico">
            <th mat-header-cell *matHeaderCellDef>Médico</th>
            <td mat-cell *matCellDef="let c">
              {{ medicoDe(c.medicoId)?.nombre }}
              <div class="sub">{{ especialidadDe(c.especialidadId)?.nombre }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="motivo">
            <th mat-header-cell *matHeaderCellDef>Motivo</th>
            <td mat-cell *matCellDef="let c">
              {{ c.motivo }}
              @if (c.notas) { <div class="sub">Nota: {{ c.notas }}</div> }
            </td>
          </ng-container>
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let c"><span class="chip" [class]="estadoVisual(c.estado).clase">{{ estadoVisual(c.estado).texto }}</span></td>
          </ng-container>
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let c" class="col-acciones">
              @if (c.estado === 'programada') {
                <button matIconButton matTooltip="Confirmar" (click)="cambiar(c, 'confirmada')"><mat-icon>task_alt</mat-icon></button>
              }
              @if (c.estado === 'programada' || c.estado === 'confirmada') {
                <button matIconButton matTooltip="Marcar atendida" (click)="cambiar(c, 'atendida')"><mat-icon>how_to_reg</mat-icon></button>
                <button matIconButton matTooltip="Cancelar" (click)="cancelar(c)"><mat-icon>event_busy</mat-icon></button>
              }
              <button matIconButton matTooltip="Agregar nota" (click)="nota(c)"><mat-icon>edit_note</mat-icon></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let row; columns: columnas" [class.cancelada]="row.estado === 'cancelada'"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="vacio" [attr.colspan]="columnas.length">No hay citas para esta fecha con los filtros seleccionados.</td>
          </tr>
        </table>
      </div>
    </section>
  `,
  styles: `
    .encabezado { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .encabezado .seccion-sub { margin-bottom: 8px; }
    .aviso-demo { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 8px; background: #fff; border: 1px solid #e3e3e3; font-size: 14px; margin-bottom: 16px; }
    .filtros { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
    .navegacion-fecha { display: flex; align-items: center; gap: 4px; }
    .buscador { min-width: 220px; }
    .resumen { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
    .fecha-larga { font-weight: 500; margin-right: 8px; }
    .fecha-larga::first-letter { text-transform: uppercase; }
    .sub { font-size: 12px; opacity: .7; }
    .col-acciones { white-space: nowrap; text-align: right; }
    tr.cancelada td { opacity: .55; }
  `,
})
export class Recepcion {
  protected readonly servicio = inject(CitasService);
  private readonly notificaciones = inject(NotificacionesService);

  protected readonly medicos = MEDICOS;
  protected readonly estados = ESTADOS;
  protected readonly medicoDe = medicoDe;
  protected readonly especialidadDe = especialidadDe;
  protected readonly estadoVisual = estadoVisual;
  protected readonly fechaLarga = fechaLarga;
  protected readonly aISO = aISO;
  protected readonly hoy = hoyISO();
  protected readonly columnas = ['hora', 'paciente', 'medico', 'motivo', 'estado', 'acciones'];

  protected readonly fecha = signal(hoyISO());
  protected readonly medicoId = signal('');
  protected readonly estado = signal<EstadoCita | ''>('');
  protected readonly busqueda = signal('');

  protected readonly fechaDate = computed(() => deISO(this.fecha()));

  protected readonly delDia = computed(() => this.servicio.citas().filter((c) => c.fecha === this.fecha()));

  protected readonly filtradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.delDia()
      .filter((c) => !this.medicoId() || c.medicoId === this.medicoId())
      .filter((c) => !this.estado() || c.estado === this.estado())
      .filter((c) => !q || c.pacienteNombre.toLowerCase().includes(q) || c.folio.toLowerCase().includes(q) || c.pacienteTelefono.includes(q))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  });

  protected readonly resumen = computed(() =>
    ESTADOS.map((e) => ({ ...e, valor: this.delDia().filter((c) => c.estado === e.valor).length })).filter((r) => r.valor > 0),
  );

  protected moverDia(delta: number): void {
    this.fecha.set(sumarDias(this.fecha(), delta));
  }

  protected async cambiar(c: Cita, estado: EstadoCita): Promise<void> {
    await this.notificaciones.ejecutar(() => this.servicio.cambiarEstado(c.id!, estado), `Cita ${c.folio}: ${estadoVisual(estado).texto.toLowerCase()}.`);
  }

  protected async cancelar(c: Cita): Promise<void> {
    const motivo = prompt(`Motivo de cancelación de la cita ${c.folio}:`, 'Cancelada por recepción');
    if (motivo === null) return;
    await this.notificaciones.ejecutar(() => this.servicio.cancelar(c.id!, motivo), 'Cita cancelada.');
  }

  protected async nota(c: Cita): Promise<void> {
    const notas = prompt(`Nota para la cita ${c.folio}:`, c.notas ?? '');
    if (notas === null) return;
    await this.notificaciones.ejecutar(() => this.servicio.guardarNotas(c.id!, notas), 'Nota guardada.');
  }

  protected async demo(): Promise<void> {
    const n = await this.notificaciones.ejecutar(() => this.servicio.cargarDatosDemo());
    if (n !== undefined) this.notificaciones.exito(`${n} citas de demostración cargadas.`);
  }

  protected async borrar(): Promise<void> {
    if (!confirm('Se borrarán todas las citas guardadas en este navegador. ¿Continuar?')) return;
    await this.notificaciones.ejecutar(() => this.servicio.borrarTodo(), 'Citas eliminadas.');
  }

  protected exportar(): void {
    this.servicio.descargarCSV(
      `citas-${this.fecha()}.csv`,
      ['Folio', 'Fecha', 'Hora', 'Paciente', 'Teléfono', 'Correo', 'Médico', 'Especialidad', 'Motivo', 'Primera vez', 'Estado', 'Notas'],
      this.filtradas().map((c) => [
        c.folio, c.fecha, c.hora, c.pacienteNombre, c.pacienteTelefono, c.pacienteEmail,
        medicoDe(c.medicoId)?.nombre ?? '', especialidadDe(c.especialidadId)?.nombre ?? '', c.motivo,
        c.primeraVez ? 'Sí' : 'No', c.estado, c.notas ?? '',
      ]),
    );
  }
}
