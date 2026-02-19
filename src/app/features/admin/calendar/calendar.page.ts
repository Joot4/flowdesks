import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DateAdapter, MAT_DATE_FORMATS, MatDateFormats, MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, DatesSetArg, EventClickArg, EventDropArg, EventInput, EventContentArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import enGbLocale from '@fullcalendar/core/locales/en-gb';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { AssignmentsService } from '../../../core/supabase/assignments.service';
import { CatalogsService } from '../../../core/supabase/catalogs.service';
import { CollaboratorView, EmployeesService } from '../../../core/supabase/employees.service';
import { ToastService } from '../../../core/ui/toast.service';
import { Assignment, ActivityType, Location } from '../../../shared/models/assignment.model';
import { AssignmentDialogComponent, AssignmentDialogResult } from './assignment.dialog';
import { ReassignDialogComponent, ReassignDialogResult } from './reassign.dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TzDatePipe } from '../../../shared/pipes/tz-date.pipe';
import { TranslatePipe } from '../../../shared/pipes/t.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

interface PaylistRow {
  establishmentName: string;
  address: string;
  location: string;
  state: string;
  dateStart: string;
  dateEnd: string;
  identification: string;
  service: string;
  activityDescription: string;
  status: string;
  qtyOfHourDays: string;
  hourlyRate: string;
  dailyRate: string;
  fixedWage: string;
  expenses: string;
  extras: string;
  deductions: string;
  totalAmount: string;
}

const SHORT_PT_BR_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'dd/MM/yyyy'
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM yyyy'
  }
};

class ShortPtBrDateAdapter extends NativeDateAdapter {
  override format(date: Date): string {
    return formatDate(date, 'dd/MM/yyyy', 'pt-BR');
  }
}

