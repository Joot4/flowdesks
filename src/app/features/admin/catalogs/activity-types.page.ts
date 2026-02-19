import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { CatalogsService } from '../../../core/supabase/catalogs.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ActivityType } from '../../../shared/models/assignment.model';
import { TranslatePipe } from '../../../shared/pipes/t.pipe';

@Component({
  selector: 'app-activity-types-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatTableModule, TranslatePipe],
  template: `
    <h2>{{ 'activities.title' | t }}</h2>

    <form class="create-form" [formGroup]="form" (ngSubmit)="save()">
      <mat-form-field appearance="fill">
        <mat-label>{{ 'common.name' | t }}</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>
      <mat-slide-toggle formControlName="active">{{ 'locations.active' | t }}</mat-slide-toggle>
      <button mat-flat-button color="primary" [disabled]="form.invalid">{{ 'common.save' | t }}</button>
    </form>

    <div class="table-wrap">
      <table mat-table [dataSource]="activityTypes()">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>{{ 'common.name' | t }}</th>
        <td mat-cell *matCellDef="let row">{{ row.name }}</td>
      </ng-container>
      <ng-container matColumnDef="active">
        <th mat-header-cell *matHeaderCellDef>{{ 'locations.status' | t }}</th>
        <td mat-cell *matCellDef="let row">{{ row.active ? 'Ativo' : 'Inativo' }}</td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns" (click)="edit(row)"></tr>
      </table>
    </div>
  `,
  styles: [
    `
      .create-form {
        display: grid;
        grid-template-columns: minmax(180px, 1fr) auto auto;
        gap: 12px;
        align-items: center;
        margin-bottom: 12px;
      }

      table {
        width: 100%;
      }

      .table-wrap {
        overflow-x: auto;
      }

      @media (max-width: 700px) {
        .create-form {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityTypesPageComponent {
  protected readonly activityTypes = signal<ActivityType[]>([]);
  protected readonly columns = ['name', 'active'];

  protected readonly form = this.formBuilder.nonNullable.group({
    id: [''],
    name: ['', Validators.required],
    active: [true]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly catalogsService: CatalogsService,
    private readonly toastService: ToastService
  ) {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.activityTypes.set(await this.catalogsService.listActivityTypes());
    } catch (error) {
      this.toastService.error((error as Error).message);
    }
  }

  edit(activityType: ActivityType): void {
    this.form.patchValue(activityType);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    try {
      await this.catalogsService.upsertActivityType(this.form.getRawValue());
      this.form.reset({ id: '', name: '', active: true });
      this.toastService.success('Tipo salvo.');
      await this.load();
    } catch (error) {
      this.toastService.error((error as Error).message);
    }
  }
}
