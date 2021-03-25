import { Injectable, Inject } from 'injection-js';
import {CONFIG_TOKEN} from "../../services/token";
import {IAppConfig} from "../../services/providers";
import {Request, Response} from "express";
import {authorized, bind} from "../../services/decorators";

@Injectable()
export class ChannelController {
  constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
  ) {
  }

  @bind
  @authorized
  async listByWorkspace(req: Request, res: Response) {
    const channels = {}
    // await this.connection.getRepository(Channel).find({
    //   workspace: req.context.user.workspace,
    //   isEnabled: true,
    //   isArchived: false
    // });

    res.setHeader('Content-Type', 'application/json');
    res.send(channels);
  }
}
