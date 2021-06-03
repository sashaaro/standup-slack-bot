import {Component, Inject, OnInit} from '@angular/core';
import {SessionService} from './service/session.service';
import {NavigationEnd, Router} from '@angular/router';
import {AUTH_LINK_TOKEN, SERVER_ERR_TOKEN} from './tokens';
import {ReplaySubject, Subject} from 'rxjs';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {filter} from "rxjs/operators";

@UntilDestroy()
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  user$ = this.sessionService.user$;
  supportTelegram = ''; // TODO

  constructor(
    private sessionService: SessionService,
    private router: Router,
    @Inject(SERVER_ERR_TOKEN) public serverErr$: ReplaySubject<any>,
    @Inject(AUTH_LINK_TOKEN) public authLink: string
  ) {
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      untilDestroyed(this)
    ).subscribe(_ => {
      this.serverErr$.next(false);
    });
  }

  // tslint:disable-next-line:typedef
  logout() {
    this.sessionService.logout().subscribe(_ => {
      this.router.navigateByUrl('/about');
    });
  }
}
