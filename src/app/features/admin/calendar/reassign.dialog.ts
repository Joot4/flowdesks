import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CollaboratorView } from '../../../core/supabase/employees.service';

export interface ReassignDialogData {
  employees: CollaboratorView[];
  currentEmployeeProfileId: string;
}

export interface ReassignDialogResult {
  toEmployeeProfileId: string;
  reason: string;
}

@Component({
  selector: 'app-reassign-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Remanejar alocacao</h2>
    <mat-dialog-content>
      <form class="form" [formGroup]="form">
        <mat-form-field appearance="fill">
          <mat-label>Novo colaborador</mat-label>
          <mat-select formControlName="toEmployeeProfileId">
            @for (employee of data.employees; track employee.profile.id) {
              @if (employee.profile.id !== data.currentEmployeeProfileId) {
                <mat-option [value]="employee.profile.id">{{ employee.profile.full_name }}</mat-option>
              }
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Motivo</mat-label>
          <textarea matInput formControlName="reason" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Confirmar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .form {
        min-width: 380px;
        display: grid;
        gap: 8px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReassignDialogComponent {
  readonly form = this.formBuilder.nonNullable.group({
    toEmployeeProfileId: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(3)]]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialogRef: MatDialogRef<ReassignDialogComponent, ReassignDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ReassignDialogData
  ) {}

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }
}
