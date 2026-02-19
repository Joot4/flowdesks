import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './core/supabase/auth.service';
import { SessionStore } from './core/supabase/session.store';
import { I18nService, AppLanguage } from './core/i18n/i18n.service';
import { TranslatePipe } from './shared/pipes/t.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, MatButtonModule, MatProgressBarModule, MatMenuModule, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  protected readonly online = signal<boolean>(navigator.onLine);
  protected readonly isOffline = computed<boolean>(() => !this.online());
  protected readonly languages: AppLanguage[] = ['pt-BR', 'en', 'es'];

  constructor(
    protected readonly sessionStore: SessionStore,
    private readonly authService: AuthService,
    protected readonly i18n: I18nService
  ) {
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }

  logout(): void {
    void this.authService.signOut();
  }

  setLanguage(language: AppLanguage): void {
    this.i18n.setLanguage(language);
  }

  currentLanguage(): AppLanguage {
    return this.i18n.language();
  }

  languageLabel(lang: AppLanguage): string {
    if (lang === 'en') {
      return this.i18n.t('lang.en');
    }
    if (lang === 'es') {
      return this.i18n.t('lang.es');
    }
    return this.i18n.t('lang.pt');
  }
}
