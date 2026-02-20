import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { AssignmentsService, WorkPhotoMetadataInput } from '../../core/supabase/assignments.service';
import { AttendanceRequestsService } from '../../core/supabase/attendance-requests.service';
import { SessionStore } from '../../core/supabase/session.store';
import { ToastService } from '../../core/ui/toast.service';
import { Assignment } from '../../shared/models/assignment.model';
import { TzDatePipe } from '../../shared/pipes/tz-date.pipe';
import { AssignmentDetailDialogComponent, AssignmentDetailDialogResult } from './assignment-detail.dialog';
import { TranslatePipe } from '../../shared/pipes/t.pipe';
import { I18nService } from '../../core/i18n/i18n.service';

const CENTERED_WEEK_VIEW = 'timeGridCenteredWeek';

@Component({
  selector: 'app-my-calendar-page',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, MatCardModule, MatProgressSpinnerModule, TzDatePipe, TranslatePipe],
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
        <span><i class="dot"></i> {{ 'me.activeCommitments' | t }}</span>
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
                <div class="what">{{ assignment.activity_type?.name || ('common.defaultActivity' | t) }}</div>
                <div class="where">{{ assignment.location?.name || ('common.noLocation' | t) }}</div>
              </div>
              <div class="chevron">›</div>
            </article>
          } @empty {
            <article class="item">{{ 'me.noUpcoming' | t }}</article>
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
                <div class="what">{{ assignment.activity_type?.name || ('common.defaultActivity' | t) }}</div>
                <div class="where">{{ assignment.location?.name || ('common.noLocation' | t) }}</div>
                <div class="where">{{ 'me.attendanceStatus' | t }}: {{ assignment.attendance?.status || 'NOT_STARTED' }}</div>
                <div class="where">{{ 'me.photosCount' | t }}: {{ assignment.work_photos?.length || 0 }}</div>
              </div>
              <div class="chevron">›</div>
            </article>
          } @empty {
            <article class="item">{{ 'me.noHistoryLoaded' | t }}</article>
          }
        </div>
      </mat-card>
    </section>

    @if (isPunching()) {
      <div class="fullscreen-loading" role="status" aria-live="polite">
        <mat-progress-spinner mode="indeterminate" diameter="46"></mat-progress-spinner>
        <p>{{ 'me.punchRecording' | t }}</p>
      </div>
    }
    @if (isPhotoProcessing()) {
      <div class="fullscreen-loading" role="status" aria-live="polite">
        <mat-progress-spinner mode="indeterminate" diameter="46"></mat-progress-spinner>
        <p>{{ 'me.photosLoading' | t }}</p>
      </div>
    }
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

      .fullscreen-loading {
        position: fixed;
        inset: 0;
        z-index: 2000;
        background: rgba(15, 23, 42, 0.34);
        backdrop-filter: blur(1px);
        display: grid;
        place-items: center;
        gap: 10px;
        color: #fff;
        font-weight: 700;
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
  protected readonly isPunching = signal<boolean>(false);
  protected readonly isPhotoProcessing = signal<boolean>(false);
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
    initialView: CENTERED_WEEK_VIEW,
    views: {
      [CENTERED_WEEK_VIEW]: {
        type: 'timeGrid',
        buttonText: 'Semana',
        dateIncrement: { days: 7 },
        visibleRange: (currentDate: Date) => {
          const start = new Date(currentDate);
          start.setDate(start.getDate() - 3);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(end.getDate() + 7);
          return { start, end };
        }
      }
    },
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: `dayGridMonth,${CENTERED_WEEK_VIEW},timeGridDay`
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

  private static readonly FALLBACK_GEO_LABEL = 'GPS: n/d';

  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly attendanceRequestsService: AttendanceRequestsService,
    private readonly sessionStore: SessionStore,
    private readonly toastService: ToastService,
    private readonly dialog: MatDialog,
    private readonly i18n: I18nService
  ) {
    effect(() => {
      const lang = this.i18n.language();
      this.calendarOptions.locale = this.resolveCalendarLocale(lang);
      this.calendarOptions.buttonText = this.resolveCalendarButtonText(lang);
      const weekText = lang === 'en' ? 'Week' : lang === 'es' ? 'Semana' : 'Semana';
      this.calendarOptions.views = {
        [CENTERED_WEEK_VIEW]: {
          type: 'timeGrid',
          buttonText: weekText,
          dateIncrement: { days: 7 },
          visibleRange: (currentDate: Date) => {
            const start = new Date(currentDate);
            start.setDate(start.getDate() - 3);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            return { start, end };
          }
        }
      };
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
      return 'en';
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
      title: `${assignment.activity_type?.name ?? this.i18n.t('common.defaultActivity')} • ${assignment.location?.name ?? this.i18n.t('common.noLocation')}`,
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
      if (result.type === 'PUNCH') {
        void this.punch(assignment.id, result.action);
        return;
      }
      if (result.type === 'REQUEST') {
        void this.requestAttendanceAdjustment(assignment.id, result.requestType, result.requestedTimeIso, result.reason);
        return;
      }
      if (result.type === 'DELETE_PHOTO') {
        void this.deleteUploadedPhoto(result.photoId, result.photoUrl);
        return;
      }
      void this.uploadWorkPhotos(assignment.id, result.phase, result.files);
    });
  }

  private async punch(assignmentId: string, action: 'IN' | 'OUT'): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.info(this.i18n.t('me.punchOffline'));
      return;
    }

    this.isPunching.set(true);
    try {
      const geo = await this.getCurrentPosition();
      await this.assignmentsService.punch(assignmentId, action, undefined, geo);
      this.toastService.success(action === 'IN' ? this.i18n.t('me.checkinSuccess') : this.i18n.t('me.checkoutSuccess'));
      const profileId = this.sessionStore.profile()?.id;
      if (!profileId) {
        return;
      }
      await this.load(profileId);
    } catch (error) {
      this.toastService.error(this.mapPunchErrorMessage(error));
    } finally {
      this.isPunching.set(false);
    }
  }

  private async uploadWorkPhotos(assignmentId: string, phase: 'BEFORE' | 'AFTER', files: File[]): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.info(this.i18n.t('me.photosUploadOffline'));
      return;
    }

    if (files.length === 0) {
      return;
    }

    this.isPhotoProcessing.set(true);
    try {
      const assignment = this.assignments().find((item) => item.id === assignmentId) ?? null;
      let geo: { lat: number; lng: number; accuracyM?: number; headingDeg?: number } | null = null;
      try {
        geo = await this.getCurrentPosition();
      } catch {
        // For work photos we keep upload flow available even without geo.
        geo = null;
      }

      const processedFiles = await Promise.all(files.map((file) => this.stampWorkPhoto(file, assignment, geo)));
      await Promise.all(
        processedFiles.map(async (processed) => {
          const photoUrl = await this.assignmentsService.uploadWorkPhoto(assignmentId, phase, processed.file);
          await this.assignmentsService.saveWorkPhoto(assignmentId, phase, photoUrl, processed.metadata);
        })
      );
      this.toastService.success(this.i18n.t('me.photosUploadSuccess'));
      const profileId = this.sessionStore.profile()?.id;
      if (!profileId) {
        return;
      }
      await this.load(profileId);
    } catch (error) {
      this.toastService.error((error as Error).message || this.i18n.t('me.photosUploadError'));
    } finally {
      this.isPhotoProcessing.set(false);
    }
  }

  private async requestAttendanceAdjustment(
    assignmentId: string,
    requestType: 'IN' | 'OUT',
    requestedTimeIso: string,
    reason: string
  ): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.info(this.i18n.t('me.requestOffline'));
      return;
    }

    try {
      await this.attendanceRequestsService.createRequest({
        assignmentId,
        requestType,
        requestedTimeIso,
        reason
      });
      this.toastService.success(this.i18n.t('me.requestSuccess'));
    } catch (error) {
      this.toastService.error((error as Error).message || this.i18n.t('me.requestError'));
    }
  }

  private async deleteUploadedPhoto(photoId: string, photoUrl: string): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.info(this.i18n.t('me.photoDeleteOffline'));
      return;
    }

    this.isPhotoProcessing.set(true);
    try {
      await this.assignmentsService.deleteWorkPhoto(photoId, photoUrl);
      this.toastService.success(this.i18n.t('me.photoDeleteSuccess'));
      const profileId = this.sessionStore.profile()?.id;
      if (!profileId) {
        return;
      }
      await this.load(profileId);
    } catch (error) {
      this.toastService.error((error as Error).message || this.i18n.t('me.photoDeleteError'));
    } finally {
      this.isPhotoProcessing.set(false);
    }
  }

  private async getCurrentPosition(): Promise<{ lat: number; lng: number; accuracyM?: number; headingDeg?: number }> {
    if (!navigator.geolocation) {
      throw new Error(this.i18n.t('me.geoNotSupported'));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: position.coords.accuracy,
            headingDeg: Number.isFinite(position.coords.heading) ? position.coords.heading ?? undefined : undefined
          });
        },
        (err) => reject(new Error(err.message || this.i18n.t('me.geoFetchError'))),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }

  private async stampWorkPhoto(
    originalFile: File,
    assignment: Assignment | null,
    geo: { lat: number; lng: number; accuracyM?: number; headingDeg?: number } | null
  ): Promise<{ file: File; metadata: WorkPhotoMetadataInput }> {
    const capturedAtIso = new Date().toISOString();
    const metadata: WorkPhotoMetadataInput = {
      capturedAtIso,
      latitude: geo?.lat ?? null,
      longitude: geo?.lng ?? null,
      accuracyM: geo?.accuracyM ?? null,
      headingDeg: geo?.headingDeg ?? null,
      locationName: assignment?.location?.name ?? null,
      locationAddress: assignment?.location?.address ?? null,
      locationMapsUrl: assignment?.location?.maps_url ?? null
    };

    if (!originalFile.type.startsWith('image/')) {
      return { file: originalFile, metadata };
    }

    const baseImage = await this.loadImageFromFile(originalFile);
    const canvas = document.createElement('canvas');
    canvas.width = baseImage.naturalWidth;
    canvas.height = baseImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { file: originalFile, metadata };
    }

    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    const margin = Math.max(12, Math.round(canvas.width * 0.02));

    const dateLabel = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Fortaleza',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date(capturedAtIso));
    const locationLabel = assignment?.location?.name ?? this.i18n.t('common.noLocation');
    const addressLabel = assignment?.location?.address ?? '-';
    const geoLabel = geo ? `${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}` : MyCalendarPageComponent.FALLBACK_GEO_LABEL;
    const accuracyLabel = geo?.accuracyM ? `Precisao: ${Math.round(geo.accuracyM)}m` : '';
    const headingLabel = Number.isFinite(geo?.headingDeg) ? `Direcao: ${Math.round(geo?.headingDeg ?? 0)}°` : '';

    const lines = [dateLabel, locationLabel, addressLabel, geoLabel, accuracyLabel, headingLabel].filter(
      (value): value is string => !!value
    );

    const lineHeight = Math.max(20, Math.round(canvas.width * 0.021));
    const textPadding = Math.max(10, Math.round(canvas.width * 0.014));
    const boxHeight = lineHeight * lines.length + textPadding * 2;
    const boxWidth = Math.min(canvas.width - margin * 2, Math.max(300, Math.round(canvas.width * 0.6)));
    const boxX = margin;
    const boxY = canvas.height - boxHeight - margin;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    const radius = 10;
    ctx.beginPath();
    ctx.moveTo(boxX + radius, boxY);
    ctx.lineTo(boxX + boxWidth - radius, boxY);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
    ctx.lineTo(boxX + radius, boxY + boxHeight);
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
    ctx.lineTo(boxX, boxY + radius);
    ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.font = `${Math.max(16, Math.round(canvas.width * 0.02))}px "Segoe UI", sans-serif`;
    lines.forEach((line, index) => {
      ctx.fillText(line, boxX + textPadding, boxY + textPadding + lineHeight * (index + 0.85), boxWidth - textPadding * 2);
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.9)
    );

    if (!blob) {
      return { file: originalFile, metadata };
    }

    const filename = this.stampedFilename(originalFile.name);
    return { file: new File([blob], filename, { type: 'image/jpeg' }), metadata };
  }

  private loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('image decode error'));
        image.src = String(reader.result ?? '');
      };
      reader.onerror = () => reject(new Error('file read error'));
      reader.readAsDataURL(file);
    });
  }

  private stampedFilename(originalName: string): string {
    const base = originalName.replace(/\.[^.]+$/, '');
    return `${base}-stamped-${Date.now()}.jpg`;
  }

  private mapPunchErrorMessage(error: unknown): string {
    const raw = (error as { message?: string })?.message ?? this.i18n.t('me.punchErrorDefault');
    const message = raw.toLowerCase();

    if (message.includes('cercado virtual') || message.includes('fora do cercado')) {
      return this.i18n.t('me.punchErrorOutsideGeofence');
    }

    if (message.includes('localizacao atual obrigatoria')) {
      return this.i18n.t('me.punchErrorLocationRequired');
    }

    if (message.includes('baixa precisao')) {
      return this.i18n.t('me.punchErrorLowAccuracy');
    }

    if (message.includes('janela de check-in encerrada')) {
      return this.i18n.t('me.punchErrorCheckinWindowClosed');
    }

    if (message.includes('check-in disponivel apenas 30 minutos antes do inicio')) {
      return this.i18n.t('me.punchErrorCheckinNotOpen');
    }

    if (message.includes('registre o check-in antes do check-out')) {
      return this.i18n.t('me.punchErrorNeedCheckinFirst');
    }

    if (message.includes('horario invalido para check-out')) {
      return this.i18n.t('me.punchErrorInvalidCheckout');
    }

    return raw;
  }
}
