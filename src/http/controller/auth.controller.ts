import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN, LOG_TOKEN} from "../../services/token";
import {em, IAppConfig} from "../../services/providers";
import {WebClient} from "@slack/web-api";
import {OauthAccessResponse} from "../../slack/model/ScopeGranted";
import {SlackUserInfo} from "../../slack/model/SlackUser";
import {AccessDenyError, ResourceNotFoundError} from "../api.middleware";
import {SlackTeam} from "../../slack/model/SlackTeam";
import pino from "pino";
import {SyncSlackService} from "../../slack/sync-slack.service";
import {HasPreviousError, isPlatformError} from "../../services/utils";
import SlackWorkspace from "../../entity/slack-workspace";
import {User} from "../../entity";
import {bind} from "../../decorator/bind";
import {authenticate, reqContext} from "../middlewares";

class OAuthError extends HasPreviousError {
  constructor(message?: string, public response?: OauthAccessResponse) {
    super(message);
  }
}

@Injectable()
export class AuthController {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private webClient: WebClient,
    @Inject(LOG_TOKEN) private logger: pino.Logger,
    private syncSlackService: SyncSlackService,
  ) {
  }

  async session(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.status(reqContext().user ? 200 : 404);
    res.send(reqContext().user || JSON.stringify({}));
  }

  logout = (req, res) => {
    const session = req.session;
    session.destroy(err => {
      if (err) {
        this.logger.error(err, 'Destroy session error')
      }

      return res.status(err ? 500 : 204).send('');
    })
  }

  @bind
  async auth(req, res) {
    if (reqContext().user) {
      res.redirect('/')
      return;
    }

    if (req.query.error === 'access_denied') {
      throw new AccessDenyError()
    }
    if (!req.query.code) {
      throw new ResourceNotFoundError()
    }

    let response: OauthAccessResponse;
    try {
      // https://api.slack.com/methods/oauth.v2.access
      response = await this.webClient.oauth.v2.access({
        client_id: this.config.slackClientID,
        client_secret: this.config.slackSecret,
        code: req.query.code as string,
        redirect_uri: `${`https://${req.hostname}`}/api/auth`,
      }) as any
    } catch (e) {
      if (isPlatformError(e) && e.data.error === 'invalid_code') {
        this.logger.info(e, 'Invalid code 0Auth2')
        res.status(400).send('Invalid code'); // TODO redirect notify?
        return;
      } else {
        throw e;
      }
    }

    this.logger.debug(response, '0Auth2 response')

    if (!response.ok) {
      // LOG ?
      throw new OAuthError('Oauth is not ok', response)
    }

    const workspaceRepository = em().getRepository(SlackWorkspace);

    let workspace = await workspaceRepository.findOne(response.team.id);
    const newWorkspace = !workspace

    if (!workspace) {
      workspace = new SlackWorkspace()
      workspace.id = response.team.id;
    }
    workspace.name = response.team.name

    if (response.token_type === 'bot') {
      workspace.accessToken = response.access_token
    } else {
      this.logger.warning(response, 'Oauth response no content token type as bot')
      // TODO throw ?!
    }

    if (newWorkspace) {
      const teamInfo: {team: SlackTeam} = (await this.webClient.team.info({
        team: workspace.id,
        token: workspace.accessToken
      })) as any;
      workspace.domain = teamInfo.team.domain;
    }
    await workspaceRepository.persist(workspace);

    const userRepository = em().getRepository(User);
    let user = await userRepository.findOne(response.authed_user.id);
    if (!user) {
      user = new User();
      user.id = response.authed_user.id;
    }

    if (response.token_type !== 'bot') {
      user.accessToken = response.authed_user.access_token;
    } else {
      // TODO special role?
    }

    if (!user.name) { // || new Date() - user.updatedAt > 3 days
      const userInfo: SlackUserInfo = await this.webClient.users.info({
        user: user.id,
        token: workspace.accessToken
      }) as any
      user.name = userInfo.user.name;
      user.profile = userInfo.user.profile;
    }

    user.workspace = workspace;
    await userRepository.persistAndFlush(user);

    authenticate(user, req);

    if (newWorkspace) {
      await this.syncSlackService.syncForWorkspace(workspace);
    }

    res.redirect('/')

    if (!newWorkspace) {
      await this.syncSlackService.syncForWorkspace(workspace);
    }
  }
}
