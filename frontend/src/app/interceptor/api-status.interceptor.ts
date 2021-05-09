import {Inject, Injectable} from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import {Observable, ReplaySubject, Subject, timer} from 'rxjs';
import {tap} from 'rxjs/operators';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {SERVER_ERR_TOKEN} from '../tokens';

@Injectable()
export class ApiStatusInterceptor implements HttpInterceptor {

  constructor(
    public snackBar: MatSnackBar,
    public router: Router,
    @Inject(SERVER_ERR_TOKEN) private serverErr: ReplaySubject<any>
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(tap({
      error: (error: HttpErrorResponse) => {
        if (request.url.search(window.location.origin + '/api') === 0) {
          if (error.status === 403) {
            this.snackBar.open('Access denied', 'ok');
            timer(4000).subscribe(async () => {
              const result = await this.router.navigateByUrl('/welcome');
              if (!result) {
                console.warn('Access denied. Redirect to welcome error', result);
              }
            });
          } else if (error.status.toString().startsWith('5')) {
            this.snackBar.open('Internal service error. Please attempt later', 'ok');
            this.serverErr.next(error);
          }
        }
      }
    }));
  }
}
