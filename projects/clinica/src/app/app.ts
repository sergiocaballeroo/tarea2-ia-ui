import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { CLINICA } from './core/datos-clinica';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
  ],
  template: `
    <mat-sidenav-container class="contenedor">
      <mat-sidenav #nav mode="over" class="menu-movil">
        <mat-nav-list>
          @for (item of menu; track item.ruta) {
            <a mat-list-item [routerLink]="item.ruta" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: item.ruta === '/' }" (click)="nav.close()">
              <mat-icon matListItemIcon>{{ item.icono }}</mat-icon>
              <span matListItemTitle>{{ item.texto }}</span>
            </a>
          }
          <a mat-list-item routerLink="/recepcion" routerLinkActive="activo" (click)="nav.close()">
            <mat-icon matListItemIcon>badge</mat-icon>
            <span matListItemTitle>Recepción</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="barra">
          <div class="barra-interna">
            @if (esMovil()) {
              <button matIconButton (click)="nav.open()" aria-label="Abrir menú"><mat-icon>menu</mat-icon></button>
            }
            <a routerLink="/" class="marca">
              <mat-icon>medical_services</mat-icon>
              <span>{{ clinica.nombre }}</span>
            </a>
            <span class="espacio"></span>
            @if (!esMovil()) {
              <nav class="enlaces">
                @for (item of menu; track item.ruta) {
                  <a matButton [routerLink]="item.ruta" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: item.ruta === '/' }">{{ item.texto }}</a>
                }
              </nav>
              <a matButton="filled" routerLink="/agendar"><mat-icon>event_available</mat-icon> Agendar cita</a>
            }
          </div>
        </mat-toolbar>

        <main class="contenido">
          <router-outlet />
        </main>

        <footer class="pie">
          <div class="pie-interna">
            <div>
              <strong>{{ clinica.nombre }}</strong>
              <div>{{ clinica.direccion }}</div>
              <div>Tel. {{ clinica.telefono }} · {{ clinica.correo }}</div>
            </div>
            <div>
              <div>{{ clinica.horarioTexto }}</div>
              <div>{{ clinica.urgenciasTexto }}</div>
            </div>
            <div class="pie-enlaces">
              <a routerLink="/mis-citas">Consultar o cancelar mi cita</a>
              <a routerLink="/recepcion">Acceso recepción</a>
            </div>
          </div>
          <div class="aviso">{{ clinica.aviso }}</div>
        </footer>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .contenedor { min-height: 100vh; }
    .barra { position: sticky; top: 0; z-index: 10; background: var(--mat-sys-surface-container-lowest); box-shadow: var(--mat-sys-level1); }
    .barra-interna { display: flex; align-items: center; gap: 8px; width: 100%; max-width: 1200px; margin: 0 auto; }
    .marca { display: flex; align-items: center; gap: 8px; text-decoration: none; color: var(--mat-sys-primary); font-weight: 600; }
    .espacio { flex: 1; }
    .enlaces a.activo { color: var(--mat-sys-primary); font-weight: 600; }
    .contenido { min-height: 70vh; }
    .pie { background: var(--mat-sys-surface-container); padding: 32px 16px 16px; margin-top: 48px; font-size: 14px; }
    .pie-interna { max-width: 1200px; margin: 0 auto; display: grid; gap: 24px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .pie-enlaces { display: grid; gap: 8px; align-content: start; }
    .pie a { color: var(--mat-sys-primary); }
    .aviso { text-align: center; opacity: .6; margin-top: 24px; font-size: 12px; }
    .menu-movil { width: 260px; }
    a.activo[mat-list-item] { background: var(--mat-sys-secondary-container); }
  `,
})
export class App {
  protected readonly clinica = CLINICA;
  private readonly breakpoints = inject(BreakpointObserver);
  protected readonly esMovil = toSignal(
    this.breakpoints.observe('(max-width: 960px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );
  protected readonly menu = [
    { ruta: '/', icono: 'home', texto: 'Inicio' },
    { ruta: '/servicios', icono: 'medical_information', texto: 'Servicios' },
    { ruta: '/equipo', icono: 'groups', texto: 'Equipo médico' },
    { ruta: '/contacto', icono: 'location_on', texto: 'Contacto' },
    { ruta: '/mis-citas', icono: 'event_note', texto: 'Mis citas' },
    { ruta: '/agendar', icono: 'event_available', texto: 'Agendar cita' },
  ];
}
