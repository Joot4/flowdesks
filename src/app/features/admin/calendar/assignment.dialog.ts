import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { merge } from 'rxjs';
import { Assignment, AssignmentStatus, ActivityType, Location } from '../../../shared/models/assignment.model';
import { CollaboratorView } from '../../../core/supabase/employees.service';

export interface AssignmentDialogData {
  assignment?: Assignment;
  employees: CollaboratorView[];
  locations: Location[];
  activityTypes: ActivityType[];
  selectedStart?: Date;
  selectedEnd?: Date;
}

export interface AssignmentDialogResult {
  id?: string;
  recurrence_group_id?: string | null;
  employee_profile_id: string;
  start_at: string;
  end_at: string;
  location_id: string | null;
  establishment_name: string | null;
  assignment_address: string | null;
  assignment_location: string | null;
  assignment_state: string | null;
  activity_type_id: string | null;
  details: string | null;
  qty_of_hour_days: number | null;
  hourly_rate: number | null;
  daily_rate: number | null;
  fixed_wage: number | null;
  expenses: number | null;
  extras: number | null;
  deductions: number | null;
  total_amount: number | null;
  repeat_count: number;
  repeat_interval_days: number;
  status: AssignmentStatus;
}

@Component({
  selector: 'app-assignment-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.assignment ? 'Editar alocacao' : 'Nova alocacao' }}</h2>
    <mat-dialog-content>
      <form class="form" [formGroup]="form">
        <h3 class="section-title">Informations</h3>
        <div class="info-select-grid">
          <mat-form-field appearance="fill">
            <mat-label>Location (cadastro)</mat-label>
            <mat-select formControlName="location_id">
              <mat-option [value]="null">Sem local</mat-option>
              @for (location of data.locations; track location.id) {
                <mat-option [value]="location.id">{{ location.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Address</mat-label>
            <input matInput [value]="selectedLocationAddress" readonly />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>State</mat-label>
            <input matInput [value]="selectedLocationState" readonly />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Date Inicio</mat-label>
            <input matInput [matDatepicker]="startDatePicker" formControlName="start_date" readonly />
            <mat-datepicker-toggle matIconSuffix [for]="startDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #startDatePicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Hora Inicio</mat-label>
            <input matInput type="time" formControlName="start_time" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Date Fim</mat-label>
            <input matInput [matDatepicker]="endDatePicker" formControlName="end_date" readonly />
            <mat-datepicker-toggle matIconSuffix [for]="endDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #endDatePicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Hora Fim</mat-label>
            <input matInput type="time" formControlName="end_time" />
          </mat-form-field>
        </div>

        <h3 class="section-title">Crew Information</h3>
        <div class="crew-grid">
          <mat-form-field appearance="fill">
            <mat-label>Identification (nome do colaborador)</mat-label>
            <mat-select formControlName="employee_profile_id">
              @for (employee of data.employees; track employee.profile.id) {
                <mat-option [value]="employee.profile.id">{{ employee.profile.full_name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Service (atividade cadastrada)</mat-label>
            <mat-select formControlName="activity_type_id">
              <mat-option [value]="null">Nenhuma</mat-option>
              @for (activityType of data.activityTypes; track activityType.id) {
                <mat-option [value]="activityType.id">{{ activityType.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Descricao da atividade (manual)</mat-label>
            <textarea matInput formControlName="details" rows="2" placeholder="Digite a descricao ou deixe em branco para usar a atividade selecionada"></textarea>
            <mat-hint>Opcional</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="PLANNED">Planejado</mat-option>
              <mat-option value="CONFIRMED">Confirmado</mat-option>
              <mat-option value="CANCELLED">Cancelado</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        @if (!data.assignment) {
          <h3 class="section-title">Repeticao</h3>
          <div class="repeat-grid">
            <mat-form-field appearance="fill">
              <mat-label>Repetir (vezes adicionais)</mat-label>
              <input matInput type="number" min="0" max="60" formControlName="repeat_count" />
              <mat-hint>0 = sem repeticao</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Intervalo (dias)</mat-label>
              <input matInput type="number" min="1" max="30" formControlName="repeat_interval_days" />
            </mat-form-field>
          </div>
        }

        <h3 class="section-title">Wages Breakdown</h3>
        <div class="wages-grid">
          <mat-form-field appearance="fill">
            <mat-label>Qty. of Hour/Days</mat-label>
            <input matInput type="number" step="0.01" formControlName="qty_of_hour_days" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Hourly Rate</mat-label>
            <input matInput type="number" step="0.01" formControlName="hourly_rate" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Daily Rate</mat-label>
            <input matInput type="number" step="0.01" formControlName="daily_rate" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Employee's Fixed Wage</mat-label>
            <input matInput type="number" step="0.01" formControlName="fixed_wage" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Expenses</mat-label>
            <input matInput type="number" step="0.01" formControlName="expenses" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Extras</mat-label>
            <input matInput type="number" step="0.01" formControlName="extras" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Deductions</mat-label>
            <input matInput type="number" step="0.01" formControlName="deductions" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Total Amount</mat-label>
            <input matInput type="number" step="0.01" formControlName="total_amount" readonly />
            <mat-hint>Calculado automaticamente</mat-hint>
          </mat-form-field>
        </div>
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
        min-width: 520px;
        display: grid;
        gap: 10px;
      }

      .info-select-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(3, minmax(120px, 1fr));
      }

      .crew-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
      }

      .section-title {
        margin: 4px 0 0;
        font-size: 0.95rem;
        color: #1f2937;
      }

      .wages-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(4, minmax(120px, 1fr));
      }

      .repeat-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(120px, 1fr));
      }

      @media (max-width: 700px) {
        .form {
          min-width: 100%;
        }

        .info-select-grid,
        .crew-grid {
          grid-template-columns: 1fr;
        }

        .wages-grid {
          grid-template-columns: 1fr;
        }

        .repeat-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentDialogComponent {
  private readonly repeatPrefs = this.readRepeatPrefs();

  readonly form = this.formBuilder.nonNullable.group({
    id: [this.data.assignment?.id ?? ''],
    recurrence_group_id: [this.data.assignment?.recurrence_group_id ?? null],
    employee_profile_id: [this.data.assignment?.employee_profile_id ?? '', Validators.required],
    start_date: [this.toDateControl(this.data.assignment?.start_at, this.data.selectedStart), Validators.required],
    start_time: [this.toTimeControl(this.data.assignment?.start_at, this.data.selectedStart), Validators.required],
    end_date: [this.toDateControl(this.data.assignment?.end_at, this.data.selectedEnd), Validators.required],
    end_time: [this.toTimeControl(this.data.assignment?.end_at, this.data.selectedEnd), Validators.required],
    location_id: [this.data.assignment?.location_id ?? null],
    activity_type_id: [this.data.assignment?.activity_type_id ?? null],
    details: [this.data.assignment?.details ?? null],
    qty_of_hour_days: [this.data.assignment?.qty_of_hour_days ?? null],
    hourly_rate: [this.data.assignment?.hourly_rate ?? null],
    daily_rate: [this.data.assignment?.daily_rate ?? null],
    fixed_wage: [this.data.assignment?.fixed_wage ?? null],
    expenses: [this.data.assignment?.expenses ?? null],
    extras: [this.data.assignment?.extras ?? null],
    deductions: [this.data.assignment?.deductions ?? null],
    total_amount: [this.data.assignment?.total_amount ?? null],
    repeat_count: [this.data.assignment ? 0 : this.repeatPrefs.repeatCount, [Validators.min(0), Validators.max(60)]],
    repeat_interval_days: [this.data.assignment ? 7 : this.repeatPrefs.repeatIntervalDays, [Validators.min(1), Validators.max(30)]],
    status: [this.data.assignment?.status ?? 'PLANNED', Validators.required]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly dialogRef: MatDialogRef<AssignmentDialogComponent, AssignmentDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: AssignmentDialogData
  ) {
    this.form.controls.total_amount.disable({ emitEvent: false });
    this.setupTotalAmountAutoCalculation();
    this.recalculateTotalAmount();
  }

  get selectedLocationName(): string {
    const selected = this.selectedLocation();
    return selected?.name ?? this.data.assignment?.establishment_name ?? '-';
  }

  get selectedLocationAddress(): string {
    const selected = this.selectedLocation();
    return selected?.address ?? this.data.assignment?.assignment_address ?? '-';
  }

  get selectedLocationState(): string {
    const selected = this.selectedLocation();
    return selected?.state ?? this.data.assignment?.assignment_state ?? '-';
  }

  get selectedActivityDescription(): string {
    const activityTypeId = this.form.controls.activity_type_id.value;
    if (!activityTypeId) {
      return '-';
    }
    const activity = this.data.activityTypes.find((item) => item.id === activityTypeId);
    return activity?.name ?? '-';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saveRepeatPrefs(raw.repeat_count, raw.repeat_interval_days);
    if (!raw.start_date || !raw.end_date) {
      this.form.markAllAsTouched();
      return;
    }

    const startAtIso = this.combineDateAndTime(raw.start_date, raw.start_time);
    const endAtIso = this.combineDateAndTime(raw.end_date, raw.end_time);

    this.dialogRef.close({
      id: raw.id || undefined,
      recurrence_group_id: raw.recurrence_group_id,
      employee_profile_id: raw.employee_profile_id,
      start_at: startAtIso,
      end_at: endAtIso,
      location_id: raw.location_id,
      establishment_name: this.normalizeDash(this.selectedLocationName),
      assignment_address: this.normalizeDash(this.selectedLocationAddress),
      assignment_location: this.normalizeDash(this.selectedLocationName),
      assignment_state: this.normalizeDash(this.selectedLocationState),
      activity_type_id: raw.activity_type_id,
      details: raw.details?.trim() ? raw.details.trim() : this.selectedActivityDescription !== '-' ? this.selectedActivityDescription : null,
      qty_of_hour_days: raw.qty_of_hour_days,
      hourly_rate: raw.hourly_rate,
      daily_rate: raw.daily_rate,
      fixed_wage: raw.fixed_wage,
      expenses: raw.expenses,
      extras: raw.extras,
      deductions: raw.deductions,
      total_amount: raw.total_amount,
      repeat_count: raw.repeat_count,
      repeat_interval_days: raw.repeat_interval_days,
      status: raw.status
    });
  }

  private toDateControl(isoDate?: string, fallback?: Date): Date | null {
    const base = isoDate ? new Date(isoDate) : fallback ?? null;
    if (!base) {
      return null;
    }
    return new Date(base.getFullYear(), base.getMonth(), base.getDate());
  }

  private toTimeControl(isoDate?: string, fallback?: Date): string {
    const base = isoDate ? new Date(isoDate) : fallback ?? null;
    if (!base) {
      return '08:00';
    }
    const hours = String(base.getHours()).padStart(2, '0');
    const minutes = String(base.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private combineDateAndTime(date: Date, time: string): string {
    const [hoursRaw, minutesRaw] = time.split(':');
    const hours = Number(hoursRaw || '0');
    const minutes = Number(minutesRaw || '0');
    const merged = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
    return merged.toISOString();
  }

  private selectedLocation(): Location | null {
    const locationId = this.form.controls.location_id.value;
    if (!locationId) {
      return null;
    }
    return this.data.locations.find((item) => item.id === locationId) ?? null;
  }

  private normalizeDash(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === '-' ? null : trimmed;
  }

  private setupTotalAmountAutoCalculation(): void {
    merge(
      this.form.controls.qty_of_hour_days.valueChanges,
      this.form.controls.hourly_rate.valueChanges,
      this.form.controls.daily_rate.valueChanges,
      this.form.controls.fixed_wage.valueChanges,
      this.form.controls.expenses.valueChanges,
      this.form.controls.extras.valueChanges,
      this.form.controls.deductions.valueChanges
    ).subscribe(() => this.recalculateTotalAmount());
  }

  private recalculateTotalAmount(): void {
    const qty = this.toNumber(this.form.controls.qty_of_hour_days.value);
    const hourlyRate = this.toNumber(this.form.controls.hourly_rate.value);
    const dailyRate = this.toNumber(this.form.controls.daily_rate.value);
    const fixedWage = this.toNumber(this.form.controls.fixed_wage.value);
    const expenses = this.toNumber(this.form.controls.expenses.value);
    const extras = this.toNumber(this.form.controls.extras.value);
    const deductions = this.toNumber(this.form.controls.deductions.value);

    const rateBase = dailyRate > 0 ? dailyRate : hourlyRate;
    const variableAmount = qty * rateBase;
    const total = variableAmount + fixedWage + expenses + extras - deductions;
    const rounded = Math.round(total * 100) / 100;

    this.form.controls.total_amount.setValue(rounded, { emitEvent: false });
  }

  private toNumber(value: number | null): number {
    return value ?? 0;
  }

  private readRepeatPrefs(): { repeatCount: number; repeatIntervalDays: number } {
    try {
      const raw = localStorage.getItem('assignment-repeat-prefs');
      if (!raw) {
        return { repeatCount: 0, repeatIntervalDays: 7 };
      }
      const parsed = JSON.parse(raw) as { repeatCount?: number; repeatIntervalDays?: number };
      const repeatCount = this.normalizeRepeatCount(parsed.repeatCount);
      const repeatIntervalDays = this.normalizeRepeatInterval(parsed.repeatIntervalDays);
      return { repeatCount, repeatIntervalDays };
    } catch {
      return { repeatCount: 0, repeatIntervalDays: 7 };
    }
  }

  private saveRepeatPrefs(repeatCount: number, repeatIntervalDays: number): void {
    const payload = {
      repeatCount: this.normalizeRepeatCount(repeatCount),
      repeatIntervalDays: this.normalizeRepeatInterval(repeatIntervalDays)
    };
    localStorage.setItem('assignment-repeat-prefs', JSON.stringify(payload));
  }

  private normalizeRepeatCount(value?: number): number {
    const parsed = Number.isFinite(value) ? Math.trunc(value as number) : 0;
    if (parsed < 0) {
      return 0;
    }
    if (parsed > 60) {
      return 60;
    }
    return parsed;
  }

  private normalizeRepeatInterval(value?: number): number {
    const parsed = Number.isFinite(value) ? Math.trunc(value as number) : 7;
    if (parsed < 1) {
      return 1;
    }
    if (parsed > 30) {
      return 30;
    }
    return parsed;
  }
}
