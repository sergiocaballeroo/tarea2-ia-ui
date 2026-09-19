import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BibliotecaService } from '../../core/biblioteca.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { Socio, TipoSocio } from '../../core/models';
import { requeridoSinEspacios } from '../../core/validadores';

/** Alta y edición de socios. El código y la fecha de alta se asignan automáticamente. */
@Component({
  selector: 'app-socio-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ socio ? 'Editar socio ' + socio.codigo : 'Nuevo socio' }}</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <mat-dialog-content class="formulario">
        <mat-form-field appearance="outline" class="ancho-completo">
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="nombre" maxlength="150" />
          @if (form.controls.nombre.hasError('required')) { <mat-error>El nombre es obligatorio.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Correo electrónico</mat-label>
          <input matInput type="email" formControlName="email" />
          @if (form.controls.email.hasError('required')) { <mat-error>El correo es obligatorio.</mat-error> }
          @if (form.controls.email.hasError('email')) { <mat-error>Correo no válido.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Teléfono</mat-label>
          <input matInput type="tel" formControlName="telefono" placeholder="10 dígitos" />
          @if (form.controls.telefono.hasError('pattern')) { <mat-error>Usa 10 dígitos.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Tipo de socio</mat-label>
          <mat-select formControlName="tipo">
            <mat-option value="estudiante">Estudiante</mat-option>
            <mat-option value="docente">Docente</mat-option>
            <mat-option value="externo">Externo</mat-option>
          </mat-select>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Cancelar</button>
        <button matButton="filled" type="submit" [disabled]="form.invalid || guardando">
          {{ socio ? 'Guardar cambios' : 'Registrar socio' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class SocioDialog {
  readonly socio = inject<Socio | null>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<SocioDialog>);
  private readonly servicio = inject(BibliotecaService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly fb = inject(FormBuilder);

  protected guardando = false;

  protected readonly form = this.fb.nonNullable.group({
    nombre: [this.socio?.nombre ?? '', requeridoSinEspacios],
    email: [this.socio?.email ?? '', [Validators.required, Validators.email]],
    telefono: [this.socio?.telefono ?? '', Validators.pattern(/^\d{10}$/)],
    tipo: [(this.socio?.tipo ?? 'estudiante') as TipoSocio, Validators.required],
  });

  protected async guardar(): Promise<void> {
    if (this.form.invalid) return;
    this.guardando = true;
    const socio: Socio = {
      codigo: this.socio?.codigo ?? '',
      activo: this.socio?.activo ?? true,
      fechaAlta: this.socio?.fechaAlta ?? '',
      id: this.socio?.id,
      ...this.form.getRawValue(),
    };
    socio.nombre = socio.nombre.trim();
    socio.email = socio.email.trim();
    const id = await this.notificaciones.ejecutar(
      () => this.servicio.guardarSocio(socio),
      this.socio ? 'Socio actualizado.' : 'Socio registrado.',
    );
    this.guardando = false;
    if (id !== undefined) this.ref.close(id);
  }
}
