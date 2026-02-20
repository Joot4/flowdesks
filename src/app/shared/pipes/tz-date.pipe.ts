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
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: withTime ? '2-digit' : undefined,
      minute: withTime ? '2-digit' : undefined,
      hour12: false,
      timeZone: environment.timezone
    });

    return formatter.format(date);
  }
}
