import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthError, Session } from '@supabase/supabase-js';
import { ROLE_HOME_PATH } from '../../shared/models/role.model';
import { ToastService } from '../ui/toast.service';
import { ProfilesService } from './profiles.service';
import { SessionStore } from './session.store';
import { supabase } from './supabase.client';
import { NotificationsService } from './notifications.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private readonly sessionStore: SessionStore,
    private readonly profilesService: ProfilesService,
    private readonly notificationsService: NotificationsService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {
    void this.bootstrapSession();
    supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionStore.setSession(session);
      void this.refreshProfile();
    });
  }

  async signInWithPassword(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    await this.refreshProfile();
    this.redirectByRole();
  }

  async signOut(): Promise<void> {
    await this.notificationsService.stop();
    await supabase.auth.signOut();
    this.sessionStore.clear();
    await this.router.navigateByUrl('/login');
  }

  private async bootstrapSession(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      this.sessionStore.setSession(data.session);
      await this.refreshProfile();
    } catch (error) {
      this.handleError(error, 'Falha ao carregar sessão.');
    } finally {
      this.sessionStore.setLoading(false);
    }
  }

  private async refreshProfile(): Promise<void> {
    const session = this.sessionStore.session();
    if (!session) {
      this.sessionStore.setProfile(null);
      return;
    }

    try {
      const profile = await this.profilesService.getMyProfile();
      this.sessionStore.setProfile(profile);
      if (profile?.role) {
        await this.notificationsService.startForCurrentUser();
      } else {
        await this.notificationsService.stop();
      }
    } catch (error) {
      this.handleError(error, 'Não foi possível carregar perfil.');
    }
  }

  redirectByRole(): void {
    const role = this.sessionStore.role();
    if (!role) {
      return;
    }
    void this.router.navigateByUrl(ROLE_HOME_PATH[role]);
  }

  private handleError(error: unknown, fallbackMessage: string): void {
    const authError = error as AuthError | undefined;
    this.toastService.error(authError?.message ?? fallbackMessage);
  }
}
