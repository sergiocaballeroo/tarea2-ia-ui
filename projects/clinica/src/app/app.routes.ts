import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Clínica Salud Integral', loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio) },
  { path: 'servicios', title: 'Servicios | Clínica', loadComponent: () => import('./features/servicios/servicios').then((m) => m.Servicios) },
  { path: 'equipo', title: 'Equipo médico | Clínica', loadComponent: () => import('./features/equipo/equipo').then((m) => m.Equipo) },
  { path: 'contacto', title: 'Contacto | Clínica', loadComponent: () => import('./features/contacto/contacto').then((m) => m.Contacto) },
  { path: 'agendar', title: 'Agendar cita | Clínica', loadComponent: () => import('./features/agendar/agendar').then((m) => m.Agendar) },
  { path: 'mis-citas', title: 'Mis citas | Clínica', loadComponent: () => import('./features/mis-citas/mis-citas').then((m) => m.MisCitas) },
  { path: 'recepcion', title: 'Recepción | Clínica', loadComponent: () => import('./features/recepcion/recepcion').then((m) => m.Recepcion) },
  { path: '**', redirectTo: '' },
];
