import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BibliotecaService } from './core/biblioteca.service';
import { hoyISO } from './core/models';

/** Evento no estándar que Chrome/Edge lanzan cuando la PWA se puede instalar. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
  template: `
    <mat-sidenav-container class="contenedor">
      <mat-sidenav
        #nav
        [mode]="esMovil() ? 'over' : 'side'"
        [opened]="!esMovil()"
        class="menu"
      >
        <div class="marca">
          <mat-icon>local_library</mat-icon>
          <div>
            <div class="marca-titulo">{{ servicio.configuracion().nombreBiblioteca }}</div>
            <div class="marca-sub">Gestión de préstamos</div>
          </div>
        </div>
        <mat-nav-list>
          @for (item of menu; track item.ruta) {
            <a
              mat-list-item
              [routerLink]="item.ruta"
              routerLinkActive="activo"
              [routerLinkActiveOptions]="{ exact: item.ruta === '/' }"
              (click)="esMovil() && nav.close()"
            >
              <mat-icon matListItemIcon>{{ item.icono }}</mat-icon>
              <span matListItemTitle>{{ item.texto }}</span>
              @if (item.ruta === '/vencidos' && vencidos() > 0) {
                <span matListItemMeta class="badge-vencidos">{{ vencidos() }}</span>
              }
            </a>
          }
        </mat-nav-list>
        <div class="menu-pie">
          @if (instalable()) {
            <button matButton="outlined" (click)="instalar()">
              <mat-icon>install_desktop</mat-icon> Instalar aplicación
            </button>
          }
          <small>Datos guardados localmente en este equipo.</small>
        </div>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="barra">
          <button matIconButton (click)="nav.toggle()" aria-label="Menú">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="barra-titulo">Sistema de biblioteca</span>
          <span class="espacio"></span>
          <span class="fecha">{{ hoy }}</span>
        </mat-toolbar>
        <main class="contenido">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .contenedor { height: 100vh; }
    .menu { width: 240px; display: flex; flex-direction: column; border-right: 1px solid #e3e3e3; background: #fff; }
    .marca { display: flex; gap: 12px; align-items: center; padding: 20px 16px 12px; }
    .marca mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--mat-sys-primary); }
    .marca-titulo { font-weight: 600; }
    .marca-sub { font-size: 12px; opacity: .7; }
    .menu-pie { margin-top: auto; padding: 16px; display: grid; gap: 8px; font-size: 12px; opacity: .85; }
    .badge-vencidos { background: #fdeeee; color: #a3262c; border: 1px solid #f2c9cb; border-radius: 6px; padding: 0 7px; font-size: 12px; }
    .barra { position: sticky; top: 0; z-index: 2; background: #fff; border-bottom: 1px solid #e3e3e3; }
    .barra-titulo { margin-left: 8px; }
    .espacio { flex: 1; }
    .fecha { font-size: 14px; opacity: .8; }
    .contenido { padding: 24px; max-width: 1200px; margin: 0 auto; }
    a.activo { background: #eef3fb; }
  `,
})
export class App {
  protected readonly servicio = inject(BibliotecaService);
  private readonly breakpoints = inject(BreakpointObserver);

  protected readonly hoy = hoyISO();
  protected readonly esMovil = toSignal(
    this.breakpoints.observe('(max-width: 900px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly vencidos = computed(
    () =>
      this.servicio
        .prestamos()
        .filter((p) => p.estado === 'activo' && p.diasRetraso > 0).length,
  );

  protected readonly menu = [
    { ruta: '/', icono: 'dashboard', texto: 'Inicio' },
    { ruta: '/libros', icono: 'menu_book', texto: 'Libros' },
    { ruta: '/socios', icono: 'group', texto: 'Socios' },
    { ruta: '/prestamos', icono: 'swap_horiz', texto: 'Préstamos' },
    { ruta: '/vencidos', icono: 'warning', texto: 'Vencidos' },
    { ruta: '/ajustes', icono: 'settings', texto: 'Ajustes' },
  ];

  private promptInstalacion = signal<BeforeInstallPromptEvent | null>(null);
  protected readonly instalable = computed(() => this.promptInstalacion() !== null);

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.promptInstalacion.set(e as BeforeInstallPromptEvent);
    });
    window.addEventListener('appinstalled', () => this.promptInstalacion.set(null));
  }

  protected async instalar(): Promise<void> {
    const evento = this.promptInstalacion();
    if (!evento) return;
    await evento.prompt();
    this.promptInstalacion.set(null);
  }
}
