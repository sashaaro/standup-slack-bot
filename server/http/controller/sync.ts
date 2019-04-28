import {IHttpAction} from "./index";
import {STAND_UP_BOT_STAND_UP_PROVIDER} from "../../bot/StandUpBotService";
import {Connection} from "typeorm";
import {IAppConfig} from "../../index";
import {CONFIG_TOKEN} from "../../services/token";
import {SlackStandUpProvider} from "../../slack/SlackStandUpProvider";
import Team from "../../model/Team";
import AuthorizationContext from "../../services/AuthorizationContext";
import {IStandUpProvider} from "../../bot/models";
import { ReflectiveInjector, Injectable, Inject } from 'injection-js';

@Injectable()
export class SyncAction implements IHttpAction {
  standUpProvider: SlackStandUpProvider
  constructor(
    private connection: Connection,
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(STAND_UP_BOT_STAND_UP_PROVIDER) standUpProvider: IStandUpProvider,
    private authorizationContext: AuthorizationContext
  ) {
    if (standUpProvider instanceof SlackStandUpProvider) {
      this.standUpProvider = standUpProvider;
    } else {
      throw new Error('IStandUpProvider is not supported by UI')
    }
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

    await this.standUpProvider.updateData(team)

    return res.redirect('/')
  }
}
