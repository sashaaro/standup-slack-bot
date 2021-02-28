import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN, LOGGER_TOKEN} from "../../services/token";
import {IAppConfig} from "../../services/providers";
import {WebClient} from "@slack/web-api";
import {Connection} from "typeorm";
import {Logger} from "winston";
import {Request, Response} from "express";
import {Channel} from "../../model/Channel";
import {authorized, bind} from "../../services/decorators";

@Injectable()
export class ChannelController {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private connection: Connection,
    private webClient: WebClient,
    @Inject(LOGGER_TOKEN) private logger: Logger,
  ) {
  }

  @bind
  @authorized
  async listByWorkspace(req: Request, res: Response) {
    const channels = await this.connection.getRepository(Channel).find({
      workspace: req.context.user.workspace,
      isEnabled: true,
      isArchived: false
    });

    res.setHeader('Content-Type', 'application/json');
    res.send(channels);
  }
}
