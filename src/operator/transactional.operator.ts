import {MonoTypeOperatorFunction, Observable, of, throwError} from "rxjs";
import {catchError, finalize, mapTo, mergeMap, tap} from "rxjs/operators";
import {from} from "rxjs";
import {EntityManager} from "@mikro-orm/postgresql";

// export function transactional<T>(emProvider: () => EntityManager): MonoTypeOperatorFunction<T> {
//   return function (source: Observable<T>) {
//     const em = emProvider()
//     return source.pipe(
//       mergeMap(data =>
//         fromPromise(em.begin()).pipe(mapTo(data))
//       ),
//       catchError(error => fromPromise(em.rollback())
//         .pipe(
//           mergeMap(() => throwError(error)),
//           catchError(txError => throwError(txError)) // TODO add prev error
//         )
//       ),
//       // TODO finalize(_ => em.commit())
//     )
//   };
// }
