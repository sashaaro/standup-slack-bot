import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN, RENDER_TOKEN} from "../../services/token";
import AuthorizationContext from "../../services/AuthorizationContext";
import {IAppConfig} from "../../services/providers";

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

    return `https://slack.com/oauth/v2/authorize?&client_id=${this.config.slackClientID}&scope=${scopes.join(',')}&redirect_uri=${this.config.host}/oauth/authorize`
  }

  async handle(req, res) {
    const context = req.context as AuthorizationContext;
    const user = context.getUser();

    if (user) {
      res.redirect('/');
      return;
    }


    res.send(this.render('welcome', {authLink: this.authLink(), debug: this.config.debug}));
  }
}
