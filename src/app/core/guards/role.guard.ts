import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SessionStore } from '../supabase/session.store';
import { Role } from '../../shared/models/role.model';
import { ROLE_HOME_PATH } from '../../shared/models/role.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const sessionStore = inject(SessionStore);

  if (sessionStore.loading()) {
    return true;
  }

  if (!sessionStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const allowedRoles = (route.data['roles'] as Role[] | undefined) ?? [];
  const userRole = sessionStore.role();

  if (!userRole) {
    return router.createUrlTree(['/login']);
  }

  return allowedRoles.includes(userRole) ? true : router.createUrlTree([ROLE_HOME_PATH[userRole]]);
};
