import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {Connection} from "typeorm";
import {RENDER_TOKEN, TIMEZONES_TOKEN} from "../../services/token";
import {IStandUpSettings, ITimezone} from "../../bot/models";
import DashboardContext from "../../services/DashboardContext";
import ChannelRepository from "../../repository/ChannelRepository";
import {Channel} from "../../model/Channel";
import {AccessDenyError} from "../dashboardExpressMiddleware";

@Injectable()
export class ChannelsAction implements IHttpAction {
  constructor(
    private connection: Connection,
    @Inject(TIMEZONES_TOKEN) private timezoneList: Promise<ITimezone[]>,
    @Inject(RENDER_TOKEN) private render: Function
  ) {
  }

  async handle(req, res) {
    const context = req.context as DashboardContext;
    if (!context.user) {
      throw new AccessDenyError();
    }
    if (!context.channel) { // TODO 404
      throw new Error('Channel is not found');
    }

    if (req.method == "POST") {
      // todo validate
      const settings = <IStandUpSettings|any>req.body
      Object.assign(context.channel, settings)
      await this.connection.getRepository(Channel).save(context.channel)
    }

    res.send(this.render('channels', {
      timezoneList: await this.timezoneList,
      activeMenu: 'channels'
    }));
  }
}
