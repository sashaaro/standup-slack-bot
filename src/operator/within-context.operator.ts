import {AsyncLocalStorage} from "async_hooks";
import {MonoTypeOperatorFunction, Observable, Subscription} from "rxjs";

export function withinContext<T, S = any>(storage: AsyncLocalStorage<S>, store: () => S): MonoTypeOperatorFunction<T> {
  return function (source: Observable<T>) {
    return new Observable((observer) => {
      let sub: Subscription;

      storage.run(store(),() => {
        sub = source.subscribe(observer);
      })

      // @ts-ignore
      return sub;
    });
  };
}
