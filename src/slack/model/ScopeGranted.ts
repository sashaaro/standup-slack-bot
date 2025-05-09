import {WebAPICallResult} from "@slack/web-api/dist/WebClient";

export interface SlackIm
{
    id: string,
    created: number,
    is_im: boolean,
    is_org_shared: boolean,
    user: string,
    is_user_deleted: boolean,
    priority: number
}

export interface ScopeGranted {
  "token": "verification-token",
  "team_id": "T1DD3JH3K",
  "api_app_id": "A7449NRUL",
  "event": {
    "type": "scope_granted",
    "scopes": [
      "files:read",
      "files:write",
      "chat:write"
    ],
    "trigger_id": "241582872337.47445629121.string"
  },
  "type": "event_callback",
  "authed_teams": [],
  "event_id": "Ev74V2J98E",
  "event_time": 1505519097
}

// https://api.slack.com/methods/oauth.v2.access
export interface OauthAccessResponse {
  "ok": true,
  "access_token": "xoxb-17653672481-19874698323-pdFZKVeTuE8sk7oOcBrzbqgy",
  "token_type": "bot",
  "scope": "commands,incoming-webhook",
  "bot_user_id": "U0KRQLJ9H",
  "app_id": "A0KRD7HC3",
  "team": {
  "name": "Slack Softball SlackWorkspace",
      "id": "T9TK3CUKW"
  },
  "enterprise": {
    "name": "slack-sports",
    "id": "E12345678"
  },
  "authed_user": {
    "id": "U1234",
    scope?: "chat:write",
    access_token?: "xoxp-1234",
    token_type?: "user"
  }
}
