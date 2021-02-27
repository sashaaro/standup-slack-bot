import { Injectable } from '@angular/core';
import {AuthService, User} from "../../api/auto";
import {catchError, delay, publishReplay, refCount, merge, switchMap, tap} from "rxjs/operators";
import {HttpErrorResponse} from "@angular/common/http";
import {Observable, of, ReplaySubject, Subject} from "rxjs";
import {log} from "../operator/log";

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private manualSubject = new Subject();
  user$: Observable<User|null> = of(null).pipe(
    switchMap(_ => this.authService.getSession()),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 404) {
        return of(null)
      }
      throw error;
    }),
    merge(this.manualSubject),
    publishReplay(1),
    refCount(),
    log('user$'),
  )

  constructor(private authService: AuthService) {
  }

  auth() {
    return this.user$;
  }

  logout() {
    return this.authService.logout().pipe(
      tap(_ => this.manualSubject.next(null))
    )
  }
}
