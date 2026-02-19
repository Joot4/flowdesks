import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  confirmValue?: boolean | string;
  secondaryActionText?: string;
  secondaryActionValue?: boolean | string;
  secondaryActionColor?: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Cancelar</button>
      <button
        *ngIf="data.secondaryActionText"
        mat-stroked-button
        [color]="data.secondaryActionColor ?? 'primary'"
        (click)="dialogRef.close(data.secondaryActionValue ?? true)"
      >
        {{ data.secondaryActionText }}
      </button>
      <button mat-flat-button color="warn" (click)="dialogRef.close(data.confirmValue ?? true)">
        {{ data.confirmText ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: ConfirmDialogData,
    public readonly dialogRef: MatDialogRef<ConfirmDialogComponent>
  ) {}
}
