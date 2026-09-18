import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { CLINICA } from '../../core/datos-clinica';

@Component({
  selector: 'app-contacto',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatCardModule, MatExpansionModule],
  template: `
    <section class="seccion">
      <h1 class="seccion-titulo">Contacto y ubicación</h1>
      <p class="seccion-sub">Estamos para ayudarte. Para agendar, usa la agenda en línea; para dudas, llámanos o escríbenos.</p>

      <div class="columnas">
        <mat-card appearance="outlined">
          <mat-card-content class="datos">
            <div class="dato"><mat-icon>location_on</mat-icon><div><strong>Dirección</strong><div>{{ clinica.direccion }}</div></div></div>
            <div class="dato"><mat-icon>call</mat-icon><div><strong>Teléfono</strong><div>{{ clinica.telefono }}</div></div></div>
            <div class="dato"><mat-icon>chat</mat-icon><div><strong>WhatsApp</strong><div>{{ clinica.whatsapp }}</div></div></div>
            <div class="dato"><mat-icon>mail</mat-icon><div><strong>Correo</strong><div>{{ clinica.correo }}</div></div></div>
            <div class="dato"><mat-icon>schedule</mat-icon><div><strong>Horario</strong><div>{{ clinica.horarioTexto }}</div></div></div>
            <div class="dato alerta"><mat-icon>emergency</mat-icon><div>{{ clinica.urgenciasTexto }}</div></div>
            <a matButton="filled" routerLink="/agendar"><mat-icon>event_available</mat-icon> Agendar cita en línea</a>
          </mat-card-content>
        </mat-card>

        <div class="mapa" role="img" aria-label="Mapa ilustrativo de la ubicación">
          <mat-icon>map</mat-icon>
          <div>Mapa ilustrativo</div>
          <small>En la versión final se integraría Google Maps o OpenStreetMap con la ubicación real.</small>
        </div>
      </div>

      <h2 class="seccion-titulo faq">Preguntas frecuentes</h2>
      <mat-accordion>
        @for (f of faqs; track f.p) {
          <mat-expansion-panel>
            <mat-expansion-panel-header><mat-panel-title>{{ f.p }}</mat-panel-title></mat-expansion-panel-header>
            <p>{{ f.r }}</p>
          </mat-expansion-panel>
        }
      </mat-accordion>
    </section>
  `,
  styles: `
    .columnas { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
    @media (max-width: 800px) { .columnas { grid-template-columns: 1fr; } }
    .datos { display: grid; gap: 16px; }
    .dato { display: flex; gap: 12px; align-items: flex-start; }
    .dato mat-icon { color: var(--mat-sys-primary); }
    .alerta { padding: 12px; border-radius: 8px; background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container); }
    .alerta mat-icon { color: inherit; }
    .mapa { min-height: 320px; border-radius: 12px; background: repeating-linear-gradient(45deg, var(--mat-sys-surface-container), var(--mat-sys-surface-container) 10px, var(--mat-sys-surface-container-high) 10px, var(--mat-sys-surface-container-high) 20px); display: grid; place-content: center; text-align: center; gap: 4px; padding: 16px; opacity: .9; }
    .mapa mat-icon { font-size: 48px; width: 48px; height: 48px; margin: 0 auto; color: var(--mat-sys-primary); }
    .faq { margin-top: 40px; margin-bottom: 16px; }
  `,
})
export class Contacto {
  protected readonly clinica = CLINICA;
  protected readonly faqs = [
    { p: '¿Necesito crear una cuenta para agendar?', r: 'No. Solo necesitas tu nombre, teléfono y correo. Al terminar recibes un folio para consultar o cancelar tu cita.' },
    { p: '¿Puedo cancelar o cambiar mi cita?', r: 'Sí. Entra a "Mis citas", escribe tu folio y teléfono, y cancela. Después puedes agendar una nueva en el horario que prefieras.' },
    { p: '¿Aceptan seguros de gastos médicos?', r: 'Trabajamos con reembolso: te entregamos factura y receta para que la presentes a tu aseguradora.' },
    { p: '¿Qué debo llevar a mi primera consulta?', r: 'Identificación oficial, estudios previos si los tienes y la lista de medicamentos que tomas actualmente.' },
  ];
}
