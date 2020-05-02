import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN} from "../../services/token";
import DashboardContext from "../../services/DashboardContext";
import {IAppConfig} from "../../services/providers";
import {WebClient} from "@slack/web-api";
import {Connection} from "typeorm";
import Team from "../../model/Team";
import {OauthAccessResponse} from "../../slack/model/ScopeGranted";
import User from "../../model/User";
import {SlackUserInfo} from "../../slack/model/SlackUser";
import {ResourceNotFoundError} from "../dashboardExpressMiddleware";
import {SlackTeam} from "../../slack/model/SlackTeam";

@Injectable()
export class OauthAuthorize implements IHttpAction {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private connection: Connection,
    private webClient: WebClient,
  ) {
  }

  async handle(req, res) {
    const context = req.context as DashboardContext
    if (context.user) {
      res.redirect('/');
      return;
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
        code: req.query.code,
        //redirect_uri: `${this.config.host}/auth`,
      }) as any
    } catch (e) {
      // LOG ?
      throw new Error(e)
    }
    if (!response.ok) {
      // LOG ?
      throw new Error(response as any)
    }

    const teamRepository = this.connection.manager.getRepository(Team);
    const userRepository = this.connection.manager.getRepository(User);

    let team = await teamRepository.findOne(response.team.id);
    if (!team) {
      team = new Team()
      team.id = response.team.id;
      team.name = response.team.name
      const teamInfo: {team: SlackTeam} = (await this.webClient.team.info({team: team.id})) as any;
      team.domain = teamInfo.team.domain;
      team = await teamRepository.save(team);
    }

    let user = await userRepository.findOne(response.authed_user.id);
    if (!user) {
      user = new User();
      user.id = response.authed_user.id;
      user.team = team;
      const userInfo: SlackUserInfo = await this.webClient.users.info({user: user.id}) as any
      user.name = userInfo.user.name;
      user.profile = userInfo.user.profile;
      user = await userRepository.save(user)
    }

    context.authenticate(response.authed_user, user);

    return res.redirect('/')
  }
}
