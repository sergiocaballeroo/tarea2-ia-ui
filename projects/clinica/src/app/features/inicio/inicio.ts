import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { CLINICA, ESPECIALIDADES } from '../../core/datos-clinica';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <section class="hero">
      <div class="hero-interna">
        <div class="hero-texto">
          <span class="etiqueta">Consultorio multiespecialidad</span>
          <h1>{{ clinica.eslogan }}</h1>
          <p>{{ clinica.descripcion }}</p>
          <div class="acciones">
            <a matButton="filled" routerLink="/agendar"><mat-icon>event_available</mat-icon> Agendar cita</a>
            <a matButton="outlined" routerLink="/mis-citas"><mat-icon>search</mat-icon> Consultar mi cita</a>
          </div>
          <div class="datos">
            <span><mat-icon>schedule</mat-icon> {{ clinica.horarioTexto }}</span>
            <span><mat-icon>call</mat-icon> {{ clinica.telefono }}</span>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="burbuja b1"><mat-icon>stethoscope</mat-icon></div>
          <div class="burbuja b2"><mat-icon>dentistry</mat-icon></div>
          <div class="burbuja b3"><mat-icon>child_care</mat-icon></div>
          <div class="burbuja b4"><mat-icon>nutrition</mat-icon></div>
          <div class="burbuja b5"><mat-icon>favorite</mat-icon></div>
        </div>
      </div>
    </section>

    <section class="seccion">
      <h2 class="seccion-titulo">Nuestros servicios</h2>
      <p class="seccion-sub">Elige la especialidad y agenda con el médico de tu preferencia.</p>
      <div class="tarjetas">
        @for (e of especialidades; track e.id) {
          <mat-card appearance="outlined" class="servicio">
            <mat-card-content>
              <mat-icon class="icono">{{ e.icono }}</mat-icon>
              <h3>{{ e.nombre }}</h3>
              <p>{{ e.descripcion }}</p>
            </mat-card-content>
            <mat-card-actions>
              <a matButton routerLink="/agendar" [queryParams]="{ especialidad: e.id }">Agendar</a>
            </mat-card-actions>
          </mat-card>
        }
      </div>
    </section>

    <section class="seccion pasos">
      <h2 class="seccion-titulo">¿Cómo funciona?</h2>
      <div class="tarjetas">
        @for (p of pasos; track p.n) {
          <div class="paso">
            <div class="numero">{{ p.n }}</div>
            <h3>{{ p.titulo }}</h3>
            <p>{{ p.texto }}</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .hero { background: #fff; border-bottom: 1px solid #e3e3e3; }
    .hero-interna { max-width: 1200px; margin: 0 auto; padding: 56px 16px; display: grid; gap: 32px; grid-template-columns: 1.2fr 1fr; align-items: center; }
    @media (max-width: 800px) { .hero-interna { grid-template-columns: 1fr; } .hero-visual { display: none; } }
    .etiqueta { display: inline-block; padding: 3px 10px; border-radius: 6px; background: #e8f4f6; color: #0b5a63; font-size: 13px; font-weight: 500; }
    h1 { font: var(--mat-sys-display-small); font-weight: 500; letter-spacing: -0.5px; margin: 16px 0; }
    .hero-texto p { font-size: 17px; line-height: 1.6; max-width: 560px; }
    .datos { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 20px; font-size: 14px; opacity: .85; }
    .datos span { display: inline-flex; align-items: center; gap: 6px; }
    .hero-visual { position: relative; height: 320px; }
    .burbuja { position: absolute; width: 96px; height: 96px; border-radius: 50%; background: #fafafa; border: 1px solid #e3e3e3; display: grid; place-items: center; color: var(--mat-sys-primary); }
    .burbuja mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .b1 { top: 10%; left: 10%; } .b2 { top: 5%; right: 15%; width: 72px; height: 72px; } .b3 { bottom: 15%; left: 25%; width: 80px; height: 80px; }
    .b4 { bottom: 10%; right: 10%; } .b5 { top: 40%; left: 48%; width: 120px; height: 120px; color: var(--mat-sys-error); }
    .servicio { display: flex; flex-direction: column; }
    .servicio mat-card-content { flex: 1; }
    .servicio h3 { margin: 8px 0 4px; font: var(--mat-sys-title-medium); }
    .servicio p { margin: 0; opacity: .8; }
    .icono { font-size: 36px; width: 36px; height: 36px; color: var(--mat-sys-primary); }
    .pasos { padding-bottom: 8px; }
    .paso { padding: 16px; border-radius: 10px; background: #fff; border: 1px solid #e3e3e3; }
    .paso h3 { margin: 8px 0 4px; font: var(--mat-sys-title-medium); }
    .paso p { margin: 0; opacity: .8; }
    .numero { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--mat-sys-primary); color: var(--mat-sys-primary); display: grid; place-items: center; font-weight: 500; }
  `,
})
export class Inicio {
  protected readonly clinica = CLINICA;
  protected readonly especialidades = ESPECIALIDADES;
  protected readonly pasos = [
    { n: 1, titulo: 'Elige especialidad y médico', texto: 'Consulta el perfil y los días de atención de cada especialista.' },
    { n: 2, titulo: 'Selecciona fecha y hora', texto: 'Solo se muestran horarios realmente disponibles.' },
    { n: 3, titulo: 'Confirma tus datos', texto: 'Recibes un folio para consultar, agregar al calendario o cancelar tu cita.' },
  ];
}
