import { ChangeDetectionStrategy, Component, Inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { Assignment } from '../../shared/models/assignment.model';
import { TzDatePipe } from '../../shared/pipes/tz-date.pipe';
import { TranslatePipe } from '../../shared/pipes/t.pipe';

export interface AssignmentDetailDialogData {
  assignment: Assignment;
}

export type PunchAction = 'IN' | 'OUT';

export interface AssignmentDetailPunchResult {
  type: 'PUNCH';
  action: PunchAction;
}

export interface AssignmentDetailUploadResult {
  type: 'UPLOAD';
  phase: 'BEFORE' | 'AFTER';
  files: File[];
}

export interface AssignmentDetailDeletePhotoResult {
  type: 'DELETE_PHOTO';
  photoId: string;
  photoUrl: string;
}

export interface AssignmentDetailRequestResult {
  type: 'REQUEST';
  requestType: PunchAction;
  requestedTimeIso: string;
  reason: string;
}

export type AssignmentDetailDialogResult =
  | AssignmentDetailPunchResult
  | AssignmentDetailUploadResult
  | AssignmentDetailDeletePhotoResult
  | AssignmentDetailRequestResult;

@Component({
  selector: 'app-assignment-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatTabsModule, TzDatePipe, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'assignment.details' | t }}</h2>
    <mat-dialog-content>
      <div class="grid">
        <p><strong>{{ 'assignment.start' | t }}:</strong> {{ data.assignment.start_at | tzDate }}</p>
        <p><strong>{{ 'assignment.end' | t }}:</strong> {{ data.assignment.end_at | tzDate }}</p>
        <p><strong>{{ 'assignment.status' | t }}:</strong> {{ data.assignment.status }}</p>
        <p><strong>{{ 'assignment.activityLabel' | t }}:</strong> {{ data.assignment.activity_type?.name || ('assignment.notProvidedFemale' | t) }}</p>
        <p><strong>{{ 'assignment.locationLabel' | t }}:</strong> {{ data.assignment.location?.name || ('assignment.notProvidedMale' | t) }}</p>
        <p><strong>{{ 'assignment.addressLabel' | t }}:</strong> {{ data.assignment.location?.address || ('assignment.notProvidedMale' | t) }}</p>
        <p><strong>{{ 'assignment.detailsLabel' | t }}:</strong> {{ data.assignment.details || ('assignment.noNotes' | t) }}</p>
        <p><strong>{{ 'assignment.punchLabel' | t }}:</strong> {{ data.assignment.attendance?.status || 'NOT_STARTED' }}</p>
      </div>

      <mat-tab-group class="detail-tabs">
        <mat-tab [label]="'assignment.tabPunch' | t">
          <div class="tab-body">
            @if (data.assignment.attendance?.before_photo_url) {
              <p class="label">{{ 'assignment.photoBeforeRegistered' | t }}</p>
              <img class="preview-large" [src]="data.assignment.attendance?.before_photo_url" [alt]="'assignment.photoBeforeRegistered' | t" />
            }

            @if (data.assignment.attendance?.after_photo_url) {
              <p class="label">{{ 'assignment.photoAfterRegistered' | t }}</p>
              <img class="preview-large" [src]="data.assignment.attendance?.after_photo_url" [alt]="'assignment.photoAfterRegistered' | t" />
            }

            <p class="label">{{ 'assignment.workPhotosBefore' | t }}</p>
            <div class="file-input-row">
              <input class="file-input" type="file" accept="image/*" multiple (change)="onBeforeFilesChange($event)" />
              @if (beforeFiles().length > 0) {
                <button mat-button type="button" (click)="clearBeforeSelection()">{{ 'calendar.clear' | t }}</button>
              }
            </div>
            @if (beforePreviews().length > 0) {
              <div class="preview-grid">
                @for (preview of beforePreviews(); track preview; let index = $index) {
                  <div class="preview-item">
                    <img class="preview" [src]="preview" [alt]="'assignment.previewBefore' | t" />
                    <button type="button" class="remove-preview" (click)="removeBeforeSelection(index)">×</button>
                  </div>
                }
              </div>
            }
            @if (beforeWorkPhotos().length > 0) {
              <div class="preview-grid">
                @for (photo of beforeWorkPhotos(); track photo.id) {
                  <div class="preview-item">
                    <a [href]="photo.photo_url" target="_blank" rel="noreferrer">
                      <img class="preview" [src]="photo.photo_url" [alt]="'assignment.photoBeforeWork' | t" />
                    </a>
                    <button type="button" class="remove-preview" (click)="deleteUploadedPhoto(photo.id, photo.photo_url)">×</button>
                  </div>
                }
              </div>
            }

            <p class="label">{{ 'assignment.workPhotosAfter' | t }}</p>
            <div class="file-input-row">
              <input class="file-input" type="file" accept="image/*" multiple (change)="onAfterFilesChange($event)" />
              @if (afterFiles().length > 0) {
                <button mat-button type="button" (click)="clearAfterSelection()">{{ 'calendar.clear' | t }}</button>
              }
            </div>
            @if (afterPreviews().length > 0) {
              <div class="preview-grid">
                @for (preview of afterPreviews(); track preview; let index = $index) {
                  <div class="preview-item">
                    <img class="preview" [src]="preview" [alt]="'assignment.previewAfter' | t" />
                    <button type="button" class="remove-preview" (click)="removeAfterSelection(index)">×</button>
                  </div>
                }
              </div>
            }
            @if (afterWorkPhotos().length > 0) {
              <div class="preview-grid">
                @for (photo of afterWorkPhotos(); track photo.id) {
                  <div class="preview-item">
                    <a [href]="photo.photo_url" target="_blank" rel="noreferrer">
                      <img class="preview" [src]="photo.photo_url" [alt]="'assignment.photoAfterWork' | t" />
                    </a>
                    <button type="button" class="remove-preview" (click)="deleteUploadedPhoto(photo.id, photo.photo_url)">×</button>
                  </div>
                }
              </div>
            }

            <div class="upload-actions">
              <button mat-stroked-button color="primary" [disabled]="beforeFiles().length === 0" (click)="submitUpload('BEFORE')">
                {{ 'assignment.uploadBeforePhotos' | t }}
              </button>
              <button mat-stroked-button color="primary" [disabled]="afterFiles().length === 0" (click)="submitUpload('AFTER')">
                {{ 'assignment.uploadAfterPhotos' | t }}
              </button>
            </div>

            <div class="punch-actions">
              @if (!data.assignment.attendance?.check_in_at) {
                <button mat-flat-button color="primary" (click)="confirmPunch('IN')">{{ 'assignment.checkin' | t }}</button>
              }

              @if (data.assignment.attendance?.check_in_at && !data.assignment.attendance?.check_out_at) {
                <button mat-flat-button color="accent" (click)="confirmPunch('OUT')">{{ 'assignment.checkout' | t }}</button>
              }
            </div>
          </div>
        </mat-tab>

        <mat-tab [label]="'assignment.tabRequest' | t">
          <div class="tab-body">
            <section class="request-card">
              <div class="request-head">
                <p class="request-title">{{ 'assignment.request.title' | t }}</p>
                <p class="request-subtitle">{{ 'assignment.request.subtitle' | t }}</p>
              </div>

              <div class="request-type-chip">
                {{ 'assignment.request.suggestedType' | t }}: <strong>{{ suggestedRequestTypeLabelKey() | t }}</strong>
              </div>

              <div class="request-fields">
                <label>
                  {{ 'assignment.request.time' | t }}
                  <input
                    type="datetime-local"
                    [value]="requestDateTimeLocal()"
                    (input)="onRequestTimeChange($event)"
                    class="request-time-input"
                  />
                </label>

                <label>
                  {{ 'assignment.request.reason' | t }}
                  <textarea
                    rows="3"
                    class="request-reason-input"
                    [placeholder]="'assignment.request.reasonPlaceholder' | t"
                    [value]="requestReason()"
                    (input)="onRequestReasonChange($event)"
                  ></textarea>
                </label>
              </div>

              <div class="request-actions">
                <button mat-flat-button color="primary" (click)="submitRequest()">
                  {{ 'assignment.request.submit' | t }}
                </button>
              </div>
            </section>
          </div>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.close' | t }}</button>
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

      .preview-grid {
        margin-top: 8px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
        gap: 8px;
      }

      .preview-item {
        position: relative;
      }

      .preview {
        width: 100%;
        height: 100px;
        object-fit: cover;
        display: block;
        border-radius: 10px;
        border: 1px solid #dbe7f0;
      }

      .preview-large {
        width: min(100%, 320px);
        max-height: 240px;
        object-fit: cover;
        display: block;
        border-radius: 10px;
        border: 1px solid #dbe7f0;
      }

      .remove-preview {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 22px;
        height: 22px;
        border: 0;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.72);
        color: #fff;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
      }

      .file-input-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .file-input {
        max-width: 100%;
      }

      .upload-actions {
        margin-top: 10px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .detail-tabs {
        margin-top: 10px;
      }

      .tab-body {
        padding-top: 10px;
      }

      .punch-actions {
        margin-top: 12px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .request-card {
        margin-top: 14px;
        border: 1px solid #dbe7f0;
        background: linear-gradient(140deg, #ffffff, #f8fdff);
        border-radius: 12px;
        padding: 12px;
        display: grid;
        gap: 10px;
      }

      .request-head {
        display: grid;
        gap: 2px;
      }

      .request-title {
        margin: 0;
        font-weight: 700;
        color: #0f172a;
      }

      .request-subtitle {
        margin: 0;
        font-size: 12px;
        color: #64748b;
      }

      .request-type-chip {
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #334155;
        font-size: 12px;
        padding: 6px 10px;
        width: fit-content;
      }

      .request-fields {
        display: grid;
        gap: 10px;
      }

      .request-fields label {
        display: grid;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #334155;
      }

      .request-time-input,
      .request-reason-input {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 10px;
        font: inherit;
        color: #0f172a;
        background: #fff;
      }

      .request-reason-input {
        resize: vertical;
        min-height: 76px;
      }

      .request-time-input:focus,
      .request-reason-input:focus {
        outline: none;
        border-color: #0f766e;
        box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
      }

      .request-actions {
        display: flex;
        justify-content: flex-end;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentDetailDialogComponent implements OnDestroy {
  protected readonly beforeFiles = signal<File[]>([]);
  protected readonly afterFiles = signal<File[]>([]);
  protected readonly beforePreviews = signal<string[]>([]);
  protected readonly afterPreviews = signal<string[]>([]);
  protected readonly requestReason = signal<string>('');
  protected readonly requestDateTimeLocal = signal<string>(this.defaultRequestDateTimeLocal());

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: AssignmentDetailDialogData,
    public readonly dialogRef: MatDialogRef<AssignmentDetailDialogComponent, AssignmentDetailDialogResult | undefined>
  ) {}

  beforeWorkPhotos() {
    return (this.data.assignment.work_photos ?? []).filter((item) => item.phase === 'BEFORE');
  }

  afterWorkPhotos() {
    return (this.data.assignment.work_photos ?? []).filter((item) => item.phase === 'AFTER');
  }

  onBeforeFilesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) {
      return;
    }

    const mergedFiles = [...this.beforeFiles(), ...files];
    const mergedPreviews = [...this.beforePreviews(), ...files.map((file) => URL.createObjectURL(file))];
    this.beforeFiles.set(mergedFiles);
    this.beforePreviews.set(mergedPreviews);
    input.value = '';
  }

  onAfterFilesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) {
      return;
    }

    const mergedFiles = [...this.afterFiles(), ...files];
    const mergedPreviews = [...this.afterPreviews(), ...files.map((file) => URL.createObjectURL(file))];
    this.afterFiles.set(mergedFiles);
    this.afterPreviews.set(mergedPreviews);
    input.value = '';
  }

  removeBeforeSelection(index: number): void {
    const files = [...this.beforeFiles()];
    const previews = [...this.beforePreviews()];
    const [removedPreview] = previews.splice(index, 1);
    files.splice(index, 1);
    if (removedPreview) {
      URL.revokeObjectURL(removedPreview);
    }
    this.beforeFiles.set(files);
    this.beforePreviews.set(previews);
  }

  removeAfterSelection(index: number): void {
    const files = [...this.afterFiles()];
    const previews = [...this.afterPreviews()];
    const [removedPreview] = previews.splice(index, 1);
    files.splice(index, 1);
    if (removedPreview) {
      URL.revokeObjectURL(removedPreview);
    }
    this.afterFiles.set(files);
    this.afterPreviews.set(previews);
  }

  clearBeforeSelection(): void {
    this.beforePreviews().forEach((url) => URL.revokeObjectURL(url));
    this.beforeFiles.set([]);
    this.beforePreviews.set([]);
  }

  clearAfterSelection(): void {
    this.afterPreviews().forEach((url) => URL.revokeObjectURL(url));
    this.afterFiles.set([]);
    this.afterPreviews.set([]);
  }

  submitUpload(phase: 'BEFORE' | 'AFTER'): void {
    const files = phase === 'BEFORE' ? this.beforeFiles() : this.afterFiles();
    if (files.length === 0) {
      return;
    }

    this.dialogRef.close({ type: 'UPLOAD', phase, files });
  }

  deleteUploadedPhoto(photoId: string, photoUrl: string): void {
    this.dialogRef.close({ type: 'DELETE_PHOTO', photoId, photoUrl });
  }

  onRequestReasonChange(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    this.requestReason.set(input.value);
  }

  onRequestTimeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.requestDateTimeLocal.set(input.value);
  }

  submitRequest(): void {
    const requestType: PunchAction = this.data.assignment.attendance?.check_in_at ? 'OUT' : 'IN';
    const requestedIso = this.localDateTimeToIso(this.requestDateTimeLocal());
    if (!requestedIso) {
      return;
    }

    this.dialogRef.close({
      type: 'REQUEST',
      requestType,
      requestedTimeIso: requestedIso,
      reason: this.requestReason()
    });
  }

  suggestedRequestTypeLabelKey(): string {
    return this.data.assignment.attendance?.check_in_at ? 'assignment.request.suggestedOut' : 'assignment.request.suggestedIn';
  }

  confirmPunch(action: PunchAction): void {
    this.dialogRef.close({ type: 'PUNCH', action });
  }

  ngOnDestroy(): void {
    this.beforePreviews().forEach((url) => URL.revokeObjectURL(url));
    this.afterPreviews().forEach((url) => URL.revokeObjectURL(url));
  }

  private defaultRequestDateTimeLocal(): string {
    const now = new Date();
    const two = (value: number): string => value.toString().padStart(2, '0');
    return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}T${two(now.getHours())}:${two(now.getMinutes())}`;
  }

  private localDateTimeToIso(value: string): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }
}
