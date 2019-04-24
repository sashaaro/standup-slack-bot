import {Request} from "express";
import {Service} from "typedi";
import {Connection} from "typeorm";
import {Channel} from "../model/Channel";

export interface IAuthUser {
  access_token: string,
  scope: any,
  user_id: string,
  team_name: string,
  team_id: string,
  bot: any,
}

@Service()
export default class AuthorizationContext {
  constructor(private connection: Connection) {
  }

  setUser(req: Request, user: IAuthUser) {
    req.session.user = user
  }

  getUser(req: Request): IAuthUser|null {
    return req.session.user
  }

  setSelectedChannel(req: Request, channel: Channel) {
    req.session.channel = channel.id
  }

  async getSelectedChannel(req: Request) {
    const user = this.getUser(req)

    if (!user) {
      return null
    }

    if (!req.session.channel) {
      return null
    }

    const channel = await this.connection
      .getRepository(Channel)
      .createQueryBuilder('ch')
      .leftJoinAndSelect('ch.questions', 'questions')
      .where({id: req.session.channel})
      .andWhere('ch.isArchived = false')
      .andWhere('ch.isEnabled = true')
      .andWhere('questions.isEnabled = true')
      .orderBy("questions.index", "ASC")
      .getOne();

    return channel
  }
}
