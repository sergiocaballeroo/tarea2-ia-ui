import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { BibliotecaService } from '../../core/biblioteca.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { Libro, Socio, sumarDias } from '../../core/models';

function aISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Registro de un nuevo préstamo con búsqueda de socio y libro. */
@Component({
  selector: 'app-prestamo-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Nuevo préstamo</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <mat-dialog-content class="formulario">
        <mat-form-field appearance="outline" class="ancho-completo">
          <mat-label>Socio</mat-label>
          <input matInput formControlName="socio" [matAutocomplete]="autoSocio" placeholder="Nombre o código" />
          <mat-autocomplete #autoSocio [displayWith]="mostrarSocio">
            @for (s of sociosFiltrados(); track s.id) {
              <mat-option [value]="s">
                <strong>{{ s.nombre }}</strong> <small>{{ s.codigo }} · {{ s.tipo }}</small>
              </mat-option>
            }
          </mat-autocomplete>
          <mat-hint>Solo socios activos.</mat-hint>
          @if (form.controls.socio.hasError('objeto') && form.controls.socio.touched) {
            <mat-error>Selecciona un socio de la lista.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="ancho-completo">
          <mat-label>Libro</mat-label>
          <input matInput formControlName="libro" [matAutocomplete]="autoLibro" placeholder="Título, autor o ISBN" />
          <mat-autocomplete #autoLibro [displayWith]="mostrarLibro">
            @for (l of librosFiltrados(); track l.id) {
              <mat-option [value]="l">
                <strong>{{ l.titulo }}</strong> <small>{{ l.autor }} · {{ l.ejemplaresDisponibles }} disp.</small>
              </mat-option>
            }
          </mat-autocomplete>
          <mat-hint>Solo con ejemplares disponibles.</mat-hint>
          @if (form.controls.libro.hasError('objeto') && form.controls.libro.touched) {
            <mat-error>Selecciona un libro de la lista.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha de préstamo</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="fecha" [max]="hoy" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>

        <div class="resumen">
          <mat-icon>event</mat-icon>
          <div>
            <div>Vence el <strong>{{ vencimiento() }}</strong></div>
            <small>{{ servicio.configuracion().diasPrestamo }} días de préstamo. Multa por retraso:
              {{ servicio.configuracion().multaPorDia }} MXN/día.</small>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Cancelar</button>
        <button matButton="filled" type="submit" [disabled]="form.invalid || guardando">Registrar préstamo</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .resumen { display: flex; gap: 8px; align-items: center; padding: 8px 4px; }
    .resumen mat-icon { color: var(--mat-sys-primary); }
    small { opacity: .75; }
  `,
})
export class PrestamoDialog {
  protected readonly servicio = inject(BibliotecaService);
  private readonly ref = inject(MatDialogRef<PrestamoDialog>);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly fb = inject(FormBuilder);

  protected readonly hoy = new Date();
  protected guardando = false;

  private readonly esObjeto = (c: { value: unknown }) =>
    c.value && typeof c.value === 'object' ? null : { objeto: true };

  protected readonly form = this.fb.group({
    socio: this.fb.control<Socio | string>('', [Validators.required, this.esObjeto]),
    libro: this.fb.control<Libro | string>('', [Validators.required, this.esObjeto]),
    fecha: this.fb.control<Date>(new Date(), Validators.required),
  });

  private readonly socioTexto = toSignal(this.form.controls.socio.valueChanges, { initialValue: '' });
  private readonly libroTexto = toSignal(this.form.controls.libro.valueChanges, { initialValue: '' });
  private readonly fecha = toSignal(this.form.controls.fecha.valueChanges, { initialValue: new Date() });

  protected readonly sociosFiltrados = computed(() => {
    const v = this.socioTexto();
    const q = (typeof v === 'string' ? v : '').toLowerCase();
    return this.servicio
      .socios()
      .filter((s) => s.activo && (!q || s.nombre.toLowerCase().includes(q) || s.codigo.toLowerCase().includes(q)))
      .slice(0, 8);
  });

  protected readonly librosFiltrados = computed(() => {
    const v = this.libroTexto();
    const q = (typeof v === 'string' ? v : '').toLowerCase();
    return this.servicio
      .libros()
      .filter(
        (l) =>
          l.ejemplaresDisponibles > 0 &&
          (!q || [l.titulo, l.autor, l.isbn].some((x) => x.toLowerCase().includes(q))),
      )
      .slice(0, 8);
  });

  protected readonly vencimiento = computed(() => {
    const f = this.fecha() ?? new Date();
    return sumarDias(aISO(f), this.servicio.configuracion().diasPrestamo);
  });

  protected mostrarSocio = (s: Socio | string | null): string => (s && typeof s === 'object' ? `${s.nombre} (${s.codigo})` : '');
  protected mostrarLibro = (l: Libro | string | null): string => (l && typeof l === 'object' ? l.titulo : '');

  protected async guardar(): Promise<void> {
    if (this.form.invalid) return;
    const { socio, libro, fecha } = this.form.getRawValue();
    this.guardando = true;
    const id = await this.notificaciones.ejecutar(
      () => this.servicio.prestar((libro as Libro).id!, (socio as Socio).id!, aISO(fecha ?? new Date())),
      'Préstamo registrado.',
    );
    this.guardando = false;
    if (id !== undefined) this.ref.close(id);
  }
}
