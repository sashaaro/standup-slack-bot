import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {Connection} from "typeorm";
import {RENDER_TOKEN} from "../../services/token";
import {ITeam} from "../../bot/models";
import {AccessDenyError} from "../dashboardExpressMiddleware";

@Injectable()
export class ChannelsAction {
  constructor(
    private connection: Connection,
    @Inject(RENDER_TOKEN) private render: Function
  ) {
  }

  handle: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    if (req.method == "POST") {
      // todo validate
      const settings = <ITeam|any>req.body
      // Object.assign(req.context.user.channel, settings)
      // await this.connection.getRepository(Channel).save(context.channel)
    }

    res.send(this.render('channels', {
      activeMenu: 'channels'
    }));
  }
}
