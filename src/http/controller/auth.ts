import * as request from 'request-promise'
import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN, RENDER_TOKEN} from "../../services/token";
import AuthorizationContext, {IAuthUser} from "../../services/AuthorizationContext";
import {logError} from "../../services/logError";
import {IAppConfig} from "../../services/providers";
import Team from "../../model/Team";

@Injectable()
export class AuthAction implements IHttpAction {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(RENDER_TOKEN) private render: Function
  ) {
  }

  async handle(req, res) {
    const context = req.context as AuthorizationContext;
    const user = context.getUser();

    if (user) {
      res.redirect('/');
      return;
    }

    const redirectUri = `${this.config.host}/auth`
    if (!req.query.code) {
      const scopes = ['bot', 'channels:read', 'team:read', 'groups:read']; //, 'im:history'
      const authLink = `https://slack.com/oauth/authorize?&client_id=${this.config.slackClientID}&scope=${scopes.join(',')}&redirect_uri=${redirectUri}`

      res.send(this.render('auth', {authLink, debug: this.config.debug}));
      return
    }

    // https://api.slack.com/methods/oauth.access
    const link = 'https://slack.com/api/oauth.access';
    const query = `code=${req.query.code}&client_id=${this.config.slackClientID}&client_secret=${this.config.slackSecret}&redirect_uri=${redirectUri}`
    const options = {
      uri: `${link}?${query}`,
      method: 'GET'
    }

    let response
    try {
      response = await request(options)
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