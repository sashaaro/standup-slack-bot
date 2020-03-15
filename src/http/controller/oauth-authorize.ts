import request from 'request-promise'
import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN, SLACK_WEB_CLIENT_FACTORY_TOKEN} from "../../services/token";
import AuthorizationContext, {IAuthUser} from "../../services/AuthorizationContext";
import {logError} from "../../services/logError";
import {IAppConfig, SlackWebClientFactoryFn} from "../../services/providers";
import {WebClient} from "@slack/web-api";

@Injectable()
export class OauthAuthorize implements IHttpAction {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
  ) {
  }

  async handle(req, res) {
    if (req.session.user) {
      res.redirect('/');
      return;
    }

    if (!req.query.code) {
      res.status(404);
      return;
    }

    let response
    try {
      // https://api.slack.com/methods/oauth.access
      //const link = 'https://slack.com/api/oauth.v2.access';
      // req.headers.host
      /*const query = `code=${req.query.code}&client_id=${this.config.slackClientID}&client_secret=${this.config.slackSecret}&redirect_uri=${this.config.host}/auth`

      response = await request({
        uri: `${link}?${query}`,
        method: 'GET'
      })*/

      // https://api.slack.com/methods/oauth.v2.access
      response = await new WebClient().oauth.v2.access({
        client_id: this.config.slackClientID,
        client_secret: this.config.slackSecret,
        code: req.query.code,
        redirect_uri: `${this.config.host}/auth`
      })
    } catch (e) {
      logError(e)
      throw new Error(e)
    }
    const data = response
    /*const data = JSON.parse(response) as {
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
    };*/
    if (!data.ok) {
      logError(data);
      throw new Error(data as any)
    }

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
