import * as express from 'express'
import {Connection} from "typeorm";
import {Channel} from "../model/Channel";
import {Inject, Injectable} from 'injection-js';
import SyncService from "./SyncServcie";
import Team from "../model/Team";
import {IAppConfig} from "./providers";
import {CONFIG_TOKEN} from "./token";

export interface IAuthUser {
  access_token: string,
  scope: any,
  user_id: string,
  team_name: string,
  team_id: string,
  bot: any,
}

@Injectable()
export default class AuthorizationContext {
  intl: Intl.DateTimeFormat;

  constructor(
    private req: express.Request,
    private connection: Connection,
    private syncService: SyncService,
    @Inject(CONFIG_TOKEN) private config: IAppConfig
  ) {
    const locale = 'en';
    this.intl = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', weekday: 'long' });
  }

  setUser(user: IAuthUser) {
    this.req.session.user = user // TODO save id only
  }

  getUser(): IAuthUser|null {
    return this.req.session.user
  }

  setSelectedChannel(channel: Channel) {
    this.req.session.channel = channel.id
  }

  async getSelectedChannel() {
    const user = this.getUser()

    if (!user) {
      return null
    }

    if (!this.req.session.channel) {
      return null
    }

    const channel = await this.connection
      .getRepository(Channel)
      .createQueryBuilder('ch')
      .leftJoinAndSelect('ch.timezone', 'timezone')
      .leftJoinAndSelect('ch.questions', 'questions')
      .where({id: this.req.session.channel})
      .andWhere('ch.isArchived = false')
      .andWhere('ch.isEnabled = true')
      .andWhere('questions.isEnabled = true')
      .orderBy("questions.index", "ASC")
      .getOne();

    return channel
  }

  async getGlobalParams() // TODO move
  {
    const user = this.getUser();
    const teamRepository = this.connection.getRepository(Team)
    const team = await teamRepository.findOne(user.team_id)
    return {
      user,
      team,
      debug: this.config.debug,
      channel: await this.getSelectedChannel(),
      syncInProgress: user ? this.syncService.inProgress('update-slack-' + user.team_id) : false,
      intl: this.intl
    }
  }
}
