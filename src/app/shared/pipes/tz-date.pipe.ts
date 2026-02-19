import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'tzDate',
  standalone: true
})
export class TzDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, withTime = true): string {
    if (!value) {
      return '-';
    }

    const date = value instanceof Date ? value : new Date(value);
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: withTime ? 'short' : undefined,
      timeZone: environment.timezone
    });

    return formatter.format(date);
  }
}
