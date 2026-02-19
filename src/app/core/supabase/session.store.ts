import { Injectable, computed, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { Profile } from '../../shared/models/assignment.model';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  readonly session = signal<Session | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly loading = signal<boolean>(true);

  readonly isAuthenticated = computed<boolean>(() => !!this.session());
  readonly role = computed<Profile['role'] | null>(() => this.profile()?.role ?? null);

  setSession(session: Session | null): void {
    this.session.set(session);
  }

  setProfile(profile: Profile | null): void {
    this.profile.set(profile);
  }

  setLoading(loading: boolean): void {
    this.loading.set(loading);
  }

  clear(): void {
    this.session.set(null);
    this.profile.set(null);
  }
}
