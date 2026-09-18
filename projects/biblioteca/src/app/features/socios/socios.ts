import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { BibliotecaService } from '../../core/biblioteca.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ConfirmarDialog } from '../../core/confirmar.dialog';
import { Socio } from '../../core/models';
import { SocioDialog } from './socio.dialog';

@Component({
  selector: 'app-socios',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatSelectModule,
  ],
  template: `
    <section class="pagina">
      <div class="encabezado">
        <div>
          <h1>Socios</h1>
          <p>{{ filtrados().length }} de {{ servicio.socios().length }} socios.</p>
        </div>
        <div class="acciones">
          <button matButton="outlined" (click)="exportar()" [disabled]="!filtrados().length">
            <mat-icon>download</mat-icon> Exportar CSV
          </button>
          <button matButton="filled" (click)="abrir()">
            <mat-icon>person_add</mat-icon> Nuevo socio
          </button>
        </div>
      </div>

      <div class="acciones">
        <mat-form-field appearance="outline" class="buscador" subscriptSizing="dynamic">
          <mat-label>Buscar por nombre, código o correo</mat-label>
          <input matInput [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Tipo</mat-label>
          <mat-select [value]="tipo()" (valueChange)="tipo.set($event)">
            <mat-option value="">Todos</mat-option>
            <mat-option value="estudiante">Estudiante</mat-option>
            <mat-option value="docente">Docente</mat-option>
            <mat-option value="externo">Externo</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="tabla-contenedor">
        <table mat-table [dataSource]="filtrados()">
          <ng-container matColumnDef="codigo">
            <th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let s"><code>{{ s.codigo }}</code></td>
          </ng-container>
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let s">
              <strong>{{ s.nombre }}</strong>
              <div class="sub">Alta: {{ s.fechaAlta }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="tipo">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let s" class="capitalizar">{{ s.tipo }}</td>
          </ng-container>
          <ng-container matColumnDef="contacto">
            <th mat-header-cell *matHeaderCellDef>Contacto</th>
            <td mat-cell *matCellDef="let s">
              <div>{{ s.email }}</div>
              <div class="sub">{{ s.telefono }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="prestamos">
            <th mat-header-cell *matHeaderCellDef>Activos</th>
            <td mat-cell *matCellDef="let s">{{ activosPorSocio().get(s.id) ?? 0 }} / {{ servicio.configuracion().limitePrestamos }}</td>
          </ng-container>
          <ng-container matColumnDef="activo">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let s">
              <mat-slide-toggle [checked]="s.activo" (change)="cambiarEstado(s, $event.checked)" [matTooltip]="s.activo ? 'Desactivar' : 'Activar'">
                {{ s.activo ? 'Activo' : 'Inactivo' }}
              </mat-slide-toggle>
            </td>
          </ng-container>
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let s" class="col-acciones">
              <button matIconButton matTooltip="Editar" (click)="abrir(s)"><mat-icon>edit</mat-icon></button>
              <button matIconButton matTooltip="Eliminar" (click)="eliminar(s)"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let row; columns: columnas"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="vacio" [attr.colspan]="columnas.length">
              @if (servicio.socios().length === 0) { No hay socios registrados. } @else { Ningún socio coincide con el filtro. }
            </td>
          </tr>
        </table>
      </div>
    </section>
  `,
  styles: `
    .sub { font-size: 12px; opacity: .7; }
    .col-acciones { white-space: nowrap; text-align: right; }
    .capitalizar { text-transform: capitalize; }
    code { font-size: 12px; }
  `,
})
export class Socios {
  protected readonly servicio = inject(BibliotecaService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly dialog = inject(MatDialog);

  protected readonly columnas = ['codigo', 'nombre', 'tipo', 'contacto', 'prestamos', 'activo', 'acciones'];
  protected readonly busqueda = signal('');
  protected readonly tipo = signal('');

  protected readonly activosPorSocio = computed(() => {
    const mapa = new Map<number, number>();
    for (const p of this.servicio.prestamos()) {
      if (p.estado === 'activo') mapa.set(p.socioId, (mapa.get(p.socioId) ?? 0) + 1);
    }
    return mapa;
  });

  protected readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const t = this.tipo();
    return this.servicio.socios().filter(
      (s) =>
        (!q || [s.nombre, s.codigo, s.email].some((v) => v.toLowerCase().includes(q))) &&
        (!t || s.tipo === t),
    );
  });

  protected abrir(socio?: Socio): void {
    this.dialog.open(SocioDialog, { data: socio ?? null, autoFocus: 'first-tabbable' });
  }

  protected async cambiarEstado(socio: Socio, activo: boolean): Promise<void> {
    await this.notificaciones.ejecutar(
      () => this.servicio.cambiarEstadoSocio(socio.id!, activo),
      activo ? 'Socio activado.' : 'Socio desactivado.',
    );
  }

  protected async eliminar(socio: Socio): Promise<void> {
    const ok = await firstValueFrom(this.dialog
      .open(ConfirmarDialog, {
        data: {
          titulo: 'Eliminar socio',
          mensaje: `Se eliminará a ${socio.nombre} (${socio.codigo}) y su historial de préstamos.`,
          textoConfirmar: 'Eliminar',
        },
      })
      .afterClosed());
    if (!ok) return;
    await this.notificaciones.ejecutar(() => this.servicio.eliminarSocio(socio.id!), 'Socio eliminado.');
  }

  protected exportar(): void {
    this.servicio.descargarCSV(
      'socios.csv',
      ['Código', 'Nombre', 'Tipo', 'Correo', 'Teléfono', 'Activo', 'Fecha de alta'],
      this.filtrados().map((s) => [s.codigo, s.nombre, s.tipo, s.email, s.telefono, s.activo ? 'Sí' : 'No', s.fechaAlta]),
    );
  }
}
