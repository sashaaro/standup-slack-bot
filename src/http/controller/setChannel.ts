import {IHttpAction} from "./index";
import {Injectable} from 'injection-js';import {Connection} from "typeorm";
import Team from "../../model/Team";
import {Channel} from "../../model/Channel";
import AuthorizationContext from "../../services/AuthorizationContext";
import {AccessDenyError} from "../dashboardExpressMiddleware";

@Injectable()
export class SetChannelAction implements IHttpAction {
  constructor(
    private connection: Connection,
  ) {
  }
  async handle(req, res) {
    const context = req.context as AuthorizationContext;
    const user = context.getUser()
    if (!user) {
      throw new AccessDenyError();
    }

    const {team} = await context.getGlobalParams()

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

    context.setSelectedChannel(channel)
    res.redirect('/')
  }
}
