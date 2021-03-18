import { Component, OnInit } from '@angular/core';
import {environment} from "../../../environments/environment";

const scopes = [
  'team:read',
  'channels:read',
  'chat:write',
  'users:read',
  'users:write',
  'groups:read',
  'im:read',
  'im:write',
  'im:history',
];


@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {
  // https://api.slack.com/authentication/basics#installing
  authLink = `https://slack.com/oauth/v2/authorize?client_id=${environment.slackClientID}&scope=${scopes.join(',')}&redirect_uri=${location.origin}/api/auth`

  constructor() { }

  ngOnInit(): void {
  }

}
