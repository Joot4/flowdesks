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
import { Location } from '../../../shared/models/assignment.model';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { startWith } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/t.pipe';

@Component({
  selector: 'app-locations-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatTableModule, TranslatePipe],
  template: `
    <h2>{{ 'locations.title' | t }}</h2>

    <form class="create-form" [formGroup]="form" (ngSubmit)="save()">
      <mat-form-field appearance="fill">
        <mat-label>{{ 'common.name' | t }}</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>
      <mat-form-field appearance="fill">
        <mat-label>{{ 'locations.address' | t }}</mat-label>
        <input matInput formControlName="address" />
      </mat-form-field>
      <mat-form-field appearance="fill">
        <mat-label>{{ 'locations.state' | t }}</mat-label>
        <input matInput formControlName="state" placeholder="NJ, PA, CE..." />
      </mat-form-field>
      <mat-form-field appearance="fill">
        <mat-label>{{ 'locations.radius' | t }}</mat-label>
        <input matInput type="number" min="10" step="1" formControlName="geofence_radius_m" placeholder="200" />
      </mat-form-field>
      <mat-form-field appearance="fill">
        <mat-label>{{ 'locations.mapsLink' | t }}</mat-label>
        <input matInput formControlName="maps_url" placeholder="https://maps.google.com/..." />
      </mat-form-field>
      <div class="maps-badge" [class.ok]="mapsDetectionFound()">
        @if (mapsDetectionText()) {
          {{ mapsDetectionText() }}
        } @else {
          {{ 'locations.detectHelp' | t }}
        }
      </div>
      <mat-slide-toggle formControlName="active">{{ 'locations.active' | t }}</mat-slide-toggle>
      <button mat-flat-button color="primary" [disabled]="form.invalid">{{ 'common.save' | t }}</button>
    </form>

    <div class="table-wrap">
      <table mat-table [dataSource]="locations()">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>{{ 'common.name' | t }}</th>
        <td mat-cell *matCellDef="let row">{{ row.name }}</td>
      </ng-container>
      <ng-container matColumnDef="address">
        <th mat-header-cell *matHeaderCellDef>{{ 'locations.address' | t }}</th>
        <td mat-cell *matCellDef="let row">{{ row.address || '-' }}</td>
      </ng-container>
      <ng-container matColumnDef="active">
        <th mat-header-cell *matHeaderCellDef>{{ 'locations.status' | t }}</th>
        <td mat-cell *matCellDef="let row">{{ row.active ? 'Ativo' : 'Inativo' }}</td>
      </ng-container>
      <ng-container matColumnDef="state">
        <th mat-header-cell *matHeaderCellDef>{{ 'locations.state' | t }}</th>
        <td mat-cell *matCellDef="let row">{{ row.state || '-' }}</td>
      </ng-container>
      <ng-container matColumnDef="maps">
        <th mat-header-cell *matHeaderCellDef>{{ 'locations.maps' | t }}</th>
        <td mat-cell *matCellDef="let row">
          @if (row.maps_url) {
            <a [href]="row.maps_url" target="_blank" rel="noreferrer noopener" (click)="$event.stopPropagation()">{{ 'locations.openMap' | t }}</a>
          } @else {
            -
          }
        </td>
      </ng-container>
      <ng-container matColumnDef="geofence">
        <th mat-header-cell *matHeaderCellDef>{{ 'locations.geofence' | t }}</th>
        <td mat-cell *matCellDef="let row">
          @if (row.latitude && row.longitude && row.geofence_radius_m) {
            {{ row.latitude }}, {{ row.longitude }} ({{ row.geofence_radius_m }}m)
          } @else {
            -
          }
        </td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | t }}</th>
        <td mat-cell *matCellDef="let row">
          <div class="actions-cell">
            <button mat-stroked-button type="button" (click)="edit(row)">{{ 'common.edit' | t }}</button>
            <button mat-stroked-button color="warn" type="button" (click)="askDelete(row)">{{ 'common.delete' | t }}</button>
          </div>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </div>
  `,
  styles: [
    `
      .create-form {
        display: grid;
        grid-template-columns: repeat(4, minmax(120px, 1fr));
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

      .actions-cell {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: flex-start;
        min-height: 52px;
      }

      .actions-header {
        text-align: left;
      }

      .maps-badge {
        border: 1px solid #dbe7f0;
        background: #f8fafc;
        color: #475569;
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 12px;
      }

      .maps-badge.ok {
        border-color: #16a34a;
        background: #f0fdf4;
        color: #166534;
        font-weight: 600;
      }

      @media (max-width: 1024px) {
        .create-form {
          grid-template-columns: repeat(2, minmax(120px, 1fr));
        }
      }

      @media (max-width: 680px) {
        .create-form {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationsPageComponent {
  protected readonly locations = signal<Location[]>([]);
  protected readonly mapsDetectionText = signal<string>('');
  protected readonly mapsDetectionFound = signal<boolean>(false);
  protected readonly columns = ['name', 'address', 'state', 'geofence', 'active', 'maps', 'actions'];

  protected readonly form = this.formBuilder.nonNullable.group({
    id: [''],
    name: ['', Validators.required],
    address: [''],
    state: [''],
    latitude: [null as number | null],
    longitude: [null as number | null],
    geofence_radius_m: [200 as number | null],
    maps_url: [''],
    active: [true]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly catalogsService: CatalogsService,
    private readonly toastService: ToastService,
    private readonly dialog: MatDialog
  ) {
    this.form.controls.maps_url.valueChanges.pipe(startWith(this.form.controls.maps_url.value)).subscribe((url) => {
      const coords = this.extractCoordsFromMapsUrl(url ?? '');
      if (!coords) {
        this.mapsDetectionFound.set(false);
        this.mapsDetectionText.set('');
        return;
      }
      this.mapsDetectionFound.set(true);
      this.mapsDetectionText.set(`Coordenadas detectadas: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
    });
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.locations.set(await this.catalogsService.listLocations());
    } catch (error) {
      this.toastService.error((error as Error).message);
    }
  }

  edit(location: Location): void {
    this.form.patchValue({
      id: location.id,
      name: location.name,
      address: location.address ?? '',
      state: location.state ?? '',
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
      geofence_radius_m: location.geofence_radius_m ?? 200,
      maps_url: location.maps_url ?? '',
      active: location.active
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    try {
      const raw = this.form.getRawValue();
      const coords = this.extractCoordsFromMapsUrl(raw.maps_url);
      const latitude = raw.latitude ?? coords?.lat ?? null;
      const longitude = raw.longitude ?? coords?.lng ?? null;
      const geofenceRadius = raw.geofence_radius_m ?? 200;

      await this.catalogsService.upsertLocation({
        ...raw,
        latitude,
        longitude,
        geofence_radius_m: geofenceRadius
      });
      this.form.reset({
        id: '',
        name: '',
        address: '',
        state: '',
        latitude: null,
        longitude: null,
        geofence_radius_m: 200,
        maps_url: '',
        active: true
      });
      this.toastService.success('Local salvo.');
      if ((raw.latitude == null || raw.longitude == null) && coords) {
        this.toastService.info('Coordenadas preenchidas automaticamente pelo link do Maps.');
      }
      await this.load();
    } catch (error) {
      this.toastService.error((error as Error).message);
    }
  }

  private extractCoordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
    const value = url.trim();
    if (!value) {
      return null;
    }

    const patterns = [
      /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
      /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
      /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
      /[?&]ll=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
    ];

    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (!match) {
        continue;
      }

      const lat = Number.parseFloat(match[1]);
      const lng = Number.parseFloat(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }

    return null;
  }

  askDelete(location: Location): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Excluir local',
        message: `Deseja remover o local "${location.name}"?`,
        confirmText: 'Excluir'
      }
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }
      void this.delete(location.id);
    });
  }

  private async delete(id: string): Promise<void> {
    try {
      await this.catalogsService.deleteLocation(id);
      this.toastService.success('Local removido.');
      await this.load();
    } catch (error) {
      this.toastService.error((error as Error).message);
    }
  }
}
