import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AssignmentsService } from '../../../core/supabase/assignments.service';
import { CatalogsService } from '../../../core/supabase/catalogs.service';
import { EmployeesService } from '../../../core/supabase/employees.service';
import { ToastService } from '../../../core/ui/toast.service';
import { Assignment, AssignmentWorkPhoto, Location } from '../../../shared/models/assignment.model';
import { TzDatePipe } from '../../../shared/pipes/tz-date.pipe';
import { TranslatePipe } from '../../../shared/pipes/t.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

interface WorkPhotoRow {
  id: string;
  photoUrl: string;
  phase: 'BEFORE' | 'AFTER';
  capturedAt: string | null;
  uploadedAt: string;
  employeeName: string;
  locationName: string;
  locationAddress: string;
  assignmentStartAt: string;
  assignmentEndAt: string;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  headingDeg: number | null;
  mapUrl: string | null;
}

type GroupByMode = 'NONE' | 'EMPLOYEE' | 'LOCATION' | 'DAY';

interface PhotoGroup {
  key: string;
  label: string;
  rows: WorkPhotoRow[];
}

interface JsZipLike {
  file(name: string, data: Blob): void;
  generateAsync(options: {
    type: 'blob';
    compression: 'DEFLATE';
    compressionOptions: { level: number };
  }): Promise<Blob>;
}

interface JsZipConstructor {
  new (): JsZipLike;
}

declare global {
  interface Window {
    JSZip?: JsZipConstructor;
  }
}

