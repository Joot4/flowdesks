import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private readonly snackBar: MatSnackBar) {}

  success(message: string): void {
    this.open(message, ['toast-success']);
  }

  error(message: string): void {
    this.open(message, ['toast-error']);
  }

  info(message: string): void {
    this.open(message, ['toast-info']);
  }

  private open(message: string, panelClass: string[]): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 4000,
      panelClass,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
}
