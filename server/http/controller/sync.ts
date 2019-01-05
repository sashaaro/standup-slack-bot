import {IHttpAction} from "./index";
import {Inject, Service} from "typedi";
import {IStandUpProvider, STAND_UP_BOT_STAND_UP_PROVIDER} from "../../StandUpBotService";
import {Connection} from "typeorm";
import {IAppConfig} from "../../index";
import {CONFIG_TOKEN} from "../../services/token";
import {SlackStandUpProvider} from "../../slack/SlackStandUpProvider";
import Team from "../../model/Team";

@Service()
export class SyncAction implements IHttpAction {
  standUpProvider: SlackStandUpProvider
  constructor(
    private connection: Connection,
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(STAND_UP_BOT_STAND_UP_PROVIDER) standUpProvider: IStandUpProvider,
  ) {
    if (standUpProvider instanceof SlackStandUpProvider) {
      this.standUpProvider = standUpProvider;
    } else {
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

    await this.standUpProvider.updateData(team)

    return res.redirect('/')
  }
}
