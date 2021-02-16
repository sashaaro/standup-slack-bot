import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN, LOGGER_TOKEN} from "../../services/token";
import {IAppConfig} from "../../services/providers";
import {WebClient} from "@slack/web-api";
import {Connection} from "typeorm";
import User from "../../model/User";
import {Logger} from "winston";
import {authorized, bind} from "../../services/utils";
import {Request, Response} from "express";

@Injectable()
export class UsersController {
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
    const users = await this.connection.getRepository(User).find({
      workspace: req.context.user.workspace
    })

    res.setHeader('Content-Type', 'application/json');
    res.send(users);
  }
}