@Component({
  selector: 'app-admin-calendar-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    FullCalendarModule,
    TzDatePipe,
    TranslatePipe
  ],
  providers: [
    { provide: DateAdapter, useClass: ShortPtBrDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: SHORT_PT_BR_DATE_FORMATS }
  ],
  template: `
    <section class="calendar-shell">
      <div class="hero surface-card">
        <div>
          <h2>{{ 'calendar.title' | t }}</h2>
          <p>{{ 'calendar.subtitle' | t }}</p>
        </div>

        <div class="kpis">
          <article>
            <span>{{ 'calendar.total' | t }}</span>
            <strong>{{ assignments().length }}</strong>
          </article>
          <article>
            <span>{{ 'calendar.confirmed' | t }}</span>
            <strong>{{ statusCount('CONFIRMED') }}</strong>
          </article>
          <article>
            <span>{{ 'calendar.planned' | t }}</span>
            <strong>{{ statusCount('PLANNED') }}</strong>
          </article>
          <article>
            <span>{{ 'calendar.cancelled' | t }}</span>
            <strong>{{ statusCount('CANCELLED') }}</strong>
          </article>
        </div>
      </div>

      <form [formGroup]="filters" class="filters surface-card" (ngSubmit)="refresh()">
        <div class="filters-row">
          <mat-form-field appearance="fill">
            <mat-label>{{ 'calendar.employee' | t }}</mat-label>
            <mat-select formControlName="employeeProfileId">
              <mat-option value="">{{ 'common.all' | t }}</mat-option>
              @for (employee of employees(); track employee.profile.id) {
                <mat-option [value]="employee.profile.id">{{ employee.profile.full_name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'calendar.location' | t }}</mat-label>
            <mat-select formControlName="locationId">
              <mat-option value="">{{ 'common.all' | t }}</mat-option>
              @for (location of locations(); track location.id) {
                <mat-option [value]="location.id">{{ location.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'calendar.activity' | t }}</mat-label>
            <mat-select formControlName="activityTypeId">
              <mat-option value="">{{ 'common.all' | t }}</mat-option>
              @for (activityType of activityTypes(); track activityType.id) {
                <mat-option [value]="activityType.id">{{ activityType.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>{{ 'calendar.status' | t }}</mat-label>
            <mat-select formControlName="status">
              <mat-option value="">{{ 'common.all' | t }}</mat-option>
              <mat-option value="PLANNED">Planejado</mat-option>
              <mat-option value="CONFIRMED">Confirmado</mat-option>
              <mat-option value="CANCELLED">Cancelado</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="period-row">
          <mat-form-field appearance="fill" class="date-field">
            <mat-label>{{ 'calendar.periodStart' | t }}</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate" readonly />
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="fill" class="date-field">
            <mat-label>{{ 'calendar.periodEnd' | t }}</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate" readonly />
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>

        <div class="filter-actions">
          <button mat-flat-button color="primary" type="submit">{{ 'calendar.applyFilters' | t }}</button>
          <button mat-stroked-button type="button" (click)="clearFilters()">{{ 'calendar.clear' | t }}</button>
          <button mat-stroked-button type="button" (click)="exportExcel()">{{ 'calendar.exportExcel' | t }}</button>
        </div>
      </form>

      <div class="legend">
        <span><i class="dot planned"></i> Planejado</span>
        <span><i class="dot confirmed"></i> Confirmado</span>
        <span><i class="dot cancelled"></i> Cancelado</span>
      </div>

      <div class="calendar-card surface-card">
        <full-calendar [options]="calendarOptions" />
      </div>

      <section class="list-section surface-card">
        <h3>{{ 'calendar.loadedAssignments' | t }}</h3>
        <div class="list-wrap">
          @for (assignment of assignments(); track assignment.id) {
            <article class="item">
              <div>
                <strong>{{ assignment.start_at | tzDate }} - {{ assignment.end_at | tzDate }}</strong>
                <div class="meta">{{ assignment.activity_type?.name || 'Atividade' }} • {{ assignment.location?.name || 'Sem local' }}</div>
              </div>
              <div class="actions">
                <span class="badge" [class]="badgeClass(assignment.status)">{{ assignment.status }}</span>
                <span class="badge badge-done" *ngIf="assignment.attendance?.done">DONE</span>
                <div class="photos" *ngIf="assignment.attendance?.before_photo_url || assignment.attendance?.after_photo_url">
                  <a *ngIf="assignment.attendance?.before_photo_url" [href]="assignment.attendance?.before_photo_url" target="_blank" class="photo-link">
                    <img [src]="assignment.attendance?.before_photo_url" alt="Foto antes" />
                    <small>Antes</small>
                  </a>
                  <a *ngIf="assignment.attendance?.after_photo_url" [href]="assignment.attendance?.after_photo_url" target="_blank" class="photo-link">
                    <img [src]="assignment.attendance?.after_photo_url" alt="Foto depois" />
                    <small>Depois</small>
                  </a>
                </div>
                <button mat-button (click)="remanejar(assignment)">{{ 'calendar.reassign' | t }}</button>
                <button mat-button color="warn" (click)="askDelete(assignment)">Excluir</button>
              </div>
            </article>
          }
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .calendar-shell {
        display: grid;
        gap: 12px;
        margin-top: 6px;
      }

      .hero {
        padding: 16px;
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 12px;
        background: linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(236, 253, 255, 0.92));
      }

      .hero p {
        margin: 4px 0 0;
        color: #64748b;
      }

      .kpis {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .kpis article {
        padding: 10px;
        border: 1px solid #dbe7f0;
        border-radius: 10px;
        background: #fff;
      }

      .kpis span {
        display: block;
        font-size: 12px;
        color: #64748b;
      }

      .kpis strong {
        font-size: 1.15rem;
      }

      .filters {
        display: grid;
        gap: 14px;
        align-items: stretch;
        padding: 16px;
        background: rgba(255, 255, 255, 0.9);
      }

      .filters-row {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(4, minmax(170px, 1fr));
      }

      .period-row {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(190px, 260px));
      }

      .filter-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        justify-content: flex-start;
        padding-top: 2px;
      }

      .filter-actions button {
        min-height: 40px;
      }

      .date-field .mat-mdc-input-element {
        font-size: 0.9rem;
        letter-spacing: 0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .date-field {
        min-width: 170px;
      }

      .date-field .mat-mdc-form-field-infix {
        width: 100%;
        min-width: 0;
        padding-right: 40px;
      }

      .legend {
        display: flex;
        gap: 14px;
        font-size: 13px;
        color: #475569;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        display: inline-block;
        margin-right: 6px;
      }

      .dot.planned {
        background: #0ea5e9;
      }

      .dot.confirmed {
        background: #16a34a;
      }

      .dot.cancelled {
        background: #64748b;
      }

      .calendar-card {
        padding: 8px;
        background: rgba(255, 255, 255, 0.95);
      }

      .list-section {
        padding: 14px;
        background: rgba(255, 255, 255, 0.88);
      }

      .list-wrap {
        display: grid;
        gap: 8px;
      }

      .item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding: 10px;
        border: 1px solid #d9e2ec;
        border-radius: 10px;
        background: #fff;
      }

      .meta {
        color: #64748b;
        font-size: 13px;
        margin-top: 2px;
      }

      .actions {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }

      .badge {
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
      }

      .badge-planned {
        background: #e0f2fe;
        color: #0369a1;
      }

      .badge-confirmed {
        background: #dcfce7;
        color: #166534;
      }

      .badge-cancelled {
        background: #e2e8f0;
        color: #334155;
      }

      .badge-done {
        background: #dcfce7;
        color: #166534;
      }

      .photos {
        display: flex;
        gap: 6px;
      }

      .photo-link {
        display: grid;
        justify-items: center;
        gap: 2px;
        text-decoration: none;
      }

      .photo-link img {
        width: 38px;
        height: 38px;
        border-radius: 8px;
        border: 1px solid #dbe7f0;
        object-fit: cover;
      }

      .photo-link small {
        font-size: 10px;
        color: #64748b;
      }

      @media (max-width: 1100px) {
        .hero {
          grid-template-columns: 1fr;
        }

        .filters-row {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 720px) {
        .filters {
          gap: 10px;
          padding: 12px;
        }

        .filters-row,
        .period-row {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCalendarPageComponent {
  protected readonly employees = signal<CollaboratorView[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly activityTypes = signal<ActivityType[]>([]);
  protected readonly assignments = signal<Assignment[]>([]);
  private visibleRange: { start: string; end: string } | null = null;

  protected readonly filters = this.formBuilder.group({
    employeeProfileId: this.formBuilder.nonNullable.control(''),
    locationId: this.formBuilder.nonNullable.control(''),
    activityTypeId: this.formBuilder.nonNullable.control(''),
    status: this.formBuilder.nonNullable.control(''),
    startDate: this.formBuilder.control<Date | null>(null),
    endDate: this.formBuilder.control<Date | null>(null)
  });

  protected calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    locale: ptBrLocale,
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    buttonText: {
      today: 'Hoje',
      month: 'Mes',
      week: 'Semana',
      day: 'Dia'
    },
    nowIndicator: true,
    allDaySlot: false,
    slotMinTime: '06:00:00',
    slotMaxTime: '23:00:00',
    height: 'auto',
    selectable: true,
    selectLongPressDelay: 120,
    longPressDelay: 120,
    selectMinDistance: 0,
    editable: true,
    events: [],
    eventContent: (arg: EventContentArg) => ({
      html: `<div class="fc-modern-event"><b>${arg.timeText}</b><span>${arg.event.title}</span></div>`
    }),
    datesSet: (arg) => this.onDatesSet(arg),
    select: (selection) => this.openCreateDialog(selection),
    dateClick: (click) => this.openCreateDialogByClick(click),
    eventClick: (click) => this.openEditDialog(click),
    eventDrop: (drop) => this.onEventDrop(drop)
  };

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly assignmentsService: AssignmentsService,
    private readonly employeesService: EmployeesService,
    private readonly catalogsService: CatalogsService,
    private readonly toastService: ToastService,
    private readonly dialog: MatDialog,
    private readonly overlay: Overlay,
    private readonly i18n: I18nService
  ) {
    effect(() => {
      const lang = this.i18n.language();
      this.calendarOptions.locale = this.resolveCalendarLocale(lang);
      this.calendarOptions.buttonText = this.resolveCalendarButtonText(lang);
      this.calendarOptions = { ...this.calendarOptions };
    });
    void this.bootstrap();
  }

  private resolveCalendarLocale(lang: 'pt-BR' | 'en' | 'es') {
    if (lang === 'en') {
      return enGbLocale;
    }
    if (lang === 'es') {
      return esLocale;
    }
    return ptBrLocale;
  }

  private resolveCalendarButtonText(lang: 'pt-BR' | 'en' | 'es'): { today: string; month: string; week: string; day: string } {
    if (lang === 'en') {
      return { today: 'Today', month: 'Month', week: 'Week', day: 'Day' };
    }
    if (lang === 'es') {
      return { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Dia' };
    }
    return { today: 'Hoje', month: 'Mes', week: 'Semana', day: 'Dia' };
  }

  statusCount(status: Assignment['status']): number {
    return this.assignments().filter((item) => item.status === status).length;
  }

  badgeClass(status: Assignment['status']): string {
    if (status === 'CONFIRMED') {
      return 'badge-confirmed';
    }
    if (status === 'CANCELLED') {
      return 'badge-cancelled';
    }
    return 'badge-planned';
  }

  private async bootstrap(): Promise<void> {
    try {
      const [employees, locations, activityTypes] = await Promise.all([
        this.employeesService.listCollaborators(),
        this.catalogsService.listLocations(),
        this.catalogsService.listActivityTypes()
      ]);
      this.employees.set(employees);
      this.locations.set(locations);
      this.activityTypes.set(activityTypes);
      await this.refresh();
    } catch (error) {
      this.toastService.error((error as Error).message);
    }
  }

  async refresh(): Promise<void> {
    try {
      const filters = this.filters.getRawValue();
      const now = new Date();
      const defaultRangeStart = new Date(now);
      defaultRangeStart.setDate(now.getDate() - 31);
      const defaultRangeEnd = new Date(now);
      defaultRangeEnd.setDate(now.getDate() + 31);

      const rangeStart = filters.startDate
        ? this.toRangeStartIso(filters.startDate)
        : this.visibleRange?.start ?? defaultRangeStart.toISOString();
      const rangeEnd = filters.endDate
        ? this.toRangeEndIso(filters.endDate)
        : this.visibleRange?.end ?? defaultRangeEnd.toISOString();

      const assignments = await this.assignmentsService.listByRange(rangeStart, rangeEnd, {
        employeeProfileId: filters.employeeProfileId || undefined,
        locationId: filters.locationId || undefined,
        activityTypeId: filters.activityTypeId || undefined,
        status: (filters.status || undefined) as Assignment['status'] | undefined
      });

      this.assignments.set(assignments);
      this.calendarOptions.events = assignments.map((assignment) => this.toEventInput(assignment));
    } catch (error) {
      const err = error as Error;
      this.toastService.error(err.message || 'Erro ao carregar agenda.');
      if (!navigator.onLine) {
        const cached = await this.assignmentsService.readCachedAssignments();
        this.assignments.set(cached);
        this.calendarOptions.events = cached.map((assignment) => this.toEventInput(assignment));
      }
    }
  }

  clearFilters(): void {
    this.filters.reset({ employeeProfileId: '', locationId: '', activityTypeId: '', status: '', startDate: null, endDate: null });
    void this.refresh();
  }

  exportExcel(): void {
    const rows = this.buildPaylistRows();
    if (!rows.length) {
      this.toastService.info('Nao ha alocacoes para exportar.');
      return;
    }

    const headers = [
      'INFORMATIONS - NAME',
      'ADDRESS',
      'LOCATION',
      'STATE',
      'DATE START',
      'DATE END',
      'CREW - IDENTIFICATION',
      'CREW - SERVICE',
      'CREW - ACTIVITY DESCRIPTION',
      'CREW - STATUS',
      'QTY. OF HOUR/DAYS',
      'HOURLY RATE',
      'DAILY RATE',
      "EMPLOYEE'S FIXED WAGE",
      'EXPENSES',
      'EXTRAS',
      'DEDUCTIONS',
      'TOTAL AMOUNT'
    ];

    const lines = [
      headers.join(';'),
      ...rows.map((row) =>
        [
          row.establishmentName,
          row.address,
          row.location,
          row.state,
          row.dateStart,
          row.dateEnd,
          row.identification,
          row.service,
          row.activityDescription,
          row.status,
          row.qtyOfHourDays,
          row.hourlyRate,
          row.dailyRate,
          row.fixedWage,
          row.expenses,
          row.extras,
          row.deductions,
          row.totalAmount
        ]
          .map((value) => this.toCsvCell(value))
          .join(';')
      )
    ];

    const csv = `\uFEFF${lines.join('\n')}`;
    this.downloadFile(`paylist-${this.timestampSuffix()}.csv`, csv, 'text/csv;charset=utf-8;');
  }

  private toEventInput(assignment: Assignment): EventInput {
    const employeeName = this.employees().find((item) => item.profile.id === assignment.employee_profile_id)?.profile.full_name ?? 'Colaborador';

    const palette = assignment.attendance?.done
      ? { bg: '#22c55e', border: '#15803d', className: 'fc-event-confirmed' }
      : assignment.status === 'CANCELLED'
      ? { bg: '#94a3b8', border: '#64748b', className: 'fc-event-cancelled' }
      : assignment.status === 'CONFIRMED'
      ? { bg: '#22c55e', border: '#16a34a', className: 'fc-event-confirmed' }
      : { bg: '#38bdf8', border: '#0ea5e9', className: 'fc-event-planned' };

    return {
      id: assignment.id,
      title: `${employeeName} • ${assignment.activity_type?.name ?? 'Atividade'}`,
      start: assignment.start_at,
      end: assignment.end_at,
      backgroundColor: palette.bg,
      borderColor: palette.border,
      classNames: [palette.className]
    };
  }

  private openCreateDialog(selection: DateSelectArg): void {
    if (!navigator.onLine) {
      this.toastService.info('Sem internet: criacao/edicao bloqueadas no modo offline.');
      return;
    }

    const dialogRef = this.dialog.open(AssignmentDialogComponent, {
      hasBackdrop: true,
      autoFocus: false,
      restoreFocus: true,
      scrollStrategy: this.dialogScrollStrategy(),
      width: '94vw',
      maxWidth: '1100px',
      panelClass: 'assignment-dialog-panel',
      data: {
        employees: this.employees(),
        locations: this.locations(),
        activityTypes: this.activityTypes(),
        selectedStart: selection.start,
        selectedEnd: selection.end
      }
    });

    dialogRef.afterClosed().subscribe((result: AssignmentDialogResult | undefined) => {
      if (!result) {
        return;
      }
      void this.saveAssignment(result);
    });
  }

  private openCreateDialogByClick(click: DateClickArg): void {
    const start = new Date(click.date);
    const end = new Date(click.date);

    if (click.allDay) {
      start.setHours(8, 0, 0, 0);
      end.setHours(18, 0, 0, 0);
    } else {
      end.setHours(end.getHours() + 1);
    }

    const pseudoSelection: DateSelectArg = {
      allDay: false,
      start,
      end,
      startStr: start.toISOString(),
      endStr: end.toISOString(),
      view: click.view,
      jsEvent: click.jsEvent
    };

    this.openCreateDialog(pseudoSelection);
  }

  private openEditDialog(click: EventClickArg): void {
    const assignment = this.assignments().find((item) => item.id === click.event.id);
    if (!assignment) {
      return;
    }

    const dialogRef = this.dialog.open(AssignmentDialogComponent, {
      hasBackdrop: true,
      autoFocus: false,
      restoreFocus: true,
      scrollStrategy: this.dialogScrollStrategy(),
      width: '94vw',
      maxWidth: '1100px',
      panelClass: 'assignment-dialog-panel',
      data: {
        assignment,
        employees: this.employees(),
        locations: this.locations(),
        activityTypes: this.activityTypes()
      }
    });

    dialogRef.afterClosed().subscribe((result: AssignmentDialogResult | undefined) => {
      if (!result) {
        return;
      }
      void this.saveAssignment(result);
    });

    click.jsEvent.preventDefault();
  }

  private async saveAssignment(input: AssignmentDialogResult): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.info('Sem internet: criacao/edicao bloqueadas no modo offline.');
      return;
    }

    try {
      if (input.id && input.recurrence_group_id) {
        const ref = this.dialog.open(ConfirmDialogComponent, {
          data: {
            title: 'Atualizar repeticao',
            message: 'Deseja atualizar somente esta alocacao ou toda a serie?',
            confirmText: 'Atualizar serie',
            confirmValue: 'series',
            secondaryActionText: 'Atualizar esta',
            secondaryActionValue: 'single',
            secondaryActionColor: 'primary'
          }
        });

        ref.afterClosed().subscribe((action: 'series' | 'single' | boolean | undefined) => {
          if (action === 'series') {
            void this.updateSeriesWithHandling(input);
            return;
          }
          if (action === 'single') {
            void this.upsertSingleAndRefresh(input);
          }
        });
        return;
      }

      await this.upsertSingleAndRefresh(input);
    } catch (error) {
      this.handleAssignmentError(error);
    }
  }

  private async upsertSingleAndRefresh(input: AssignmentDialogResult): Promise<void> {
    try {
      await this.upsertSingle(input);
      await this.refresh();
    } catch (error) {
      this.handleAssignmentError(error);
    }
  }

  private async upsertSingle(input: AssignmentDialogResult): Promise<void> {
    const recurrenceGroupId =
      !input.id && input.repeat_count > 0 ? input.recurrence_group_id ?? crypto.randomUUID() : input.recurrence_group_id ?? null;

    await this.assignmentsService.upsert({
      id: input.id,
      recurrence_group_id: recurrenceGroupId,
      employee_profile_id: input.employee_profile_id,
      start_at: input.start_at,
      end_at: input.end_at,
      location_id: input.location_id,
      activity_type_id: input.activity_type_id,
      details: input.details,
      qty_of_hour_days: input.qty_of_hour_days,
      hourly_rate: input.hourly_rate,
      daily_rate: input.daily_rate,
      fixed_wage: input.fixed_wage,
      expenses: input.expenses,
      extras: input.extras,
      deductions: input.deductions,
      total_amount: input.total_amount,
      status: input.status
    });

    const createdRepeats = !input.id && input.repeat_count > 0 ? await this.createRepeatedAssignments(input, recurrenceGroupId) : 0;
    this.toastService.success(createdRepeats > 0 ? `Alocacao salva com ${createdRepeats} repeticoes.` : 'Alocacao salva.');
  }

  private async updateSeries(input: AssignmentDialogResult): Promise<void> {
    if (!input.recurrence_group_id) {
      return;
    }

    await this.assignmentsService.updateByRecurrenceGroup(input.recurrence_group_id, {
      recurrence_group_id: input.recurrence_group_id,
      employee_profile_id: input.employee_profile_id,
      location_id: input.location_id,
      activity_type_id: input.activity_type_id,
      details: input.details,
      qty_of_hour_days: input.qty_of_hour_days,
      hourly_rate: input.hourly_rate,
      daily_rate: input.daily_rate,
      fixed_wage: input.fixed_wage,
      expenses: input.expenses,
      extras: input.extras,
      deductions: input.deductions,
      total_amount: input.total_amount,
      status: input.status
    });

    this.toastService.success('Serie atualizada.');
    await this.refresh();
  }

  private async updateSeriesWithHandling(input: AssignmentDialogResult): Promise<void> {
    try {
      await this.updateSeries(input);
    } catch (error) {
      this.handleAssignmentError(error);
    }
  }

  private async createRepeatedAssignments(input: AssignmentDialogResult, recurrenceGroupId: string | null): Promise<number> {
    const repeatCount = Math.max(0, Math.trunc(input.repeat_count || 0));
    const repeatIntervalDays = Math.max(1, Math.trunc(input.repeat_interval_days || 1));
    if (repeatCount === 0) {
      return 0;
    }

    let created = 0;
    for (let index = 1; index <= repeatCount; index += 1) {
      const offsetDays = repeatIntervalDays * index;
      const startAt = this.shiftIsoDays(input.start_at, offsetDays);
      const endAt = this.shiftIsoDays(input.end_at, offsetDays);

      await this.assignmentsService.upsert({
        recurrence_group_id: recurrenceGroupId ?? null,
        employee_profile_id: input.employee_profile_id,
        start_at: startAt,
        end_at: endAt,
        location_id: input.location_id,
        activity_type_id: input.activity_type_id,
        details: input.details,
        qty_of_hour_days: input.qty_of_hour_days,
        hourly_rate: input.hourly_rate,
        daily_rate: input.daily_rate,
        fixed_wage: input.fixed_wage,
        expenses: input.expenses,
        extras: input.extras,
        deductions: input.deductions,
        total_amount: input.total_amount,
        status: input.status
      });

      created += 1;
    }

    return created;
  }

  private async onEventDrop(drop: EventDropArg): Promise<void> {
    if (!navigator.onLine) {
      drop.revert();
      this.toastService.info('Sem internet: criacao/edicao bloqueadas no modo offline.');
      return;
    }

    if (!drop.event.start || !drop.event.end) {
      drop.revert();
      return;
    }

    try {
      await this.assignmentsService.updateDates(drop.event.id, drop.event.start.toISOString(), drop.event.end.toISOString());
      this.toastService.success('Datas atualizadas.');
      await this.refresh();
    } catch (error) {
      drop.revert();
      this.handleAssignmentError(error);
    }
  }

  remanejar(assignment: Assignment): void {
    const ref = this.dialog.open(ReassignDialogComponent, {
      hasBackdrop: true,
      autoFocus: false,
      restoreFocus: true,
      scrollStrategy: this.dialogScrollStrategy(),
      width: '94vw',
      maxWidth: '560px',
      panelClass: 'reassign-dialog-panel',
      data: { employees: this.employees(), currentEmployeeProfileId: assignment.employee_profile_id }
    });

    ref.afterClosed().subscribe((result: ReassignDialogResult | undefined) => {
      if (!result) {
        return;
      }
      void this.reassign(assignment.id, result);
    });
  }

  async askDelete(assignment: Assignment): Promise<void> {
    if (assignment.recurrence_group_id) {
      const ref = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Excluir repeticao',
          message: 'Escolha como deseja excluir esta alocacao repetida.',
          confirmText: 'Excluir serie',
          confirmValue: 'series',
          secondaryActionText: 'Excluir esta',
          secondaryActionValue: 'single',
          secondaryActionColor: 'warn'
        }
      });

      ref.afterClosed().subscribe((action: 'series' | 'single' | boolean | undefined) => {
        if (action === 'series') {
          void this.deleteSeries(assignment.recurrence_group_id as string);
          return;
        }

        if (action === 'single') {
          void this.delete(assignment.id);
        }
      });
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Excluir alocacao', message: 'Deseja remover esta alocacao?', confirmText: 'Excluir' }
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }
      void this.delete(assignment.id);
    });
  }

  private async delete(id: string): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.info('Sem internet: criacao/edicao bloqueadas no modo offline.');
      return;
    }

    try {
      await this.assignmentsService.delete(id);
      this.toastService.success('Alocacao removida.');
      await this.refresh();
    } catch (error) {
      this.toastService.error((error as Error).message);
    }
  }

  private async deleteSeries(recurrenceGroupId: string): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.info('Sem internet: criacao/edicao bloqueadas no modo offline.');
      return;
    }

    try {
      await this.assignmentsService.deleteByRecurrenceGroup(recurrenceGroupId);
      this.toastService.success('Serie de repeticao removida.');
      await this.refresh();
    } catch (error) {
      this.toastService.error((error as Error).message);
    }
  }

  private async reassign(assignmentId: string, payload: ReassignDialogResult): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.info('Sem internet: criacao/edicao bloqueadas no modo offline.');
      return;
    }

    try {
      await this.assignmentsService.reassign(assignmentId, payload.toEmployeeProfileId, payload.reason);
      this.toastService.success('Remanejamento concluido.');
      await this.refresh();
    } catch (error) {
      this.handleAssignmentError(error);
    }
  }

  private isMobileDialogViewport(): boolean {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  private dialogScrollStrategy() {
    if (this.isMobileDialogViewport()) {
      return this.overlay.scrollStrategies.reposition();
    }
    return this.overlay.scrollStrategies.block();
  }

  private handleAssignmentError(error: unknown): void {
    const message = (error as Error).message ?? '';
    if (message.includes('assignments_no_overlap')) {
      this.toastService.error('Conflito de horario: colaborador ja possui alocacao nesse intervalo.');
      return;
    }
    this.toastService.error(message || 'Erro ao salvar alocacao.');
  }

  private buildPaylistRows(): PaylistRow[] {
    const employeeById = new Map(
      this.employees().map((item) => [
        item.profile.id,
        {
          name: item.profile.full_name ?? 'Sem nome',
          identification: item.employee?.employee_code ?? item.profile.id
        }
      ])
    );

    return this.assignments().map((assignment) => {
      const employee = employeeById.get(assignment.employee_profile_id);
      const activityName = assignment.activity_type?.name ?? '-';
      const description = assignment.details?.trim() ? assignment.details.trim() : activityName;
      return {
        establishmentName: assignment.establishment_name ?? assignment.location?.name ?? '-',
        address: assignment.assignment_address ?? assignment.location?.address ?? '-',
        location: assignment.assignment_location ?? assignment.location?.name ?? '-',
        state: assignment.assignment_state ?? assignment.location?.state ?? '-',
        dateStart: this.formatDateTimeFortaleza(assignment.start_at),
        dateEnd: this.formatDateTimeFortaleza(assignment.end_at),
        identification: employee?.name ?? 'Sem nome',
        service: activityName,
        activityDescription: description,
        status: assignment.status,
        qtyOfHourDays: this.formatMoneyOrDash(assignment.qty_of_hour_days),
        hourlyRate: this.formatMoneyOrDash(assignment.hourly_rate),
        dailyRate: this.formatMoneyOrDash(assignment.daily_rate),
        fixedWage: this.formatMoneyOrDash(assignment.fixed_wage),
        expenses: this.formatMoneyOrDash(assignment.expenses),
        extras: this.formatMoneyOrDash(assignment.extras),
        deductions: this.formatMoneyOrDash(assignment.deductions),
        totalAmount: this.formatMoneyOrDash(assignment.total_amount)
      };
    });
  }

  private toRangeStartIso(date: Date): string {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 3, 0, 0, 0)).toISOString();
  }

  private shiftIsoDays(isoValue: string, days: number): string {
    const date = new Date(isoValue);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
  }

  private onDatesSet(arg: DatesSetArg): void {
    this.visibleRange = {
      start: arg.start.toISOString(),
      end: arg.end.toISOString()
    };

    const filters = this.filters.getRawValue();
    if (!filters.startDate && !filters.endDate) {
      void this.refresh();
    }
  }

  private toRangeEndIso(date: Date): string {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + 1, 2, 59, 59, 999)).toISOString();
  }

  private formatDateTimeFortaleza(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza'
    }).format(new Date(value));
  }

  private timestampSuffix(): string {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
      .format(new Date())
      .replace(/[^\d]/g, '');
  }

  private downloadFile(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private toCsvCell(value: string): string {
    const escaped = value.replaceAll('"', '""');
    return `"${escaped}"`;
  }

  private formatMoneyOrDash(value?: number | null): string {
    if (value === null || value === undefined) {
      return '-';
    }
    return value.toFixed(2);
  }
}
