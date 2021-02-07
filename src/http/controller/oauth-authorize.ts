import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN} from "../../services/token";
import DashboardContext from "../../services/DashboardContext";
import {IAppConfig} from "../../services/providers";
import {WebClient} from "@slack/web-api";
import {Connection} from "typeorm";
import SlackWorkspace from "../../model/SlackWorkspace";
import {OauthAccessResponse} from "../../slack/model/ScopeGranted";
import User from "../../model/User";
import {SlackUserInfo} from "../../slack/model/SlackUser";
import {AccessDenyError, ResourceNotFoundError} from "../dashboardExpressMiddleware";
import {SlackTeam} from "../../slack/model/SlackTeam";
import {SlackTransport} from "../../slack/SlackTransport";

@Injectable()
export class OauthAuthorize {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private connection: Connection,
    private webClient: WebClient,
    private slackTransport: SlackTransport,
  ) {
  }

  handle: IHttpAction = async (req, res) => {
    const context = req.context as DashboardContext
    if (context.user) {
      res.redirect('/');
      return;
    }

    if (req.query.error) {
      if (req.query.error === 'access_denied') {
        throw new AccessDenyError()
      }
    }
    if (!req.query.code) {
      throw new ResourceNotFoundError()
    }

    let response: OauthAccessResponse;
    try {
      // https://api.slack.com/methods/oauth.v2.access
      response = await new WebClient().oauth.v2.access({
        client_id: this.config.slackClientID,
        client_secret: this.config.slackSecret,
        code: req.query.code as string,
        redirect_uri: `${this.config.host}/auth`,
      }) as any
    } catch (e) {
      if (e.error !== 'invalid_code') {
        throw e;
      } else {
        // TODO message invalid code
      }
    }
    if (!response.ok) {
      // LOG ?
      throw new Error(response as any)
    }

    const workspaceRepository = this.connection.manager.getRepository(SlackWorkspace);

    let workspace = await workspaceRepository.findOne(response.team.id);
    if (!workspace) {
      workspace = new SlackWorkspace()
      workspace.id = response.team.id;
      workspace.name = response.team.name
      const teamInfo: {team: SlackTeam} = (await this.webClient.team.info({team: workspace.id})) as any;
      workspace.domain = teamInfo.team.domain;
      workspace = await workspaceRepository.save(workspace);
      this.slackTransport.syncData(workspace);
    }

    const userRepository = this.connection.manager.getRepository(User);
    let user = await userRepository.findOne(response.authed_user.id);
    if (!user) {
      user = new User();
      user.id = response.authed_user.id;
      user.workspace = workspace;
      const userInfo: SlackUserInfo = await this.webClient.users.info({user: user.id}) as any
      user.name = userInfo.user.name;
      user.profile = userInfo.user.profile;
    }
    user.accessToken = response.access_token;
    user = await userRepository.save(user);

    context.authenticate(response.authed_user, user);

    return res.redirect('/')
  }
}