@Component({
  selector: 'app-work-photos-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TzDatePipe,
    TranslatePipe
  ],
  template: `
    <section class="photos-shell">
      <mat-card class="surface-card head">
        <div>
          <h2>{{ 'photos.title' | t }}</h2>
          <p>{{ 'photos.subtitle' | t }}</p>
        </div>
        <div class="count-pill">{{ 'photos.total' | t }}: {{ rows().length }}</div>
      </mat-card>

      <mat-card class="surface-card filters">
        <form [formGroup]="filtersForm" class="grid">
          <mat-form-field appearance="fill">
            <mat-label>{{ 'photos.periodStart' | t }}</mat-label>
            <input matInput type="date" formControlName="startDate" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'photos.periodEnd' | t }}</mat-label>
            <input matInput type="date" formControlName="endDate" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'photos.employee' | t }}</mat-label>
            <mat-select formControlName="employeeProfileId">
              <mat-option value="">{{ 'common.all' | t }}</mat-option>
              @for (item of collaborators(); track item.profile.id) {
              <mat-option [value]="item.profile.id">{{ item.profile.full_name || ('common.noName' | t) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'photos.location' | t }}</mat-label>
            <mat-select formControlName="locationId">
              <mat-option value="">{{ 'common.all' | t }}</mat-option>
              @for (location of locations(); track location.id) {
              <mat-option [value]="location.id">{{ locationOptionLabel(location) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'photos.phase' | t }}</mat-label>
            <mat-select formControlName="phase">
              <mat-option value="ALL">{{ 'photos.phaseAll' | t }}</mat-option>
              <mat-option value="BEFORE">{{ 'photos.phaseBefore' | t }}</mat-option>
              <mat-option value="AFTER">{{ 'photos.phaseAfter' | t }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'photos.gps' | t }}</mat-label>
            <mat-select formControlName="gps">
              <mat-option value="ALL">{{ 'photos.gpsAll' | t }}</mat-option>
              <mat-option value="WITH">{{ 'photos.gpsWith' | t }}</mat-option>
              <mat-option value="WITHOUT">{{ 'photos.gpsWithout' | t }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'photos.groupBy' | t }}</mat-label>
            <mat-select formControlName="groupBy" (selectionChange)="onGroupByChange($event.value)">
              <mat-option value="NONE">{{ 'photos.groupNone' | t }}</mat-option>
              <mat-option value="EMPLOYEE">{{ 'photos.groupEmployee' | t }}</mat-option>
              <mat-option value="LOCATION">{{ 'photos.groupLocation' | t }}</mat-option>
              <mat-option value="DAY">{{ 'photos.groupDay' | t }}</mat-option>
            </mat-select>
          </mat-form-field>
        </form>

        <div class="actions">
          <button mat-flat-button color="primary" type="button" (click)="load()">{{ 'photos.apply' | t }}</button>
          <button mat-button type="button" (click)="clearFilters()">{{ 'photos.clear' | t }}</button>
        </div>
      </mat-card>

      @if (loading()) {
      <div class="loading">
        <mat-progress-spinner diameter="40" mode="indeterminate"></mat-progress-spinner>
      </div>
      } @else {
      <div class="rows">
        @for (group of groupedRows(); track group.key) {
        <section class="group surface-card">
          <header class="group-head">
            <div>
              <h3>{{ group.label }}</h3>
              <p>{{ 'photos.total' | t }}: {{ group.rows.length }}</p>
            </div>
            <button mat-stroked-button type="button" [disabled]="downloadingBatch()" (click)="downloadBatch(group.rows)">
              {{ 'photos.downloadGroup' | t }}
            </button>
          </header>

          <div class="group-rows">
            @for (row of group.rows; track row.id) {
            <article class="row">
              <a [href]="row.photoUrl" target="_blank" rel="noreferrer">
                <img [src]="row.photoUrl" [alt]="row.phase === 'BEFORE' ? ('photos.phaseBefore' | t) : ('photos.phaseAfter' | t)" />
              </a>

              <div class="meta">
                <strong>{{ row.employeeName }}</strong>
                <div>{{ row.locationName }}</div>
                <div>{{ row.locationAddress }}</div>
                <div>{{ 'photos.assignmentWindow' | t }}: {{ row.assignmentStartAt | tzDate }} - {{ row.assignmentEndAt | tzDate }}</div>
                <div>{{ 'photos.capturedAt' | t }}: {{ (row.capturedAt || row.uploadedAt) | tzDate }}</div>
                <div>{{ 'photos.uploadedAt' | t }}: {{ row.uploadedAt | tzDate }}</div>
                <div>
                  {{ 'photos.coords' | t }}:
                  @if (row.latitude !== null && row.longitude !== null) {
                  {{ row.latitude.toFixed(6) }}, {{ row.longitude.toFixed(6) }}
                  } @else {
                  {{ 'photos.noCoords' | t }}
                  }
                </div>
                @if (row.accuracyM !== null) {
                <div>{{ 'photos.accuracy' | t }}: {{ row.accuracyM | number : '1.0-0' }}m</div>
                }
                @if (row.headingDeg !== null) {
                <div>{{ 'photos.heading' | t }}: {{ row.headingDeg | number : '1.0-0' }}°</div>
                }
              </div>

              <div class="row-actions">
                <span class="chip" [class.before]="row.phase === 'BEFORE'" [class.after]="row.phase === 'AFTER'">
                  {{ row.phase === 'BEFORE' ? ('photos.phaseBefore' | t) : ('photos.phaseAfter' | t) }}
                </span>
                <a mat-stroked-button [href]="row.photoUrl" target="_blank" rel="noreferrer">{{ 'photos.download' | t }}</a>
                @if (row.mapUrl) {
                <a mat-stroked-button color="primary" [href]="row.mapUrl" target="_blank" rel="noreferrer">{{ 'photos.openMap' | t }}</a>
                }
              </div>
            </article>
            }
          </div>
        </section>
        } @empty {
        <article class="empty surface-card">{{ 'photos.empty' | t }}</article>
        }
      </div>
      }
    </section>
  `,
  styles: [
    `
      .photos-shell {
        display: grid;
        gap: 16px;
        padding: 6px 2px 2px;
      }
      .head {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 12px;
        padding: 20px 22px;
      }
      .head h2 {
        margin: 0;
      }
      .head p {
        margin: 6px 0 0;
        color: #64748b;
      }
      .count-pill {
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        padding: 8px 12px;
        font-weight: 600;
      }
      .filters .grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(140px, 1fr));
        gap: 12px;
      }
      .filters {
        padding: 18px 20px;
      }
      .actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 12px;
        flex-wrap: wrap;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
      }
      .loading {
        min-height: 120px;
        display: grid;
        place-items: center;
      }
      .rows {
        display: grid;
        gap: 14px;
      }
      .group {
        padding: 14px;
        border: 1px solid #dbe7f0;
      }
      .group-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding-bottom: 10px;
        margin-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      .group-head h3 {
        margin: 0;
      }
      .group-head p {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 12px;
      }
      .group-rows {
        display: grid;
        gap: 10px;
      }
      .row {
        display: grid;
        grid-template-columns: 180px 1fr auto;
        gap: 14px;
        padding: 12px;
        align-items: start;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #fff;
      }
      .row img {
        width: 180px;
        height: 140px;
        object-fit: cover;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
      }
      .meta {
        display: grid;
        gap: 4px;
        color: #334155;
      }
      .row-actions {
        display: grid;
        gap: 8px;
        justify-items: end;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 600;
      }
      .chip.before {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .chip.after {
        background: #dcfce7;
        color: #166534;
      }
      .empty {
        padding: 18px;
        text-align: center;
        color: #64748b;
      }
      @media (max-width: 1100px) {
        .filters .grid {
          grid-template-columns: repeat(4, minmax(140px, 1fr));
        }
      }
      @media (max-width: 840px) {
        .row {
          grid-template-columns: 1fr;
        }
        .row img {
          width: 100%;
          height: auto;
          max-height: 280px;
        }
        .row-actions {
          justify-items: start;
          grid-auto-flow: column;
          align-items: center;
          grid-auto-columns: max-content;
          overflow-x: auto;
          padding-bottom: 4px;
        }
      }
      @media (max-width: 760px) {
        .photos-shell {
          padding: 2px 0;
        }
        .head {
          padding: 16px;
        }
        .filters {
          padding: 14px;
        }
        .filters .grid {
          grid-template-columns: 1fr;
        }
        .head {
          flex-direction: column;
        }
        .group-head {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkPhotosPageComponent {
  protected readonly loading = signal<boolean>(false);
  protected readonly downloadingBatch = signal<boolean>(false);
  protected readonly locations = signal<Location[]>([]);
  protected readonly collaborators = signal<Awaited<ReturnType<EmployeesService['listCollaborators']>>>([]);
  private readonly rowsRaw = signal<WorkPhotoRow[]>([]);
  protected readonly rows = computed<WorkPhotoRow[]>(() => this.rowsRaw());
  private readonly groupByMode = signal<GroupByMode>('NONE');
  protected readonly groupedRows = computed<PhotoGroup[]>(() => this.buildGroups(this.rows(), this.groupByMode()));

  protected readonly filtersForm = this.fb.nonNullable.group({
    startDate: this.defaultStartDate(),
    endDate: this.defaultEndDate(),
    employeeProfileId: '',
    locationId: '',
    phase: 'ALL' as 'ALL' | 'BEFORE' | 'AFTER',
    gps: 'ALL' as 'ALL' | 'WITH' | 'WITHOUT',
    groupBy: 'NONE' as GroupByMode
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly assignmentsService: AssignmentsService,
    private readonly catalogsService: CatalogsService,
    private readonly employeesService: EmployeesService,
    private readonly toastService: ToastService,
    private readonly i18n: I18nService
  ) {
    void this.bootstrap();
  }

  async clearFilters(): Promise<void> {
    this.filtersForm.setValue({
      startDate: this.defaultStartDate(),
      endDate: this.defaultEndDate(),
      employeeProfileId: '',
      locationId: '',
      phase: 'ALL',
      gps: 'ALL',
      groupBy: 'NONE'
    });
    this.groupByMode.set('NONE');
    await this.load();
  }

  onGroupByChange(mode: GroupByMode): void {
    this.groupByMode.set(mode);
  }

  async load(): Promise<void> {
    const { startDate, endDate, employeeProfileId, locationId, phase, gps } = this.filtersForm.getRawValue();
    this.loading.set(true);
    try {
      const assignments = await this.assignmentsService.listByRange(
        this.dateStartFortalezaIso(startDate),
        this.dateEndFortalezaIso(endDate),
        {
          employeeProfileId: employeeProfileId || undefined,
          locationId: locationId || undefined
        }
      );

      const collaboratorById = new Map(
        this.collaborators().map((item) => [item.profile.id, item.profile.full_name || this.i18n.t('common.noName')])
      );

      const flattened: WorkPhotoRow[] = [];
      for (const assignment of assignments) {
        const employeeName = collaboratorById.get(assignment.employee_profile_id) ?? this.i18n.t('common.collaborator');
        for (const photo of assignment.work_photos ?? []) {
          flattened.push(this.toRow(photo, assignment, employeeName));
        }
      }

      const filtered = flattened
        .filter((row) => (phase === 'ALL' ? true : row.phase === phase))
        .filter((row) => {
          const hasGps = row.latitude !== null && row.longitude !== null;
          if (gps === 'WITH') {
            return hasGps;
          }
          if (gps === 'WITHOUT') {
            return !hasGps;
          }
          return true;
        })
        .sort(
          (a, b) =>
            new Date(b.capturedAt || b.uploadedAt).getTime() - new Date(a.capturedAt || a.uploadedAt).getTime()
        );

      this.rowsRaw.set(filtered);
    } catch (error) {
      this.toastService.error((error as Error).message || this.i18n.t('photos.loadError'));
    } finally {
      this.loading.set(false);
    }
  }

  private async bootstrap(): Promise<void> {
    this.loading.set(true);
    try {
      const [locations, collaborators] = await Promise.all([
        this.catalogsService.listLocations(),
        this.employeesService.listCollaborators()
      ]);
      this.locations.set(locations);
      this.collaborators.set(collaborators);
      await this.load();
    } finally {
      this.loading.set(false);
    }
  }

  private toRow(photo: AssignmentWorkPhoto, assignment: Assignment, employeeName: string): WorkPhotoRow {
    const latitude = photo.latitude ?? null;
    const longitude = photo.longitude ?? null;
    const mapUrl = latitude !== null && longitude !== null
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : assignment.location?.maps_url ?? null;

    return {
      id: photo.id,
      photoUrl: photo.photo_url,
      phase: photo.phase,
      capturedAt: photo.captured_at ?? null,
      uploadedAt: photo.created_at,
      employeeName,
      locationName: photo.location_name ?? assignment.location?.name ?? this.i18n.t('common.noLocation'),
      locationAddress: photo.location_address ?? assignment.location?.address ?? '-',
      assignmentStartAt: assignment.start_at,
      assignmentEndAt: assignment.end_at,
      latitude,
      longitude,
      accuracyM: photo.accuracy_m ?? null,
      headingDeg: photo.heading_deg ?? null,
      mapUrl
    };
  }

  locationOptionLabel(location: Location): string {
    const parts = [location.name, location.address?.trim() || '', location.state?.trim() || ''].filter(Boolean);
    return parts.join(' - ');
  }

  async downloadBatch(rows: WorkPhotoRow[]): Promise<void> {
    if (rows.length === 0 || this.downloadingBatch()) {
      return;
    }

    this.downloadingBatch.set(true);
    try {
      const JSZip = await this.ensureJsZip();
      const zip = new JSZip();
      const zipBaseName = this.buildZipBaseName();

      await Promise.all(
        rows.map(async (row, index) => {
          const blob = await this.fetchPhotoBlob(row.photoUrl);
          const ordinal = String(index + 1).padStart(3, '0');
          const extension = this.fileExtensionFromUrl(row.photoUrl);
          const base = this.safeFileName(`${row.employeeName}-${row.locationName}-${row.phase}`);
          const filename = `${ordinal}-${base}.${extension}`;
          zip.file(filename, blob);
        })
      );

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      this.triggerDownload(zipBlob, `${zipBaseName}.zip`);
      this.toastService.success(this.i18n.t('photos.downloadStarted').replace('{count}', String(rows.length)));
    } catch (error) {
      this.toastService.error((error as Error).message || this.i18n.t('photos.downloadZipError'));
    } finally {
      this.downloadingBatch.set(false);
    }
  }

  private async fetchPhotoBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao baixar foto (${response.status}).`);
    }
    return response.blob();
  }

  private fileExtensionFromUrl(url: string): string {
    const clean = url.split('?')[0];
    const match = clean.match(/\.([a-zA-Z0-9]+)$/);
    const ext = match?.[1]?.toLowerCase();
    if (!ext) {
      return 'jpg';
    }
    return ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  private buildZipBaseName(): string {
    const { employeeProfileId, locationId, startDate, endDate } = this.filtersForm.getRawValue();
    const employeeName = employeeProfileId
      ? this.collaborators().find((item) => item.profile.id === employeeProfileId)?.profile.full_name ?? 'all-collaborators'
      : 'all-collaborators';
    const locationName = locationId
      ? this.locations().find((item) => item.id === locationId)?.name ?? 'all-locations'
      : 'all-locations';
    const range = `${startDate}_${endDate}`;
    return this.safeFileName(`photos-${employeeName}-${locationName}-${range}`);
  }

  private async ensureJsZip(): Promise<JsZipConstructor> {
    if (window.JSZip) {
      return window.JSZip;
    }

    const existing = document.getElementById('jszip-cdn');
    if (existing) {
      await this.waitForJsZip(2500);
      if (window.JSZip) {
        return window.JSZip;
      }
      throw new Error(this.i18n.t('photos.downloadZipError'));
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'jszip-cdn';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(this.i18n.t('photos.downloadZipError')));
      document.head.appendChild(script);
    });

    await this.waitForJsZip(2500);
    if (!window.JSZip) {
      throw new Error(this.i18n.t('photos.downloadZipError'));
    }
    return window.JSZip;
  }

  private async waitForJsZip(timeoutMs: number): Promise<void> {
    const startedAt = Date.now();
    while (!window.JSZip && Date.now() - startedAt < timeoutMs) {
      await new Promise<void>((resolve) => setTimeout(resolve, 80));
    }
  }

  private safeFileName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  private buildGroups(rows: WorkPhotoRow[], mode: GroupByMode): PhotoGroup[] {
    if (rows.length === 0) {
      return [];
    }

    if (mode === 'NONE') {
      return [{ key: 'all', label: this.i18n.t('photos.groupNone'), rows }];
    }

    const groups = new Map<string, PhotoGroup>();
    for (const row of rows) {
      const key = this.groupKeyForRow(row, mode);
      const label = this.groupLabelForRow(row, mode);
      const current = groups.get(key);
      if (current) {
        current.rows.push(row);
      } else {
        groups.set(key, { key, label, rows: [row] });
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  private groupKeyForRow(row: WorkPhotoRow, mode: GroupByMode): string {
    if (mode === 'EMPLOYEE') {
      return `employee:${row.employeeName}`;
    }
    if (mode === 'LOCATION') {
      return `location:${row.locationName}`;
    }
    const baseDate = row.capturedAt || row.uploadedAt;
    return `day:${baseDate.slice(0, 10)}`;
  }

  private groupLabelForRow(row: WorkPhotoRow, mode: GroupByMode): string {
    if (mode === 'EMPLOYEE') {
      return `${this.i18n.t('photos.groupEmployee')}: ${row.employeeName}`;
    }
    if (mode === 'LOCATION') {
      return `${this.i18n.t('photos.groupLocation')}: ${row.locationName}`;
    }
    const baseDate = row.capturedAt || row.uploadedAt;
    return `${this.i18n.t('photos.groupDay')}: ${this.formatGroupDay(baseDate)}`;
  }

  private formatGroupDay(dateIso: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'America/Fortaleza'
    }).format(new Date(dateIso));
  }

  private defaultStartDate(): string {
    const base = new Date();
    base.setDate(base.getDate() - 30);
    return this.toDateInput(base);
  }

  private defaultEndDate(): string {
    return this.toDateInput(new Date());
  }

  private toDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private dateStartFortalezaIso(value: string): string {
    return new Date(`${value}T00:00:00-03:00`).toISOString();
  }

  private dateEndFortalezaIso(value: string): string {
    return new Date(`${value}T23:59:59.999-03:00`).toISOString();
  }
}
