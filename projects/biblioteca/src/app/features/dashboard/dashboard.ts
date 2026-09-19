import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { BibliotecaService } from '../../core/biblioteca.service';
import { EstadoPrestamoPipe } from '../prestamos/estado-prestamo.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatTableModule, EstadoPrestamoPipe],
  template: `
    <section class="pagina">
      <div class="encabezado">
        <div>
          <h1>Inicio</h1>
          <p>Resumen del estado de la biblioteca.</p>
        </div>
        <div class="acciones">
          <a matButton="filled" routerLink="/prestamos" [queryParams]="{ nuevo: 1 }">
            <mat-icon>add</mat-icon> Nuevo préstamo
          </a>
        </div>
      </div>

      @if (servicio.libros().length === 0) {
        <mat-card appearance="outlined">
          <mat-card-content class="bienvenida">
            <mat-icon>lightbulb</mat-icon>
            <div>
              <strong>La biblioteca está vacía.</strong>
              Registra libros y socios, o carga los datos de demostración desde
              <a routerLink="/ajustes">Ajustes</a> para explorar la aplicación.
            </div>
          </mat-card-content>
        </mat-card>
      }

      <div class="tarjetas">
        @for (t of tarjetas(); track t.texto) {
          <mat-card appearance="outlined" [routerLink]="t.ruta" class="tarjeta">
            <mat-card-content>
              <mat-icon [class]="t.clase">{{ t.icono }}</mat-icon>
              <div class="valor">{{ t.valor }}</div>
              <div class="texto">{{ t.texto }}</div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      <div class="encabezado">
        <h2>Últimos movimientos</h2>
        <a matButton routerLink="/prestamos">Ver todos</a>
      </div>
      <div class="tabla-contenedor">
        <table mat-table [dataSource]="recientes()">
          <ng-container matColumnDef="libro">
            <th mat-header-cell *matHeaderCellDef>Libro</th>
            <td mat-cell *matCellDef="let p">{{ p.libroTitulo }}</td>
          </ng-container>
          <ng-container matColumnDef="socio">
            <th mat-header-cell *matHeaderCellDef>Socio</th>
            <td mat-cell *matCellDef="let p">{{ p.socioNombre }}</td>
          </ng-container>
          <ng-container matColumnDef="fechaPrestamo">
            <th mat-header-cell *matHeaderCellDef>Préstamo</th>
            <td mat-cell *matCellDef="let p">{{ p.fechaPrestamo }}</td>
          </ng-container>
          <ng-container matColumnDef="fechaVencimiento">
            <th mat-header-cell *matHeaderCellDef>Vence</th>
            <td mat-cell *matCellDef="let p">{{ p.fechaVencimiento }}</td>
          </ng-container>
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let p">
              <span class="chip" [class]="(p | estadoPrestamo).clase">{{ (p | estadoPrestamo).texto }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="multa">
            <th mat-header-cell *matHeaderCellDef>Multa</th>
            <td mat-cell *matCellDef="let p">{{ p.multaEstimada | currency: 'MXN' : 'symbol-narrow' }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let row; columns: columnas"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="vacio" [attr.colspan]="columnas.length">Sin movimientos registrados.</td>
          </tr>
        </table>
      </div>
    </section>
  `,
  styles: `
    h2 { margin: 8px 0 0; font: var(--mat-sys-title-large); }
    .tarjeta { cursor: pointer; }
    .tarjeta:hover { border-color: var(--mat-sys-primary); }
    .tarjeta mat-card-content { display: grid; gap: 4px; }
    .tarjeta mat-icon { font-size: 22px; width: 22px; height: 22px; color: #6f6f6f; }
    .tarjeta mat-icon.alerta { color: var(--mat-sys-error); }
    .valor { font: var(--mat-sys-headline-medium); font-weight: 500; }
    .texto { opacity: .75; }
    .bienvenida { display: flex; gap: 12px; align-items: center; }
    .bienvenida mat-icon { color: var(--mat-sys-tertiary); }
  `,
})
export class Dashboard {
  protected readonly servicio = inject(BibliotecaService);
  protected readonly columnas = ['libro', 'socio', 'fechaPrestamo', 'fechaVencimiento', 'estado', 'multa'];

  protected readonly recientes = computed(() => this.servicio.prestamos().slice(0, 6));

  protected readonly tarjetas = computed(() => {
    const libros = this.servicio.libros();
    const prestamos = this.servicio.prestamos();
    const activos = prestamos.filter((p) => p.estado === 'activo');
    const vencidos = activos.filter((p) => p.diasRetraso > 0);
    return [
      { icono: 'menu_book', valor: libros.length, texto: 'Títulos en catálogo', ruta: '/libros', clase: '' },
      {
        icono: 'inventory_2',
        valor: libros.reduce((s, l) => s + l.ejemplaresDisponibles, 0),
        texto: 'Ejemplares disponibles',
        ruta: '/libros',
        clase: '',
      },
      {
        icono: 'group',
        valor: this.servicio.socios().filter((s) => s.activo).length,
        texto: 'Socios activos',
        ruta: '/socios',
        clase: '',
      },
      { icono: 'swap_horiz', valor: activos.length, texto: 'Préstamos activos', ruta: '/prestamos', clase: '' },
      { icono: 'warning', valor: vencidos.length, texto: 'Préstamos vencidos', ruta: '/vencidos', clase: vencidos.length ? 'alerta' : '' },
    ];
  });
}
