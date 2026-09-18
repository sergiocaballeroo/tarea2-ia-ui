import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { BibliotecaService } from '../../core/biblioteca.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ConfirmarDialog } from '../../core/confirmar.dialog';
import { PrestamoDetalle } from '../../core/models';

@Component({
  selector: 'app-vencidos',
  imports: [CurrencyPipe, MatTableModule, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <section class="pagina">
      <div class="encabezado">
        <div>
          <h1>Préstamos vencidos</h1>
          <p>Préstamos activos cuya fecha de vencimiento ya pasó.</p>
        </div>
        <div class="acciones">
          <button matButton="outlined" (click)="exportar()" [disabled]="!vencidos().length">
            <mat-icon>download</mat-icon> Exportar CSV
          </button>
        </div>
      </div>

      <div class="tarjetas">
        <mat-card appearance="outlined"><mat-card-content>
          <div class="valor">{{ vencidos().length }}</div>
          <div class="texto">Préstamos vencidos</div>
        </mat-card-content></mat-card>
        <mat-card appearance="outlined"><mat-card-content>
          <div class="valor">{{ sociosAfectados() }}</div>
          <div class="texto">Socios con retraso</div>
        </mat-card-content></mat-card>
        <mat-card appearance="outlined"><mat-card-content>
          <div class="valor texto-error">{{ totalMultas() | currency: 'MXN' : 'symbol-narrow' }}</div>
          <div class="texto">Multas acumuladas a hoy</div>
        </mat-card-content></mat-card>
      </div>

      <div class="tabla-contenedor">
        <table mat-table [dataSource]="vencidos()">
          <ng-container matColumnDef="socio">
            <th mat-header-cell *matHeaderCellDef>Socio</th>
            <td mat-cell *matCellDef="let p">
              <strong>{{ p.socioNombre }}</strong>
              <div class="sub">{{ p.socioCodigo }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="libro">
            <th mat-header-cell *matHeaderCellDef>Libro</th>
            <td mat-cell *matCellDef="let p">{{ p.libroTitulo }}</td>
          </ng-container>
          <ng-container matColumnDef="fechaVencimiento">
            <th mat-header-cell *matHeaderCellDef>Venció</th>
            <td mat-cell *matCellDef="let p">{{ p.fechaVencimiento }}</td>
          </ng-container>
          <ng-container matColumnDef="dias">
            <th mat-header-cell *matHeaderCellDef>Días de retraso</th>
            <td mat-cell *matCellDef="let p"><span class="chip chip-error">{{ p.diasRetraso }}</span></td>
          </ng-container>
          <ng-container matColumnDef="multa">
            <th mat-header-cell *matHeaderCellDef>Multa a hoy</th>
            <td mat-cell *matCellDef="let p" class="texto-error">{{ p.multaEstimada | currency: 'MXN' : 'symbol-narrow' }}</td>
          </ng-container>
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p" class="col-acciones">
              <button matButton="tonal" (click)="devolver(p)"><mat-icon>assignment_return</mat-icon> Devolver</button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let row; columns: columnas"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="vacio" [attr.colspan]="columnas.length">No hay préstamos vencidos. Todo al corriente.</td>
          </tr>
        </table>
      </div>
    </section>
  `,
  styles: `
    .sub { font-size: 12px; opacity: .7; }
    .col-acciones { white-space: nowrap; text-align: right; }
    .valor { font: var(--mat-sys-headline-medium); font-weight: 600; }
    .texto { opacity: .75; }
  `,
})
export class Vencidos {
  protected readonly servicio = inject(BibliotecaService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly dialog = inject(MatDialog);

  protected readonly columnas = ['socio', 'libro', 'fechaVencimiento', 'dias', 'multa', 'acciones'];

  protected readonly vencidos = computed(() =>
    this.servicio
      .prestamos()
      .filter((p) => p.estado === 'activo' && p.diasRetraso > 0)
      .sort((a, b) => b.diasRetraso - a.diasRetraso),
  );
  protected readonly sociosAfectados = computed(() => new Set(this.vencidos().map((p) => p.socioId)).size);
  protected readonly totalMultas = computed(() => this.vencidos().reduce((s, p) => s + p.multaEstimada, 0));

  protected async devolver(p: PrestamoDetalle): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open(ConfirmarDialog, {
          data: {
            titulo: 'Registrar devolución',
            mensaje: `"${p.libroTitulo}" prestado a ${p.socioNombre}. Se cobrará una multa de $${p.multaEstimada.toFixed(2)} MXN por ${p.diasRetraso} día(s) de retraso.`,
            textoConfirmar: 'Registrar devolución',
          },
        })
        .afterClosed(),
    );
    if (!ok) return;
    const multa = await this.notificaciones.ejecutar(() => this.servicio.devolver(p.id!));
    if (multa !== undefined) this.notificaciones.exito(`Devolución registrada. Multa: $${multa.toFixed(2)} MXN.`);
  }

  protected exportar(): void {
    this.servicio.descargarCSV(
      'prestamos-vencidos.csv',
      ['Socio', 'Código', 'Libro', 'ISBN', 'Fecha préstamo', 'Vencimiento', 'Días de retraso', 'Multa MXN'],
      this.vencidos().map((p) => [
        p.socioNombre, p.socioCodigo, p.libroTitulo, p.libroIsbn, p.fechaPrestamo, p.fechaVencimiento, p.diasRetraso, p.multaEstimada,
      ]),
    );
  }
}
