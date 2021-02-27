import {Component, OnInit} from '@angular/core';
import {SessionService} from "./service/session.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  user$ = this.sessionService.user$

  constructor(
    private sessionService: SessionService,
    private router: Router,
  ) {
  }

  ngOnInit() {
  }

  logout() {
    this.sessionService.logout().subscribe(_ => {
      this.router.navigateByUrl('/welcome');
    })
  }
}
