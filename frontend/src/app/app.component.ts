import {Component, OnInit} from '@angular/core';
import {SessionService} from "./service/session.service";
import {log} from "./operator/log";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(private sessionService: SessionService) {
  }

  ngOnInit() {
    this.sessionService.auth().pipe(log('session')).subscribe(user => {
      console.log(11);
    })
  }
}
