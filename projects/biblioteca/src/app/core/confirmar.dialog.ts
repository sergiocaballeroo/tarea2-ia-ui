import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmarData {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
}

/** Diálogo genérico de confirmación. Devuelve true si el usuario confirma. */
@Component({
  selector: 'app-confirmar-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>{{ data.mensaje }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close>Cancelar</button>
      <button matButton="filled" [mat-dialog-close]="true" cdkFocusInitial>
        {{ data.textoConfirmar ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmarDialog {
  readonly data = inject<ConfirmarData>(MAT_DIALOG_DATA);
}
