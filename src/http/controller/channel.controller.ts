import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN} from "../../services/token";
import {em, IAppConfig} from "../../services/providers";
import {Request, Response} from "express";
import {authorized, bind} from "../../services/decorators";
import {Channel} from "../../entity";
import {serialize} from "class-transformer";

@Injectable()
export class ChannelController {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
  ) {
  }

  @bind
  @authorized
  async listByWorkspace(req: Request, res: Response) {
    const channels = await em().find(Channel, { // TODO find without relations
      workspace: req.context.user.workspace,
      isEnabled: true,
      isArchived: false
    });

    res.setHeader('Content-Type', 'application/json')
    res.send(serialize(channels));
  }
}
