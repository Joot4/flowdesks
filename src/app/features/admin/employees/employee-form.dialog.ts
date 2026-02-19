import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CollaboratorView } from '../../../core/supabase/employees.service';

export interface EmployeeDialogData {
  mode: 'create' | 'edit';
  collaborator?: CollaboratorView;
}

export interface EmployeeDialogResult {
  email: string;
  password: string;
  full_name: string;
  employee_code: string;
  phone: string;
  job_title: string;
}

@Component({
  selector: 'app-employee-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Adicionar colaborador' : 'Editar colaborador' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        @if (data.mode === 'create') {
          <mat-form-field appearance="fill">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Senha inicial</mat-label>
            <input matInput formControlName="password" type="password" />
          </mat-form-field>
        }

        <mat-form-field appearance="fill">
          <mat-label>Nome completo</mat-label>
          <input matInput formControlName="full_name" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Matricula</mat-label>
          <input matInput formControlName="employee_code" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Telefone</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Cargo</mat-label>
          <input matInput formControlName="job_title" />
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .form {
        display: grid;
        gap: 8px;
        min-width: 380px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeFormDialogComponent {
  readonly form = this.formBuilder.nonNullable.group({
    email: [this.data.mode === 'create' ? '' : this.data.collaborator?.profile.id ?? '', this.data.mode === 'create' ? [Validators.required, Validators.email] : []],
    password: ['', this.data.mode === 'create' ? [Validators.required, Validators.minLength(6)] : []],
    full_name: [this.data.collaborator?.profile.full_name ?? '', [Validators.required, Validators.minLength(3)]],
    employee_code: [this.data.collaborator?.employee?.employee_code ?? ''],
    phone: [this.data.collaborator?.employee?.phone ?? ''],
    job_title: [this.data.collaborator?.employee?.job_title ?? '']
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialogRef: MatDialogRef<EmployeeFormDialogComponent, EmployeeDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: EmployeeDialogData
  ) {}

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }
}
