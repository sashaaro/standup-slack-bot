import {Component, Inject, OnInit} from '@angular/core';
import {AUTH_LINK_TOKEN} from "../../tokens";

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {
  // https://api.slack.com/authentication/basics#installing

  constructor(@Inject(AUTH_LINK_TOKEN) public authLink: string) { }

  ngOnInit(): void {
  }

}
