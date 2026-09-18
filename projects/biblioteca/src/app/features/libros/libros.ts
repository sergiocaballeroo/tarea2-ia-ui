import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { BibliotecaService } from '../../core/biblioteca.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ConfirmarDialog } from '../../core/confirmar.dialog';
import { CATEGORIAS, Libro } from '../../core/models';
import { LibroDialog } from './libro.dialog';

@Component({
  selector: 'app-libros',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatSelectModule,
  ],
  template: `
    <section class="pagina">
      <div class="encabezado">
        <div>
          <h1>Catálogo de libros</h1>
          <p>{{ filtrados().length }} de {{ servicio.libros().length }} títulos.</p>
        </div>
        <div class="acciones">
          <button matButton="outlined" (click)="exportar()" [disabled]="!filtrados().length">
            <mat-icon>download</mat-icon> Exportar CSV
          </button>
          <button matButton="filled" (click)="abrir()">
            <mat-icon>add</mat-icon> Nuevo libro
          </button>
        </div>
      </div>

      <div class="acciones">
        <mat-form-field appearance="outline" class="buscador" subscriptSizing="dynamic">
          <mat-label>Buscar por título, autor o ISBN</mat-label>
          <input matInput [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Categoría</mat-label>
          <mat-select [value]="categoria()" (valueChange)="categoria.set($event)">
            <mat-option value="">Todas</mat-option>
            @for (c of categorias; track c) {
              <mat-option [value]="c">{{ c }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Disponibilidad</mat-label>
          <mat-select [value]="disponibilidad()" (valueChange)="disponibilidad.set($event)">
            <mat-option value="">Todos</mat-option>
            <mat-option value="disponibles">Con ejemplares disponibles</mat-option>
            <mat-option value="agotados">Sin ejemplares disponibles</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="tabla-contenedor">
        <table mat-table [dataSource]="filtrados()">
          <ng-container matColumnDef="isbn">
            <th mat-header-cell *matHeaderCellDef>ISBN</th>
            <td mat-cell *matCellDef="let l"><code>{{ l.isbn }}</code></td>
          </ng-container>
          <ng-container matColumnDef="titulo">
            <th mat-header-cell *matHeaderCellDef>Título</th>
            <td mat-cell *matCellDef="let l">
              <strong>{{ l.titulo }}</strong>
              <div class="sub">{{ l.editorial }}, {{ l.anio }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="autor">
            <th mat-header-cell *matHeaderCellDef>Autor</th>
            <td mat-cell *matCellDef="let l">{{ l.autor }}</td>
          </ng-container>
          <ng-container matColumnDef="categoria">
            <th mat-header-cell *matHeaderCellDef>Categoría</th>
            <td mat-cell *matCellDef="let l">{{ l.categoria }}</td>
          </ng-container>
          <ng-container matColumnDef="ejemplares">
            <th mat-header-cell *matHeaderCellDef>Disponibles</th>
            <td mat-cell *matCellDef="let l">
              <span class="chip" [class.chip-ok]="l.ejemplaresDisponibles > 0" [class.chip-error]="l.ejemplaresDisponibles === 0">
                {{ l.ejemplaresDisponibles }} / {{ l.ejemplaresTotales }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let l" class="col-acciones">
              <button matIconButton matTooltip="Editar" (click)="abrir(l)"><mat-icon>edit</mat-icon></button>
              <button matIconButton matTooltip="Eliminar" (click)="eliminar(l)"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let row; columns: columnas"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="vacio" [attr.colspan]="columnas.length">
              @if (servicio.libros().length === 0) { No hay libros registrados. } @else { Ningún libro coincide con el filtro. }
            </td>
          </tr>
        </table>
      </div>
    </section>
  `,
  styles: `
    .sub { font-size: 12px; opacity: .7; }
    .col-acciones { white-space: nowrap; text-align: right; }
    code { font-size: 12px; }
  `,
})
export class Libros {
  protected readonly servicio = inject(BibliotecaService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly dialog = inject(MatDialog);

  protected readonly categorias = CATEGORIAS;
  protected readonly columnas = ['isbn', 'titulo', 'autor', 'categoria', 'ejemplares', 'acciones'];

  protected readonly busqueda = signal('');
  protected readonly categoria = signal('');
  protected readonly disponibilidad = signal('');

  protected readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const cat = this.categoria();
    const disp = this.disponibilidad();
    return this.servicio.libros().filter((l) => {
      const coincide =
        !q || [l.titulo, l.autor, l.isbn, l.editorial].some((v) => v.toLowerCase().includes(q));
      const coincideCat = !cat || l.categoria === cat;
      const coincideDisp =
        !disp ||
        (disp === 'disponibles' && l.ejemplaresDisponibles > 0) ||
        (disp === 'agotados' && l.ejemplaresDisponibles === 0);
      return coincide && coincideCat && coincideDisp;
    });
  });

  protected abrir(libro?: Libro): void {
    this.dialog.open(LibroDialog, { data: libro ?? null, autoFocus: 'first-tabbable' });
  }

  protected async eliminar(libro: Libro): Promise<void> {
    const ok = await firstValueFrom(this.dialog
      .open(ConfirmarDialog, {
        data: {
          titulo: 'Eliminar libro',
          mensaje: `Se eliminará "${libro.titulo}" y su historial de préstamos. Esta acción no se puede deshacer.`,
          textoConfirmar: 'Eliminar',
        },
      })
      .afterClosed());
    if (!ok) return;
    await this.notificaciones.ejecutar(() => this.servicio.eliminarLibro(libro.id!), 'Libro eliminado.');
  }

  protected exportar(): void {
    this.servicio.descargarCSV(
      'catalogo-libros.csv',
      ['ISBN', 'Título', 'Autor', 'Editorial', 'Año', 'Categoría', 'Ejemplares totales', 'Disponibles'],
      this.filtrados().map((l) => [
        l.isbn, l.titulo, l.autor, l.editorial, l.anio, l.categoria, l.ejemplaresTotales, l.ejemplaresDisponibles,
      ]),
    );
  }
}
