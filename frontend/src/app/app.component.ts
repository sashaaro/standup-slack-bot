import {Component, OnInit} from '@angular/core';
import {AuthService} from "../api/auto";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(private authService: AuthService) {
  }

  ngOnInit() {
    this.authService.getSession().subscribe(user => {
      console.log(user);
    })
  }
}
