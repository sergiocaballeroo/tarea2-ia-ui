import { Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BibliotecaService } from '../../core/biblioteca.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ConfirmarDialog } from '../../core/confirmar.dialog';
import { entero, requeridoSinEspacios } from '../../core/validadores';

@Component({
  selector: 'app-ajustes',
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="pagina">
      <div class="encabezado">
        <div>
          <h1>Ajustes</h1>
          <p>Reglas de préstamo y administración de los datos locales.</p>
        </div>
      </div>

      <mat-card appearance="outlined">
        <mat-card-header><mat-card-title>Reglas de préstamo</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" class="formulario" (ngSubmit)="guardar()">
            <mat-form-field appearance="outline" class="ancho-completo">
              <mat-label>Nombre de la biblioteca</mat-label>
              <input matInput formControlName="nombreBiblioteca" maxlength="80" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Días de préstamo</mat-label>
              <input matInput type="number" formControlName="diasPrestamo" min="1" step="1" />
              @if (form.controls.diasPrestamo.invalid) { <mat-error>Entero mayor o igual a 1.</mat-error> }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Límite de préstamos por socio</mat-label>
              <input matInput type="number" formControlName="limitePrestamos" min="1" step="1" />
              @if (form.controls.limitePrestamos.invalid) { <mat-error>Entero mayor o igual a 1.</mat-error> }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Multa por día de retraso (MXN)</mat-label>
              <input matInput type="number" formControlName="multaPorDia" min="0" step="0.5" />
              @if (form.controls.multaPorDia.invalid) { <mat-error>Debe ser 0 o mayor.</mat-error> }
            </mat-form-field>
            <div class="ancho-completo acciones">
              <button matButton="filled" type="submit" [disabled]="form.invalid || form.pristine">Guardar reglas</button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined">
        <mat-card-header><mat-card-title>Datos</mat-card-title></mat-card-header>
        <mat-card-content>
          <p>
            La información se guarda en IndexedDB, dentro del navegador de este equipo. No se envía a ningún servidor.
            Usa el respaldo para moverla a otro equipo.
          </p>
          <div class="acciones">
            <button matButton="tonal" (click)="demo()"><mat-icon>science</mat-icon> Cargar datos de demostración</button>
            <button matButton="outlined" (click)="servicio.exportarRespaldo()"><mat-icon>backup</mat-icon> Exportar respaldo (JSON)</button>
            <button matButton="outlined" (click)="archivo.click()"><mat-icon>restore</mat-icon> Importar respaldo</button>
            <input #archivo type="file" accept="application/json" hidden (change)="importar($any($event.target).files?.[0])" />
            <button matButton (click)="borrar()" class="texto-error"><mat-icon>delete_forever</mat-icon> Borrar todo</button>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined">
        <mat-card-header><mat-card-title>Acerca de</mat-card-title></mat-card-header>
        <mat-card-content>
          <p>
            Sistema de gestión de préstamos de biblioteca. Aplicación web progresiva (PWA) construida con Angular y
            Angular Material, instalable como aplicación de escritorio en Windows, macOS y Linux desde Chrome o Edge.
          </p>
          <p class="sub">Generada con asistencia de Claude Code como parte de la Tarea 2: Herramientas de IA para el desarrollo de interfaces de usuario.</p>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: `
    mat-card-content { padding-top: 8px; }
    .sub { font-size: 12px; opacity: .7; }
  `,
})
export class Ajustes {
  protected readonly servicio = inject(BibliotecaService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    nombreBiblioteca: ['', requeridoSinEspacios],
    diasPrestamo: [14, [Validators.required, entero, Validators.min(1)]],
    limitePrestamos: [3, [Validators.required, entero, Validators.min(1)]],
    multaPorDia: [10, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    // Sincroniza el formulario cuando cambia la configuración guardada.
    effect(() => {
      const c = this.servicio.configuracion();
      this.form.reset({
        nombreBiblioteca: c.nombreBiblioteca,
        diasPrestamo: c.diasPrestamo,
        limitePrestamos: c.limitePrestamos,
        multaPorDia: c.multaPorDia,
      });
    });
  }

  protected async guardar(): Promise<void> {
    await this.notificaciones.ejecutar(
      () => this.servicio.guardarConfiguracion({ id: 1, ...this.form.getRawValue() }),
      'Reglas guardadas.',
    );
  }

  protected async demo(): Promise<void> {
    await this.notificaciones.ejecutar(() => this.servicio.cargarDatosDemo(), 'Datos de demostración cargados.');
  }

  protected async importar(archivo?: File): Promise<void> {
    if (!archivo) return;
    const ok = await this.confirmar('Importar respaldo', 'Se reemplazarán todos los datos actuales por los del archivo.', 'Importar');
    if (!ok) return;
    await this.notificaciones.ejecutar(() => this.servicio.importarRespaldo(archivo), 'Respaldo importado.');
  }

  protected async borrar(): Promise<void> {
    const ok = await this.confirmar('Borrar todo', 'Se eliminarán libros, socios, préstamos y reglas. Esta acción no se puede deshacer.', 'Borrar todo');
    if (!ok) return;
    await this.notificaciones.ejecutar(() => this.servicio.borrarTodo(), 'Datos eliminados.');
  }

  private confirmar(titulo: string, mensaje: string, textoConfirmar: string): Promise<boolean> {
    return firstValueFrom(this.dialog.open(ConfirmarDialog, { data: { titulo, mensaje, textoConfirmar } }).afterClosed());
  }
}
