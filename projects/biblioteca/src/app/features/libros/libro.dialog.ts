import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BibliotecaService } from '../../core/biblioteca.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { CATEGORIAS, Libro } from '../../core/models';

/** Alta y edición de un libro del catálogo. */
@Component({
  selector: 'app-libro-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ libro ? 'Editar libro' : 'Nuevo libro' }}</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <mat-dialog-content class="formulario">
        <mat-form-field appearance="outline" class="ancho-completo">
          <mat-label>Título</mat-label>
          <input matInput formControlName="titulo" maxlength="200" />
          @if (form.controls.titulo.hasError('required')) { <mat-error>El título es obligatorio.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline" class="ancho-completo">
          <mat-label>Autor</mat-label>
          <input matInput formControlName="autor" maxlength="200" />
          @if (form.controls.autor.hasError('required')) { <mat-error>El autor es obligatorio.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>ISBN</mat-label>
          <input matInput formControlName="isbn" placeholder="9780000000000" />
          @if (form.controls.isbn.hasError('required')) { <mat-error>El ISBN es obligatorio.</mat-error> }
          @if (form.controls.isbn.hasError('pattern')) { <mat-error>Usa 10 o 13 dígitos (se permiten guiones).</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Editorial</mat-label>
          <input matInput formControlName="editorial" maxlength="120" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Año</mat-label>
          <input matInput type="number" formControlName="anio" />
          @if (form.controls.anio.invalid) { <mat-error>Año entre 1400 y {{ anioMax }}.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="categoria">
            @for (c of categorias; track c) { <mat-option [value]="c">{{ c }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ejemplares totales</mat-label>
          <input matInput type="number" formControlName="ejemplaresTotales" min="1" />
          @if (form.controls.ejemplaresTotales.invalid) { <mat-error>Debe ser al menos 1.</mat-error> }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Cancelar</button>
        <button matButton="filled" type="submit" [disabled]="form.invalid || guardando">
          {{ libro ? 'Guardar cambios' : 'Registrar libro' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class LibroDialog {
  readonly libro = inject<Libro | null>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<LibroDialog>);
  private readonly servicio = inject(BibliotecaService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly fb = inject(FormBuilder);

  protected readonly categorias = CATEGORIAS;
  protected readonly anioMax = new Date().getFullYear() + 1;
  protected guardando = false;

  protected readonly form = this.fb.nonNullable.group({
    titulo: [this.libro?.titulo ?? '', Validators.required],
    autor: [this.libro?.autor ?? '', Validators.required],
    isbn: [this.libro?.isbn ?? '', [Validators.required, Validators.pattern(/^[\d-]{10,17}$/)]],
    editorial: [this.libro?.editorial ?? ''],
    anio: [this.libro?.anio ?? new Date().getFullYear(), [Validators.required, Validators.min(1400), Validators.max(this.anioMax)]],
    categoria: [this.libro?.categoria ?? 'Otro', Validators.required],
    ejemplaresTotales: [this.libro?.ejemplaresTotales ?? 1, [Validators.required, Validators.min(1)]],
  });

  protected async guardar(): Promise<void> {
    if (this.form.invalid) return;
    this.guardando = true;
    const valores = this.form.getRawValue();
    const libro: Libro = {
      ...valores,
      id: this.libro?.id,
      ejemplaresDisponibles: this.libro?.ejemplaresDisponibles ?? valores.ejemplaresTotales,
    };
    const id = await this.notificaciones.ejecutar(
      () => this.servicio.guardarLibro(libro),
      this.libro ? 'Libro actualizado.' : 'Libro registrado.',
    );
    this.guardando = false;
    if (id !== undefined) this.ref.close(id);
  }
}
