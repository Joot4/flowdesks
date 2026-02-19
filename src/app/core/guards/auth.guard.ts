import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SessionStore } from '../supabase/session.store';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const sessionStore = inject(SessionStore);

  if (sessionStore.loading()) {
    return true;
  }

  return sessionStore.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
