import { ChangeDetectionStrategy, Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Assignment } from '../../shared/models/assignment.model';
import { TzDatePipe } from '../../shared/pipes/tz-date.pipe';
import { TranslatePipe } from '../../shared/pipes/t.pipe';

export interface AssignmentDetailDialogData {
  assignment: Assignment;
}

export type PunchAction = 'IN' | 'OUT';

export interface AssignmentDetailDialogResult {
  action: PunchAction;
  file: File;
}

@Component({
  selector: 'app-assignment-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, TzDatePipe, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'assignment.details' | t }}</h2>
    <mat-dialog-content>
      <div class="grid">
        <p><strong>Inicio:</strong> {{ data.assignment.start_at | tzDate }}</p>
        <p><strong>Fim:</strong> {{ data.assignment.end_at | tzDate }}</p>
        <p><strong>Status:</strong> {{ data.assignment.status }}</p>
        <p><strong>Atividade:</strong> {{ data.assignment.activity_type?.name || 'Nao informada' }}</p>
        <p><strong>Local:</strong> {{ data.assignment.location?.name || 'Nao informado' }}</p>
        <p><strong>Endereco:</strong> {{ data.assignment.location?.address || 'Nao informado' }}</p>
        <p><strong>Detalhes:</strong> {{ data.assignment.details || 'Sem observacoes' }}</p>
        <p><strong>Ponto:</strong> {{ data.assignment.attendance?.status || 'NOT_STARTED' }}</p>
      </div>

      @if (data.assignment.attendance?.before_photo_url) {
        <p class="label">Foto antes (registrada)</p>
        <img class="preview" [src]="data.assignment.attendance?.before_photo_url" alt="Foto antes" />
      }

      @if (data.assignment.attendance?.after_photo_url) {
        <p class="label">Foto depois (registrada)</p>
        <img class="preview" [src]="data.assignment.attendance?.after_photo_url" alt="Foto depois" />
      }

      @if (!data.assignment.attendance?.check_in_at) {
        <p class="label">Foto antes (obrigatoria para entrada)</p>
        <input type="file" accept="image/*" (change)="onBeforeFileChange($event)" />
        @if (beforePreview()) {
          <img class="preview" [src]="beforePreview()" alt="Preview antes" />
        }
      }

      @if (data.assignment.attendance?.check_in_at && !data.assignment.attendance?.check_out_at) {
        <p class="label">Foto depois (obrigatoria para saida)</p>
        <input type="file" accept="image/*" (change)="onAfterFileChange($event)" />
        @if (afterPreview()) {
          <img class="preview" [src]="afterPreview()" alt="Preview depois" />
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.close' | t }}</button>

      @if (!data.assignment.attendance?.check_in_at) {
        <button mat-flat-button color="primary" [disabled]="!beforeFile()" (click)="confirm('IN')">{{ 'assignment.checkin' | t }}</button>
      }

      @if (data.assignment.attendance?.check_in_at && !data.assignment.attendance?.check_out_at) {
        <button mat-flat-button color="accent" [disabled]="!afterFile()" (click)="confirm('OUT')">{{ 'assignment.checkout' | t }}</button>
      }
    </mat-dialog-actions>
  `,
  styles: [
    `
      .grid {
        display: grid;
        gap: 4px;
      }

      p {
        margin: 0;
      }

      .label {
        margin-top: 10px;
        font-weight: 600;
      }

      .preview {
        width: 100%;
        max-width: 320px;
        border-radius: 10px;
        border: 1px solid #dbe7f0;
        margin-top: 6px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentDetailDialogComponent {
  protected readonly beforeFile = signal<File | null>(null);
  protected readonly afterFile = signal<File | null>(null);
  protected readonly beforePreview = signal<string | null>(null);
  protected readonly afterPreview = signal<string | null>(null);

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: AssignmentDetailDialogData,
    public readonly dialogRef: MatDialogRef<AssignmentDetailDialogComponent, AssignmentDetailDialogResult | undefined>
  ) {}

  onBeforeFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.beforeFile.set(file);
    this.beforePreview.set(file ? URL.createObjectURL(file) : null);
  }

  onAfterFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.afterFile.set(file);
    this.afterPreview.set(file ? URL.createObjectURL(file) : null);
  }

  confirm(action: PunchAction): void {
    const file = action === 'IN' ? this.beforeFile() : this.afterFile();
    if (!file) {
      return;
    }

    this.dialogRef.close({ action, file });
  }
}
