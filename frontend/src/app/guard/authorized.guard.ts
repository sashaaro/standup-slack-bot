import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree
} from "@angular/router";
import {Observable, Subject} from "rxjs";
import {SessionService} from "../service/session.service";
import {map, tap} from "rxjs/operators";
import {Injectable} from "@angular/core";

@Injectable()
export class AuthorizedGuard implements CanActivate, CanActivateChild {
  loading$ = new Subject();

  constructor(
    private sessionService: SessionService,
    private router: Router
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.sessionService.user$.pipe(
      tap({
        next: () => this.loading$.next(true),
        error: () => this.loading$.complete(),
        complete: () => this.loading$.complete()
      }),
      map(user => {
        if (!!user) {
          return true
        }

        return this.router.createUrlTree(['about']);
      })
    );
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.canActivateChild(childRoute, state);
  }
}
