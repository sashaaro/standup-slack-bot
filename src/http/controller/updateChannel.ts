import {IHttpAction} from "./index";
import {Connection} from "typeorm";
import Team from "../../model/Team";
import {Channel} from "../../model/Channel";
import AuthorizationContext from "../../services/AuthorizationContext";
import { ReflectiveInjector, Injectable, Inject } from 'injection-js';

@Injectable()
export class UpdateChannelAction implements IHttpAction {
  constructor(
    private connection: Connection,
    private authorizationContext: AuthorizationContext
  ) {
  }
  async handle(req, res) {
    const user = this.authorizationContext.getUser(req)
    if (!user) {
      res.send('Access deny') // TODO 403
      return;
    }

    const teamRepository = this.connection.getRepository(Team)
    let team = await teamRepository.findOne({id: user.team_id})
    if (!team) {
      res.send('Team is not found') // TODO 403
      return;
    }

    const channelRepository = this.connection.getRepository(Channel)

    let channel: Channel;
    if (req.body.id) {
      channel = await channelRepository.findOne({where: {id: req.body.id}, relations: ['team']})
    }

    if (!channel || channel.team.id !== team.id) {
      res.send('Channel is not found') // TODO 403
      return;
    }

    if (!channel.isArchived) {
      channel.isEnabled = req.body.isEnabled
      await channelRepository.save(channel)
    }

    return res.send(channel)
  }
}
