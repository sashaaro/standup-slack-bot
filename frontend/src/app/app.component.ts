import {Component, OnInit} from '@angular/core';
import {SessionService} from "./service/session.service";
import {log} from "./operator/log";
import {Router} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  ready = false;

  constructor(
    private sessionService: SessionService,
    private router: Router,
  ) {
  }

  ngOnInit() {
    this.sessionService.auth().pipe(log('session')).subscribe(user => {
      console.log(11);
    })
  }

  logout() {
    this.sessionService.logout().subscribe(_ => {
      this.router.navigateByUrl('/welcome');
    })
  }

  onActivateRoute(event) {
    this.ready = true;
  }
}
