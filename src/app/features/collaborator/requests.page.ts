import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AttendanceAdjustmentRequestView, AttendanceRequestsService } from '../../core/supabase/attendance-requests.service';
import { ToastService } from '../../core/ui/toast.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TzDatePipe } from '../../shared/pipes/tz-date.pipe';
import { TranslatePipe } from '../../shared/pipes/t.pipe';

@Component({
  selector: 'app-requests-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, TzDatePipe, TranslatePipe],
  template: `
    <section class="requests-shell">
      <mat-card class="surface-card head">
        <div>
          <h2>{{ 'requests.title' | t }}</h2>
          <p>{{ 'requests.subtitle' | t }}</p>
        </div>
        <button mat-stroked-button type="button" (click)="load()">{{ 'requests.refresh' | t }}</button>
      </mat-card>

      <mat-card class="surface-card list-card">
        <div class="list-wrap">
          @for (request of requests(); track request.id) {
            <article class="item">
              <div>
                <div class="line"><strong>{{ request.request_type === 'IN' ? ('requests.typeIn' | t) : ('requests.typeOut' | t) }}</strong></div>
                <div class="line">{{ 'requests.requestedFor' | t }}: {{ request.requested_time | tzDate }}</div>
                <div class="line">{{ 'requests.reason' | t }}: {{ request.reason || ('requests.noReason' | t) }}</div>
                @if (request.assignment) {
                  <div class="line">
                    {{ 'requests.assignment' | t }}: {{ request.assignment.start_at | tzDate }} - {{ request.assignment.end_at | tzDate }}
                  </div>
                  <div class="line">
                    {{ request.assignment.activity_type?.name || ('common.defaultActivity' | t) }} • {{ request.assignment.location?.name || ('common.noLocation' | t) }}
                  </div>
                }
                @if (request.review_note) {
                  <div class="line">{{ 'requests.adminNote' | t }}: {{ request.review_note }}</div>
                }
              </div>
              <span class="badge" [class]="badgeClass(request.status)">{{ request.status }}</span>
            </article>
          } @empty {
            <article class="empty">{{ 'requests.empty' | t }}</article>
          }
        </div>
      </mat-card>
    </section>
  `,
  styles: [
    `
      .requests-shell {
        display: grid;
        gap: 12px;
      }

      .head {
        padding: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }

      .head h2 {
        margin: 0;
        font-size: 1.2rem;
      }

      .head p {
        margin: 4px 0 0;
        color: #64748b;
      }

      .list-card {
        padding: 12px;
      }

      .list-wrap {
        display: grid;
        gap: 8px;
      }

      .item {
        border: 1px solid #dbe7f0;
        border-radius: 10px;
        background: #fff;
        padding: 10px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }

      .line {
        color: #475569;
        font-size: 13px;
        margin-top: 2px;
      }

      .badge {
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 10px;
      }

      .badge-pending {
        background: #fef3c7;
        color: #92400e;
      }

      .badge-approved {
        background: #dcfce7;
        color: #166534;
      }

      .badge-rejected {
        background: #fee2e2;
        color: #991b1b;
      }

      .empty {
        border: 1px dashed #cbd5e1;
        border-radius: 10px;
        background: #fff;
        color: #64748b;
        padding: 12px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestsPageComponent {
  protected readonly requests = signal<AttendanceAdjustmentRequestView[]>([]);

  constructor(
    private readonly attendanceRequestsService: AttendanceRequestsService,
    private readonly toastService: ToastService,
    private readonly i18n: I18nService
  ) {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.requests.set(await this.attendanceRequestsService.listMine());
    } catch (error) {
      this.toastService.error((error as Error).message || this.i18n.t('requests.loadError'));
    }
  }

  badgeClass(status: AttendanceAdjustmentRequestView['status']): string {
    if (status === 'APPROVED') {
      return 'badge-approved';
    }
    if (status === 'REJECTED') {
      return 'badge-rejected';
    }
    return 'badge-pending';
  }
}
