import * as request from 'request-promise'
import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN, RENDER_TOKEN, TIMEZONES_TOKEN} from "../../services/token";
import AuthorizationContext, {IAuthUser} from "../../services/AuthorizationContext";
import {logError} from "../../services/logError";
import {IAppConfig} from "../../services/providers";
import Timezone from "../../model/Timezone";

@Injectable()
export class AuthAction implements IHttpAction {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(TIMEZONES_TOKEN) private timezone,
    @Inject(RENDER_TOKEN) private render: Function
  ) {

    timezone.then((s) => {
      s.forEach((t: Timezone) => {
        console.log(t.utc_offset)
        console.log(t.utc_offset.hours)
        console.log(t.utc_offset.minutes)
      })
    })
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
    const data = JSON.parse(response);
    if (!data.ok) {
      logError(data);
      throw new Error(data)
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