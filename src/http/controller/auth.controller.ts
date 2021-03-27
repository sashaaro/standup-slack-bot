import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN, LOGGER_TOKEN} from "../../services/token";
import {em, IAppConfig} from "../../services/providers";
import {WebClient} from "@slack/web-api";
import {OauthAccessResponse} from "../../slack/model/ScopeGranted";
import {SlackUserInfo} from "../../slack/model/SlackUser";
import {AccessDenyError, ResourceNotFoundError} from "../ApiMiddleware";
import {SlackTeam} from "../../slack/model/SlackTeam";
import {Logger} from "winston";
import {SyncSlackService} from "../../slack/sync-slack.service";
import {bind} from "../../services/decorators";
import {ContextualError, isPlatformError} from "../../services/utils";
import SlackWorkspace from "../../entity/slack-workspace";
import {User} from "../../entity/user";

@Injectable()
export class AuthController {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private webClient: WebClient,
    @Inject(LOGGER_TOKEN) private logger: Logger,
    private syncSlackService: SyncSlackService,
  ) {
  }

  session: IHttpAction = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(req.context.user ? 200 : 404);
    res.send(req.context.user || JSON.stringify({}));
  }

  logout = (req, res) => {
    const session = req.session;
    session.destroy(err => {
      if (err) {
        this.logger.error('Destroy session error', {error: err})
      }

      return res.status(err ? 500 : 204).send('');
    })
  }

  @bind
  async auth(req, res) {
    if (req.context.user) {
      res.redirect('/')
      return;
    }

    if (req.query.error === 'access_denied') {
      throw new AccessDenyError() // TODO template
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
        redirect_uri: `${this.config.host}/api/auth`,
      }) as any
    } catch (e) {
      if (isPlatformError(e) && e.data.error === 'invalid_code') {
        // TODO message invalid code
        this.logger.warn('Invalid code 0Auth2', {error: e})
        res.status(400).send('400'); // TODO redirect notify?
        return;
      } else {
        throw e;
      }
    }

    this.logger.debug('0Auth2 response', response)

    if (!response.ok) {
      // LOG ?
      throw new ContextualError('Oauth is not ok', response)
    }
    console.log(response)

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
      this.logger.warning('Oauth response no content token type as bot', response)
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
    // TODO if (response.authed_user.access_token) {
      user.accessToken = response.authed_user.access_token;
    // }

    if (!user.name) { // || new Date() - user.updatedAt > 3 days
      const userInfo: SlackUserInfo = await this.webClient.users.info({
        user: user.id,
        token: workspace.accessToken
      }) as any
      user.name = userInfo.user.name;
      user.profile = userInfo.user.profile;
    }

    user.workspace = workspace;
    await userRepository.persist(user);

    req.context.authenticate(response.authed_user, user);

    if (newWorkspace) {
      await this.syncSlackService.syncForWorkspace(workspace);
    }

    res.redirect('/')

    if (!newWorkspace) {
      await this.syncSlackService.syncForWorkspace(workspace);
    }
  }
}
