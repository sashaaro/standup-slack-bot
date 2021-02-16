import { Component, OnInit } from '@angular/core';

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

const slackClientID = '646242827008.988405770482';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {
  authLink = `https://slack.com/oauth/v2/authorize?client_id=${slackClientID}&scope=${scopes.join(',')}&redirect_uri=${location.origin}/api/auth`

  constructor() { }

  ngOnInit(): void {
  }

}
