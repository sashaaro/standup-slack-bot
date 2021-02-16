import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree
} from "@angular/router";
import {Observable} from "rxjs";
import {SessionService} from "../service/session.service";
import {map} from "rxjs/operators";
import {Injectable} from "@angular/core";

@Injectable()
export class AuthorizedGuard implements CanActivate, CanActivateChild{
  constructor(
    private sessionService: SessionService,
    private router: Router
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.sessionService.user$.pipe(map(user => {
      if (!!user) {
        return true
      }

      return this.router.createUrlTree(['welcome'])
    }));
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.canActivateChild(childRoute, state);
  }
}
