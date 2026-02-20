import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPageComponent) },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/admin/admin.shell').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'calendar' },
      { path: 'employees', loadComponent: () => import('./features/admin/employees/employees.page').then((m) => m.EmployeesPageComponent) },
      { path: 'locations', loadComponent: () => import('./features/admin/catalogs/locations.page').then((m) => m.LocationsPageComponent) },
      { path: 'activity-types', loadComponent: () => import('./features/admin/catalogs/activity-types.page').then((m) => m.ActivityTypesPageComponent) },
      { path: 'calendar', loadComponent: () => import('./features/admin/calendar/calendar.page').then((m) => m.AdminCalendarPageComponent) },
      { path: 'work-photos', loadComponent: () => import('./features/admin/work-photos/work-photos.page').then((m) => m.WorkPhotosPageComponent) }
    ]
  },
  {
    path: 'director',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['SUPER_ADMIN'] },
    loadComponent: () => import('./features/director/director.shell').then((m) => m.DirectorShellComponent),
    children: [{ path: '', loadComponent: () => import('./features/director/admins.page').then((m) => m.AdminsPageComponent) }]
  },
  {
    path: 'me',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['COLLABORATOR'] },
    loadComponent: () => import('./features/collaborator/collaborator.shell').then((m) => m.CollaboratorShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'ponto' },
      { path: 'ponto', loadComponent: () => import('./features/collaborator/my-calendar.page').then((m) => m.MyCalendarPageComponent) },
      { path: 'solicitacoes', loadComponent: () => import('./features/collaborator/requests.page').then((m) => m.RequestsPageComponent) },
      { path: 'perfil', loadComponent: () => import('./features/collaborator/profile.page').then((m) => m.ProfilePageComponent) }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
