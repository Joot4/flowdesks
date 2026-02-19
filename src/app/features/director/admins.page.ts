import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { ProfilesService } from '../../core/supabase/profiles.service';
import { ToastService } from '../../core/ui/toast.service';
import { Profile } from '../../shared/models/assignment.model';
import { TranslatePipe } from '../../shared/pipes/t.pipe';

@Component({
  selector: 'app-admins-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatListModule, TranslatePipe],
  template: `
    <mat-card>
      <h2>{{ 'director.admins' | t }}</h2>
      <p>
        MVP: criacao de ADMIN pelo frontend exige backend com Service Role seguro.
        Use o painel do Supabase para criar usuario e depois rode o SQL <code>supabase/sql/make_admin.sql</code>.
      </p>

      <mat-list>
        @for (admin of admins(); track admin.id) {
          <mat-list-item>
            <span matListItemTitle>{{ admin.full_name || admin.id }}</span>
            <span matListItemLine>{{ admin.id }}</span>
          </mat-list-item>
        }
      </mat-list>
    </mat-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminsPageComponent {
  protected readonly admins = signal<Profile[]>([]);

  constructor(
    private readonly profilesService: ProfilesService,
    private readonly toastService: ToastService
  ) {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.admins.set(await this.profilesService.listAdmins());
    } catch (error) {
      this.toastService.error((error as Error).message);
    }
  }
}
