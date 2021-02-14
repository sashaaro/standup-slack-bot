import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN, LOGGER_TOKEN} from "../../services/token";
import {IAppConfig} from "../../services/providers";
import {WebClient} from "@slack/web-api";
import {Connection} from "typeorm";
import SlackWorkspace from "../../model/SlackWorkspace";
import {OauthAccessResponse} from "../../slack/model/ScopeGranted";
import User from "../../model/User";
import {SlackUserInfo} from "../../slack/model/SlackUser";
import {AccessDenyError, ResourceNotFoundError} from "../apiExpressMiddleware";
import {SlackTeam} from "../../slack/model/SlackTeam";
import {SlackBotTransport} from "../../slack/slack-bot-transport.service";
import {Logger} from "winston";
import {Team} from "../../model/Team";

@Injectable()
export class UsersController {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private connection: Connection,
    private webClient: WebClient,
    @Inject(LOGGER_TOKEN) private logger: Logger,
    private slackTransport: SlackBotTransport,
  ) {
  }

  listByWorkspace: IHttpAction = async (req, res) => {
    const users = await this.connection.getRepository(User).find({
      workspace: req.context.user.workspace
    })

    res.send(users);
    res.setHeader('Content-Type', 'application/json');
  }
}
