import * as request from 'request-promise'
import * as pug from 'pug'
import {IHttpAction, templateDirPath} from "./index";
import {Inject, Service} from "typedi";
import {IAppConfig} from "../../index";
import {CONFIG_TOKEN} from "../../services/token";
import AuthorizationContext, {IAuthUser} from "../../services/AuthorizationContext";

@Service()
export class AuthAction implements IHttpAction {
  constructor(@Inject(CONFIG_TOKEN) private config: IAppConfig,
              private authorizationContext: AuthorizationContext) {
  }

  async handle(req, res) {
    const user = this.authorizationContext.getUser(req)

    if (user) {
      res.redirect('/');
      return;
    }

    const redirectUri = `${this.config.host}/auth`
    if (!req.query.code) {
      const scopes = ['bot', 'channels:read', 'team:read', 'groups:read'//, 'im:history'
      ]
      const authLink = `https://slack.com/oauth/authorize?&client_id=${this.config.slackClientID}&scope=${scopes.join(',')}&redirect_uri=${redirectUri}`

      res.send(pug.compileFile(`${templateDirPath}/auth.pug`)({
        authLink: authLink
      }))
      return;
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
      console.log(e)
      throw new Error(e)
    }
    const data = JSON.parse(response);
    if (!data.ok) {
      console.log(data);
      throw new Error(data)
    }

    this.authorizationContext.setUser(req, {
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
