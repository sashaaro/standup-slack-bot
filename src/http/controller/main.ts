import request from 'request-promise'
import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN, RENDER_TOKEN} from "../../services/token";
import AuthorizationContext, {IAuthUser} from "../../services/AuthorizationContext";
import {logError} from "../../services/logError";
import {IAppConfig} from "../../services/providers";
import Team from "../../model/Team";

@Injectable()
export class MainAction implements IHttpAction {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(RENDER_TOKEN) private render: Function
  ) {
  }

  authLink() {
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
      'pins:write',
      'reactions:read',
      //'reactions:write',
    ]; //, 'im:history'

    return `https://slack.com/oauth/v2/authorize?&client_id=${this.config.slackClientID}&scope=${scopes.join(',')}`
  }

  async handle(req, res) {
    const context = req.context as AuthorizationContext;
    const user = context.getUser();

    if (user) {
      res.redirect('/');
      return;
    }

    if (!req.query.code) {
      res.send(this.render('auth', {authLink: this.authLink(), debug: this.config.debug}));
      return
    }

    let response
    try {
      // https://api.slack.com/methods/oauth.access
      const link = 'https://slack.com/api/oauth.access';
      // req.headers.host
      const redirectUri = `${this.config.host}/auth`
      const query = `code=${req.query.code}&client_id=${this.config.slackClientID}&client_secret=${this.config.slackSecret}&redirect_uri=${redirectUri}`

      response = await request({
        uri: `${link}?${query}`,
        method: 'GET'
      })
    } catch (e) {
      logError(e)
      throw new Error(e)
    }
    const data = JSON.parse(response) as {
      ok?: string,
      user_id?: string,
      "access_token": "xoxp-XXXXXXXX-XXXXXXXX-XXXXX",
      "scope": "incoming-webhook,commands,bot",
      "team_name": "Team Installing Your Hook",
      "team_id": "TXXXXXXXXX",
      "incoming_webhook": {
        "url": "https://hooks.slack.com/TXXXXX/BXXXXX/XXXXXXXXXX",
        "channel": "#channel-it-will-post-to",
        "configuration_url": "https://teamname.slack.com/services/BXXXXX"
      },
      "bot": {
        "bot_user_id": "UTTTTTTTTTTR",
        "bot_access_token": "xoxb-XXXXXXXXXXXX-TTTTTTTTTTTTTT"
      }
    };
    if (!data.ok) {
      logError(data);
      throw new Error(data as any)
    }


    const team = new Team();
    console.log(data);

    (req.context as AuthorizationContext).setUser({
      access_token: data.access_token,
      scope: data.scope,
      user_id: data.user_id,
      team_name: data.team_name,
      team_id: data.team_id,
      bot: data.bot,
    } as IAuthUser)

    return res.redirect('/')
  }
}
