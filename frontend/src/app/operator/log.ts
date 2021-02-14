import { OperatorFunction } from 'rxjs';
import { tap } from 'rxjs/operators';

export function log<T>(prefix: string = null): OperatorFunction<T, T> {
  return tap(
    (data: T) => logIt(prefix, data),
    err => logIt(prefix + '[ERROR]', err),
    () => {
      window.console.group(prefix + '[COMPLETE]')
      window.console.groupEnd()
    },
  );
}

function logIt(prefix?: string, data?: any): void {
  if (prefix) {
    window.console.group(prefix);
    window.console.log(data);
    window.console.groupEnd();
  } else {
    window.console.log(data);
  }
}
