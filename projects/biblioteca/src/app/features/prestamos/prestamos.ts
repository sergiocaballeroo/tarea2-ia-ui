import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { BibliotecaService } from '../../core/biblioteca.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ConfirmarDialog } from '../../core/confirmar.dialog';
import { PrestamoDetalle } from '../../core/models';
import { EstadoPrestamoPipe } from './estado-prestamo.pipe';
import { PrestamoDialog } from './prestamo.dialog';

type Filtro = 'activos' | 'devueltos' | 'todos';

@Component({
  selector: 'app-prestamos',
  imports: [
    CurrencyPipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatButtonToggleModule,
    EstadoPrestamoPipe,
  ],
  template: `
    <section class="pagina">
      <div class="encabezado">
        <div>
          <h1>Préstamos</h1>
          <p>Registra préstamos, devoluciones y renovaciones.</p>
        </div>
        <div class="acciones">
          <button matButton="outlined" (click)="exportar()" [disabled]="!filtrados().length">
            <mat-icon>download</mat-icon> Exportar CSV
          </button>
          <button matButton="filled" (click)="nuevo()">
            <mat-icon>add</mat-icon> Nuevo préstamo
          </button>
        </div>
      </div>

      <div class="acciones">
        <mat-form-field appearance="outline" class="buscador" subscriptSizing="dynamic">
          <mat-label>Buscar por libro o socio</mat-label>
          <input matInput [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-button-toggle-group [value]="filtro()" (change)="filtro.set($event.value)" aria-label="Filtro de estado">
          <mat-button-toggle value="activos">Activos</mat-button-toggle>
          <mat-button-toggle value="devueltos">Devueltos</mat-button-toggle>
          <mat-button-toggle value="todos">Todos</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <div class="tabla-contenedor">
        <table mat-table [dataSource]="filtrados()">
          <ng-container matColumnDef="libro">
            <th mat-header-cell *matHeaderCellDef>Libro</th>
            <td mat-cell *matCellDef="let p">
              <strong>{{ p.libroTitulo }}</strong>
              <div class="sub">{{ p.libroIsbn }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="socio">
            <th mat-header-cell *matHeaderCellDef>Socio</th>
            <td mat-cell *matCellDef="let p">
              {{ p.socioNombre }}
              <div class="sub">{{ p.socioCodigo }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="fechaPrestamo">
            <th mat-header-cell *matHeaderCellDef>Préstamo</th>
            <td mat-cell *matCellDef="let p">{{ p.fechaPrestamo }}</td>
          </ng-container>
          <ng-container matColumnDef="fechaVencimiento">
            <th mat-header-cell *matHeaderCellDef>Vence</th>
            <td mat-cell *matCellDef="let p">
              {{ p.fechaVencimiento }}
              @if (p.fechaDevolucion) { <div class="sub">Devuelto: {{ p.fechaDevolucion }}</div> }
            </td>
          </ng-container>
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let p">
              <span class="chip" [class]="(p | estadoPrestamo).clase">{{ (p | estadoPrestamo).texto }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="multa">
            <th mat-header-cell *matHeaderCellDef>Multa</th>
            <td mat-cell *matCellDef="let p" [class.texto-error]="p.multaEstimada > 0">
              {{ p.multaEstimada | currency: 'MXN' : 'symbol-narrow' }}
            </td>
          </ng-container>
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p" class="col-acciones">
              @if (p.estado === 'activo') {
                <button matIconButton matTooltip="Renovar" (click)="renovar(p)" [disabled]="p.diasRetraso > 0">
                  <mat-icon>update</mat-icon>
                </button>
                <button matButton="tonal" (click)="devolver(p)">
                  <mat-icon>assignment_return</mat-icon> Devolver
                </button>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let row; columns: columnas"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="vacio" [attr.colspan]="columnas.length">No hay préstamos que mostrar.</td>
          </tr>
        </table>
      </div>
    </section>
  `,
  styles: `
    .sub { font-size: 12px; opacity: .7; }
    .col-acciones { white-space: nowrap; text-align: right; }
  `,
})
export class Prestamos {
  protected readonly servicio = inject(BibliotecaService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly dialog = inject(MatDialog);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly columnas = ['libro', 'socio', 'fechaPrestamo', 'fechaVencimiento', 'estado', 'multa', 'acciones'];
  protected readonly busqueda = signal('');
  protected readonly filtro = signal<Filtro>('activos');

  protected readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const f = this.filtro();
    return this.servicio.prestamos().filter((p) => {
      const porEstado = f === 'todos' || (f === 'activos' ? p.estado === 'activo' : p.estado === 'devuelto');
      const porTexto =
        !q || [p.libroTitulo, p.socioNombre, p.socioCodigo, p.libroIsbn].some((v) => v.toLowerCase().includes(q));
      return porEstado && porTexto;
    });
  });

  constructor() {
    // Permite abrir el diálogo directamente desde el botón del inicio (/prestamos?nuevo=1).
    if (this.ruta.snapshot.queryParamMap.has('nuevo')) {
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
      setTimeout(() => this.nuevo());
    }
  }

  protected nuevo(): void {
    this.dialog.open(PrestamoDialog, { autoFocus: 'first-tabbable' });
  }

  protected async devolver(p: PrestamoDetalle): Promise<void> {
    const multaTexto = p.multaEstimada > 0 ? ` Se cobrará una multa de $${p.multaEstimada.toFixed(2)} MXN por ${p.diasRetraso} día(s) de retraso.` : '';
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmarDialog, {
          data: {
            titulo: 'Registrar devolución',
            mensaje: `"${p.libroTitulo}" prestado a ${p.socioNombre}.${multaTexto}`,
            textoConfirmar: 'Registrar devolución',
          },
        })
        .afterClosed(),
    );
    if (!ok) return;
    const multa = await this.notificaciones.ejecutar(() => this.servicio.devolver(p.id!));
    if (multa !== undefined) {
      this.notificaciones.exito(multa > 0 ? `Devolución registrada. Multa: $${multa.toFixed(2)} MXN.` : 'Devolución registrada sin multa.');
    }
  }

  protected async renovar(p: PrestamoDetalle): Promise<void> {
    const nueva = await this.notificaciones.ejecutar(() => this.servicio.renovar(p.id!));
    if (nueva) this.notificaciones.exito(`Préstamo renovado. Nueva fecha de vencimiento: ${nueva}.`);
  }

  protected exportar(): void {
    this.servicio.descargarCSV(
      'prestamos.csv',
      ['Libro', 'ISBN', 'Socio', 'Código', 'Fecha préstamo', 'Vencimiento', 'Devolución', 'Estado', 'Días de retraso', 'Multa MXN'],
      this.filtrados().map((p) => [
        p.libroTitulo, p.libroIsbn, p.socioNombre, p.socioCodigo, p.fechaPrestamo, p.fechaVencimiento,
        p.fechaDevolucion ?? '', p.estado, p.diasRetraso, p.multaEstimada,
      ]),
    );
  }
}
