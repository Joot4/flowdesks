import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ProfilesService } from '../../core/supabase/profiles.service';
import { EmployeesService } from '../../core/supabase/employees.service';
import { ToastService } from '../../core/ui/toast.service';
import { SessionStore } from '../../core/supabase/session.store';
import { supabase } from '../../core/supabase/supabase.client';
import { TranslatePipe } from '../../shared/pipes/t.pipe';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe],
  template: `
    <section class="profile-shell">
      <mat-card class="surface-card card">
        <h2>{{ 'profile.title' | t }}</h2>
        <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
          <mat-form-field appearance="fill">
            <mat-label>{{ 'common.name' | t }}</mat-label>
            <input matInput formControlName="full_name" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Email</mat-label>
            <input matInput [value]="email()" readonly />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'common.job' | t }}</mat-label>
            <input matInput [value]="jobTitle()" readonly />
          </mat-form-field>

          <button mat-flat-button color="primary" [disabled]="profileForm.invalid || loading()">{{ 'profile.save' | t }}</button>
        </form>
      </mat-card>

      <mat-card class="surface-card card">
        <h3>{{ 'profile.security' | t }}</h3>
        <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
          <mat-form-field appearance="fill">
            <mat-label>{{ 'profile.newPassword' | t }}</mat-label>
            <input matInput type="password" formControlName="password" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'profile.confirmPassword' | t }}</mat-label>
            <input matInput type="password" formControlName="confirmPassword" />
          </mat-form-field>

          <button mat-stroked-button [disabled]="passwordForm.invalid || loading()">{{ 'profile.updatePassword' | t }}</button>
        </form>
      </mat-card>
    </section>
  `,
  styles: [
    `
      .profile-shell {
        display: grid;
        gap: 12px;
      }

      .card {
        padding: 14px;
      }

      form {
        display: grid;
        gap: 10px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent {
  protected readonly loading = signal<boolean>(false);
  protected readonly email = signal<string>('');
  protected readonly jobTitle = signal<string>('Nao informado');

  protected readonly profileForm = this.formBuilder.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]]
  });

  protected readonly passwordForm = this.formBuilder.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly profilesService: ProfilesService,
    private readonly employeesService: EmployeesService,
    private readonly sessionStore: SessionStore,
    private readonly toastService: ToastService
  ) {
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    const profile = this.sessionStore.profile();
    this.profileForm.patchValue({ full_name: profile?.full_name ?? '' });

    const userData = await supabase.auth.getUser();
    this.email.set(userData.data.user?.email ?? '');

    try {
      const employee = await this.employeesService.getMyEmployee();
      this.jobTitle.set(employee?.job_title ?? 'Nao informado');
    } catch {
      this.jobTitle.set('Nao informado');
    }
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      return;
    }

    this.loading.set(true);
    try {
      await this.profilesService.updateOwnName(this.profileForm.getRawValue().full_name);
      const current = this.sessionStore.profile();
      if (current) {
        this.sessionStore.setProfile({
          ...current,
          full_name: this.profileForm.getRawValue().full_name
        });
      }
      this.toastService.success('Perfil atualizado com sucesso.');
    } catch (error) {
      this.toastService.error((error as Error).message || 'Falha ao atualizar perfil.');
    } finally {
      this.loading.set(false);
    }
  }

  async changePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      return;
    }

    const { password, confirmPassword } = this.passwordForm.getRawValue();
    if (password !== confirmPassword) {
      this.toastService.error('As senhas nao conferem.');
      return;
    }

    this.loading.set(true);
    try {
      await this.profilesService.updatePassword(password);
      this.passwordForm.reset({ password: '', confirmPassword: '' });
      this.toastService.success('Senha atualizada com sucesso.');
    } catch (error) {
      this.toastService.error((error as Error).message || 'Falha ao atualizar senha.');
    } finally {
      this.loading.set(false);
    }
  }
}
