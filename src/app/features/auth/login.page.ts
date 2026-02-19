import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/supabase/auth.service';
import { ToastService } from '../../core/ui/toast.service';
import { SessionStore } from '../../core/supabase/session.store';
import { TranslatePipe } from '../../shared/pipes/t.pipe';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe],
  template: `
    <section class="login-page">
      <mat-card class="surface-card login-card">
        <div class="top">
          <h1>{{ 'login.welcome' | t }}</h1>
          <p>{{ 'login.subtitle' | t }}</p>
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="fill">
            <mat-label>{{ 'login.email' | t }}</mat-label>
            <input matInput formControlName="email" type="email" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'login.password' | t }}</mat-label>
            <input matInput formControlName="password" type="password" />
          </mat-form-field>

          <button mat-flat-button color="primary" [disabled]="form.invalid || loading()">
            {{ loading() ? ('login.entering' | t) : ('login.enter' | t) }}
          </button>
        </form>
      </mat-card>
    </section>
  `,
  styles: [
    `
      .login-page {
        min-height: calc(100vh - 160px);
        display: grid;
        place-items: center;
      }

      .login-card {
        width: min(440px, 100%);
        padding: 28px;
        background: rgba(255, 255, 255, 0.94);
      }

      form {
        display: grid;
        gap: 10px;
      }

      .top {
        margin-bottom: 8px;
      }

      h1 {
        margin: 10px 0 6px;
        font-size: 1.55rem;
      }

      p {
        margin: 0 0 12px;
        color: #64748b;
      }

      @media (max-width: 700px) {
        .login-page {
          min-height: calc(100vh - 120px);
          align-items: start;
          padding-top: 24px;
        }

        .login-card {
          padding: 18px;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  protected readonly loading = signal<boolean>(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly sessionStore: SessionStore
  ) {
    if (this.sessionStore.isAuthenticated()) {
      this.authService.redirectByRole();
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.authService.signInWithPassword(email, password);
    } catch (error) {
      this.toastService.error((error as Error).message ?? 'Falha no login.');
    } finally {
      this.loading.set(false);
    }
  }
}
