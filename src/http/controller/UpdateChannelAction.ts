import {IHttpAction} from "./index";
import {Injectable} from 'injection-js';import {Connection} from "typeorm";
import Team from "../../model/Team";
import {Channel} from "../../model/Channel";
import DashboardContext from "../../services/DashboardContext";
import {AccessDenyError} from "../dashboardExpressMiddleware";

@Injectable()
export class UpdateChannelAction implements IHttpAction {
  constructor(
    private connection: Connection,
  ) {
  }
  async handle(req, res) {
    const context = req.context as DashboardContext;

    if (!context.user) {
      throw new AccessDenyError();
    }

    const channelRepository = this.connection.getRepository(Channel)
    let channel: Channel;

    if (req.body.id) {
      channel = await channelRepository.findOne({where: {id: req.body.id}, relations: ['team']})
    }

    if (!channel || channel.team.id !== context.user.team.id) {
      res.send('Channel is not found') // TODO 403
      return;
    }

    context.selectChannel(channel)
    res.redirect('/')
  }
}
