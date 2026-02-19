import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="loading-wrap">
      <mat-progress-spinner [diameter]="diameter" mode="indeterminate" />
    </div>
  `,
  styles: [
    `
      .loading-wrap {
        display: flex;
        justify-content: center;
        padding: 24px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingComponent {
  @Input() diameter = 36;
}
