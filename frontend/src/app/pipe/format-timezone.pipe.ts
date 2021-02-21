import { Pipe, PipeTransform } from '@angular/core';
import {Timezone} from "../../api/auto";

@Pipe({
  name: 'formatTimezone'
})
export class FormatTimezonePipe implements PipeTransform {

  transform(timezone: Timezone, ...args: unknown[]): unknown {
    return `(GMT ${(timezone.utc_offset.hours || '00')}:${(Math.abs(timezone.utc_offset.minutes || 0)).toString().padStart(2, '0')}) ${timezone.name}`;
  }
}
