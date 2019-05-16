import {IHttpAction} from "./index";
import { Injectable, Inject } from 'injection-js';
import {Connection} from "typeorm";
import {RENDER_TOKEN, TIMEZONES_TOKEN} from "../../services/token";
import {IStandUpSettings, ITimezone} from "../../bot/models";
import AuthorizationContext from "../../services/AuthorizationContext";
import ChannelRepository from "../../repository/ChannelRepository";
import {Channel} from "../../model/Channel";

@Injectable()
export class ChannelsAction implements IHttpAction {
  constructor(
    private connection: Connection,
    @Inject(TIMEZONES_TOKEN) private timezoneList: Promise<ITimezone[]>,
    @Inject(RENDER_TOKEN) private render: Function
  ) {
  }

  async handle(req, res) {
    const session = req.session
    if (!session.user) {
      res.send('Access deny') // TODO 403
      return;
    }
    const context = req.context as AuthorizationContext;
    const {team, channel} = await context.getGlobalParams()

    if (!team) { // TODO 404
      throw new Error('team is not found');
    }
    if (!channel) { // TODO 404
      throw new Error('Channel is not found');
    }

    if (req.method == "POST") {
      // todo validate
      const settings = <IStandUpSettings>req.body
      Object.assign(channel, settings)
      await this.connection.getRepository(Channel).save(channel)
    }

    res.send(this.render('channels', {
      team: team,
      timezoneList: await this.timezoneList,
      activeMenu: 'channels'
    }));
  }
}
