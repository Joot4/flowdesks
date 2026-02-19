import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { TranslatePipe } from '../../shared/pipes/t.pipe';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatDividerModule, TranslatePipe],
  template: `
    <nav class="nav surface-card">
      <a mat-stroked-button routerLink="calendar" routerLinkActive="active-link">{{ 'nav.calendar' | t }}</a>
      <a mat-stroked-button routerLink="employees" routerLinkActive="active-link">{{ 'nav.employees' | t }}</a>
      <a mat-stroked-button routerLink="locations" routerLinkActive="active-link">{{ 'nav.locations' | t }}</a>
      <a mat-stroked-button routerLink="activity-types" routerLinkActive="active-link">{{ 'nav.activities' | t }}</a>
    </nav>
    <mat-divider></mat-divider>
    <div class="content"><router-outlet /></div>
  `,
  styles: [
    `
      .nav {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
        flex-wrap: wrap;
        padding: 12px;
        background: rgba(255, 255, 255, 0.92);
      }

      .active-link {
        background: rgba(14, 165, 233, 0.12);
        border-color: rgba(14, 165, 233, 0.45);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminShellComponent {}
