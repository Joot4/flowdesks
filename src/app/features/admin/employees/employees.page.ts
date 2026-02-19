import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { EmployeesService, CollaboratorView } from '../../../core/supabase/employees.service';
import { ToastService } from '../../../core/ui/toast.service';
import { EmployeeDialogResult, EmployeeFormDialogComponent } from './employee-form.dialog';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TranslatePipe } from '../../../shared/pipes/t.pipe';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, LoadingComponent, TranslatePipe],
  template: `
    <div class="header">
      <h2>{{ 'employees.title' | t }}</h2>
      <button mat-flat-button color="primary" [disabled]="submitting()" (click)="create()">
        {{ submitting() ? ('employees.adding' | t) : ('employees.add' | t) }}
      </button>
    </div>

    @if (loading()) {
      <app-loading />
    } @else {
      <div class="table-wrap">
        <table mat-table [dataSource]="collaborators()">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>{{ 'common.name' | t }}</th>
          <td mat-cell *matCellDef="let row">{{ row.profile.full_name }}</td>
        </ng-container>

        <ng-container matColumnDef="code">
          <th mat-header-cell *matHeaderCellDef>{{ 'common.code' | t }}</th>
          <td mat-cell *matCellDef="let row">{{ row.employee?.employee_code || '-' }}</td>
        </ng-container>

        <ng-container matColumnDef="job">
          <th mat-header-cell *matHeaderCellDef>{{ 'common.job' | t }}</th>
          <td mat-cell *matCellDef="let row">{{ row.employee?.job_title || '-' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | t }}</th>
          <td mat-cell *matCellDef="let row">
            <div class="actions-cell">
              <button mat-stroked-button [disabled]="submitting()" (click)="edit(row)">{{ 'common.edit' | t }}</button>
              <button mat-stroked-button color="warn" [disabled]="submitting()" (click)="askDelete(row)">{{ 'common.delete' | t }}</button>
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </div>
    }
  `,
  styles: [
    `
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        gap: 8px;
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

      @media (max-width: 740px) {
        .header {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeesPageComponent {
  protected readonly loading = signal<boolean>(true);
  protected readonly submitting = signal<boolean>(false);
  protected readonly collaborators = signal<CollaboratorView[]>([]);
  protected readonly columns = ['name', 'code', 'job', 'actions'];

  constructor(
    private readonly employeesService: EmployeesService,
    private readonly dialog: MatDialog,
    private readonly toastService: ToastService
  ) {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.collaborators.set(await this.employeesService.listCollaborators());
    } catch (error) {
      this.toastService.error((error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  edit(collaborator: CollaboratorView): void {
    const ref = this.dialog.open(EmployeeFormDialogComponent, { data: { mode: 'edit', collaborator } });
    ref.afterClosed().subscribe((result: EmployeeDialogResult | undefined) => {
      if (!result) {
        return;
      }
      void this.save(collaborator.profile.id, result);
    });
  }

  create(): void {
    const ref = this.dialog.open(EmployeeFormDialogComponent, { data: { mode: 'create' } });
    ref.afterClosed().subscribe((result: EmployeeDialogResult | undefined) => {
      if (!result) {
        return;
      }
      void this.saveNew(result);
    });
  }

  askDelete(collaborator: CollaboratorView): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Excluir colaborador',
        message: `Deseja desativar ${collaborator.profile.full_name ?? 'este colaborador'}?`,
        confirmText: 'Excluir'
      }
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }
      void this.delete(collaborator.profile.id);
    });
  }

  private async save(profileId: string, result: { full_name: string; employee_code: string; phone: string; job_title: string }): Promise<void> {
    this.submitting.set(true);
    try {
      await this.employeesService.updateCollaborator(profileId, result);
      this.toastService.success('Colaborador atualizado.');
      await this.load();
    } catch (error) {
      this.toastService.error((error as Error).message);
    } finally {
      this.submitting.set(false);
    }
  }

  private async saveNew(result: EmployeeDialogResult): Promise<void> {
    this.submitting.set(true);
    try {
      const created = await this.employeesService.createCollaborator(result);
      this.toastService.success('Colaborador criado com sucesso.');
      if (created.email_sent) {
        this.toastService.info('Credenciais enviadas por email para o colaborador.');
      } else {
        this.toastService.info(`Colaborador criado, mas envio de email nao configurado. ${created.email_error ?? ''}`.trim());
      }
      await this.load();
    } catch (error) {
      const message = (error as Error).message;
      if (message.toLowerCase().includes('already registered') || message.toLowerCase().includes('already exists')) {
        this.toastService.error('Este email ja existe no Auth.');
        return;
      }
      this.toastService.error(message);
    } finally {
      this.submitting.set(false);
    }
  }

  private async delete(profileId: string): Promise<void> {
    this.submitting.set(true);
    try {
      await this.employeesService.deactivateCollaborator(profileId);
      this.toastService.success('Colaborador excluido com sucesso.');
      await this.load();
    } catch (error) {
      this.toastService.error((error as Error).message || 'Falha ao excluir colaborador.');
    } finally {
      this.submitting.set(false);
    }
  }
}
