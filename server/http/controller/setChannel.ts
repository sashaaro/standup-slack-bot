import {IHttpAction} from "./index";
import {Inject, Service} from "typedi";
import {STAND_UP_BOT_STAND_UP_PROVIDER} from "../../StandUpBotService";
import {Connection} from "typeorm";
import {IAppConfig} from "../../index";
import {CONFIG_TOKEN} from "../../services/token";
import {SlackStandUpProvider} from "../../slack/SlackStandUpProvider";
import Team from "../../model/Team";
import {Channel} from "../../model/Channel";

@Service()
export class SetChannelAction implements IHttpAction {
  constructor(
    private connection: Connection,
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(STAND_UP_BOT_STAND_UP_PROVIDER) private standUpProvider: SlackStandUpProvider,

  ) {
    if (!standUpProvider instanceof SlackStandUpProvider) {
      throw new Error('IStandUpProvider is not supported by UI')
    }
  }
  async handle(req, res) {
    const session = req.session
    if (!session.user) {
      res.send('Access deny') // TODO 403
      return;
    }
    const user = session.user;

    const teamRepository = this.connection.getRepository(Team)
    let team = await teamRepository.findOne({id: user.team_id})
    if (!team) {
      res.send('Team is not found') // TODO 403
      return;
    }

    const channelRepository = this.connection.getRepository(Channel)

    let channel: Channel;


    console.log(req.body)
    console.log(req.body.id)
    if (req.body.id) {
      channel = await channelRepository.findOne({where: {id: req.body.id}, relations: ['team']})
    }

    if (!channel || channel.team.id !== team.id) {
      res.send('Channel is not found') // TODO 403
      return;
    }

    session.channel = channel.id

    await this.standUpProvider.updateData(team)

    return res.redirect('/')
  }
}
