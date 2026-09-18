import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Inicio | Biblioteca',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'libros',
    title: 'Libros | Biblioteca',
    loadComponent: () => import('./features/libros/libros').then((m) => m.Libros),
  },
  {
    path: 'socios',
    title: 'Socios | Biblioteca',
    loadComponent: () => import('./features/socios/socios').then((m) => m.Socios),
  },
  {
    path: 'prestamos',
    title: 'Préstamos | Biblioteca',
    loadComponent: () => import('./features/prestamos/prestamos').then((m) => m.Prestamos),
  },
  {
    path: 'vencidos',
    title: 'Vencidos | Biblioteca',
    loadComponent: () => import('./features/vencidos/vencidos').then((m) => m.Vencidos),
  },
  {
    path: 'ajustes',
    title: 'Ajustes | Biblioteca',
    loadComponent: () => import('./features/ajustes/ajustes').then((m) => m.Ajustes),
  },
  { path: '**', redirectTo: '' },
];
