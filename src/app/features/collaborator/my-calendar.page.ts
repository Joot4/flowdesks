import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import enGbLocale from '@fullcalendar/core/locales/en-gb';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { AssignmentsService } from '../../core/supabase/assignments.service';
import { SessionStore } from '../../core/supabase/session.store';
import { ToastService } from '../../core/ui/toast.service';
import { Assignment } from '../../shared/models/assignment.model';
import { TzDatePipe } from '../../shared/pipes/tz-date.pipe';
import { AssignmentDetailDialogComponent, AssignmentDetailDialogResult } from './assignment-detail.dialog';
import { TranslatePipe } from '../../shared/pipes/t.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-my-calendar-page',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, MatCardModule, TzDatePipe, TranslatePipe],
  template: `
    <section class="calendar-shell">
      <div class="hero surface-card">
        <h2>{{ 'me.title' | t }}</h2>
        <p>{{ 'me.subtitle' | t }}</p>
      </div>

      <div class="summary surface-card">
        <article>
          <span>{{ 'me.upcoming' | t }}</span>
          <strong>{{ upcomingAssignments().length }}</strong>
        </article>
        <article>
          <span>{{ 'me.done' | t }}</span>
          <strong>{{ doneCount() }}</strong>
        </article>
        <article>
          <span>{{ 'me.pending' | t }}</span>
          <strong>{{ pendingCount() }}</strong>
        </article>
      </div>

      <div class="legend">
        <span><i class="dot"></i> Compromissos ativos</span>
      </div>

      <div class="calendar-card surface-card">
        <full-calendar [options]="calendarOptions" />
      </div>

      <mat-card class="surface-card list-card">
        <h3>{{ 'me.upcoming' | t }}</h3>
        <div class="list-wrap">
          @for (assignment of upcomingAssignments(); track assignment.id) {
            <article class="item" (click)="openDetailById(assignment.id)">
              <div>
                <div class="when">{{ assignment.start_at | tzDate }} - {{ assignment.end_at | tzDate }}</div>
                <div class="what">{{ assignment.activity_type?.name || 'Atividade' }}</div>
                <div class="where">{{ assignment.location?.name || 'Sem local' }}</div>
              </div>
              <div class="chevron">›</div>
            </article>
          } @empty {
            <article class="item">Sem proximas alocacoes.</article>
          }
        </div>
      </mat-card>

      <mat-card class="surface-card list-card">
        <h3>{{ 'me.history' | t }}</h3>
        <div class="list-wrap">
          @for (assignment of historyAssignments(); track assignment.id) {
            <article class="item" (click)="openDetailById(assignment.id)">
              <div>
                <div class="when">{{ assignment.start_at | tzDate }} - {{ assignment.end_at | tzDate }}</div>
                <div class="what">{{ assignment.activity_type?.name || 'Atividade' }}</div>
                <div class="where">{{ assignment.location?.name || 'Sem local' }}</div>
                <div class="where">Status ponto: {{ assignment.attendance?.status || 'NOT_STARTED' }}</div>
              </div>
              <div class="chevron">›</div>
            </article>
          } @empty {
            <article class="item">Sem historico no periodo carregado.</article>
          }
        </div>
      </mat-card>
    </section>
  `,
  styles: [
    `
      .calendar-shell {
        display: grid;
        gap: 12px;
      }

      .hero {
        padding: 14px;
        background: linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(240, 249, 255, 0.92));
      }

      .hero p {
        margin: 4px 0 0;
        color: #64748b;
      }

      .summary {
        padding: 10px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .summary article {
        border: 1px solid #dbe7f0;
        border-radius: 10px;
        background: #fff;
        padding: 10px;
      }

      .summary span {
        display: block;
        color: #64748b;
        font-size: 12px;
      }

      .summary strong {
        font-size: 1.2rem;
      }

      .legend {
        font-size: 13px;
        color: #475569;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        display: inline-block;
        margin-right: 6px;
        background: #0ea5e9;
      }

      .calendar-card {
        padding: 8px;
        background: rgba(255, 255, 255, 0.95);
      }

      .list-card {
        padding: 12px;
        background: rgba(255, 255, 255, 0.9);
      }

      .list-wrap {
        display: grid;
        gap: 8px;
      }

      .item {
        border: 1px solid #dbe7f0;
        border-radius: 10px;
        padding: 10px;
        background: #fff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      .when {
        font-weight: 600;
      }

      .what,
      .where {
        color: #64748b;
        font-size: 13px;
      }

      .chevron {
        color: #94a3b8;
        font-size: 24px;
        line-height: 1;
      }

      @media (max-width: 700px) {
        .summary {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyCalendarPageComponent {
  protected readonly assignments = signal<Assignment[]>([]);
  protected readonly doneCount = computed<number>(() => this.assignments().filter((item) => !!item.attendance?.done).length);
  protected readonly pendingCount = computed<number>(() => this.assignments().filter((item) => !item.attendance?.done).length);
  protected readonly upcomingAssignments = computed<Assignment[]>(() => {
    const now = new Date();
    return this.assignments()
      .filter((assignment) => new Date(assignment.end_at) >= now && !assignment.attendance?.done)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  });
  protected readonly historyAssignments = computed<Assignment[]>(() => {
    const now = new Date();
    return this.assignments()
      .filter((assignment) => new Date(assignment.end_at) < now || assignment.attendance?.done)
      .sort((a, b) => new Date(b.end_at).getTime() - new Date(a.end_at).getTime())
      .slice(0, 50);
  });

  protected calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin],
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
    editable: false,
    events: [],
    eventContent: (arg: EventContentArg) => ({
      html: `<div class="fc-modern-event"><b>${arg.timeText}</b><span>${arg.event.title}</span></div>`
    }),
    eventClick: (click) => this.openDetail(click)
  };

  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly sessionStore: SessionStore,
    private readonly toastService: ToastService,
    private readonly dialog: MatDialog,
    private readonly i18n: I18nService
  ) {
    effect(() => {
      const lang = this.i18n.language();
      this.calendarOptions.locale = this.resolveCalendarLocale(lang);
      this.calendarOptions.buttonText = this.resolveCalendarButtonText(lang);
      this.calendarOptions = { ...this.calendarOptions };
    });

    effect(() => {
      const profileId = this.sessionStore.profile()?.id;
      if (!profileId) {
        return;
      }
      void this.load(profileId);
    });
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

  private async load(profileId: string): Promise<void> {
    try {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 365);
      const end = new Date(now);
      end.setDate(now.getDate() + 90);

      const data = await this.assignmentsService.listByRange(start.toISOString(), end.toISOString(), {
        employeeProfileId: profileId
      });

      this.assignments.set(data);
      this.calendarOptions.events = data.map((assignment) => this.toEvent(assignment));
    } catch (error) {
      if (!navigator.onLine) {
        const cached = await this.assignmentsService.readCachedAssignments();
        this.assignments.set(cached);
        this.calendarOptions.events = cached.map((assignment) => this.toEvent(assignment));
        return;
      }
      this.toastService.error((error as Error).message);
    }
  }

  private toEvent(assignment: Assignment): EventInput {
    return {
      id: assignment.id,
      title: `${assignment.activity_type?.name ?? 'Atividade'} • ${assignment.location?.name ?? 'Sem local'}`,
      start: assignment.start_at,
      end: assignment.end_at,
      backgroundColor: assignment.attendance?.done ? '#16a34a' : '#38bdf8',
      borderColor: assignment.attendance?.done ? '#15803d' : '#0ea5e9',
      classNames: [assignment.attendance?.done ? 'fc-event-confirmed' : 'fc-event-planned']
    };
  }

  private openDetail(click: EventClickArg): void {
    const assignment = this.assignments().find((item) => item.id === click.event.id);
    if (!assignment) {
      return;
    }

    this.openDetailForAssignment(assignment);
  }

  protected openDetailById(assignmentId: string): void {
    const assignment = this.assignments().find((item) => item.id === assignmentId);
    if (!assignment) {
      return;
    }

    this.openDetailForAssignment(assignment);
  }

  private openDetailForAssignment(assignment: Assignment): void {
    const ref = this.dialog.open(AssignmentDetailDialogComponent, { data: { assignment } });
    ref.afterClosed().subscribe((result: AssignmentDetailDialogResult | undefined) => {
      if (!result) {
        return;
      }
      void this.punch(assignment.id, result);
    });
  }

  private async punch(assignmentId: string, result: AssignmentDetailDialogResult): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.info('Sem internet: nao e possivel bater ponto no modo offline.');
      return;
    }

    try {
      const photoUrl = await this.assignmentsService.uploadAttendancePhoto(assignmentId, result.action, result.file);
      const geo = await this.getCurrentPosition();
      await this.assignmentsService.punch(assignmentId, result.action, photoUrl, geo);
      this.toastService.success(result.action === 'IN' ? 'Entrada registrada com sucesso.' : 'Saida registrada com sucesso.');
      const profileId = this.sessionStore.profile()?.id;
      if (!profileId) {
        return;
      }
      await this.load(profileId);
    } catch (error) {
      const message = (error as Error).message || 'Nao foi possivel registrar ponto.';
      if (message.toLowerCase().includes('cercado virtual') || message.toLowerCase().includes('localizacao atual obrigatoria')) {
        this.toastService.error('Voce esta fora do cercado virtual permitido para este local.');
        return;
      }
      if (message.toLowerCase().includes('baixa precisao')) {
        this.toastService.error('GPS com baixa precisao. Tente novamente em area aberta.');
        return;
      }
      this.toastService.error(message);
    }
  }

  private async getCurrentPosition(): Promise<{ lat: number; lng: number; accuracyM?: number }> {
    if (!navigator.geolocation) {
      throw new Error('Geolocalizacao nao suportada neste dispositivo.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: position.coords.accuracy
          });
        },
        (err) => reject(new Error(err.message || 'Nao foi possivel obter localizacao atual.')),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }
}
