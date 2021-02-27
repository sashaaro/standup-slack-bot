import { Injectable } from '@angular/core';
import {AuthService, User} from "../../api/auto";
import {catchError, delay, publishReplay, refCount, switchMap, tap} from "rxjs/operators";
import {HttpErrorResponse} from "@angular/common/http";
import {Observable, of, merge, Subject} from "rxjs";
import {log} from "../operator/log";

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private manualSubject = new Subject();

  user$: Observable<User|null> = merge(
    of(null).pipe(
      switchMap(_ => this.authService.getSession()),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of(null)
        }
        throw error;
      })
    ),
    this.manualSubject
  ).pipe(
    log('user$'),
    publishReplay(1),
    refCount(),
  )

  constructor(private authService: AuthService) {
  }

  logout() {
    return this.authService.logout().pipe(
      log('logout'),
      tap(_ => this.manualSubject.next(null))
    )
  }
}
