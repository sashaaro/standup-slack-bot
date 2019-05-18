import {IHttpAction} from "./index";
import {STAND_UP_BOT_STAND_UP_PROVIDER} from "../../bot/StandUpBotService";
import {Connection} from "typeorm";
import {CONFIG_TOKEN} from "../../services/token";
import {getSyncSlackTeamKey, SlackStandUpProvider} from "../../slack/SlackStandUpProvider";
import Team from "../../model/Team";
import AuthorizationContext from "../../services/AuthorizationContext";
import {IStandUpProvider} from "../../bot/models";
import { Injectable, Inject } from 'injection-js';
import {IAppConfig} from "../../services/providers";
import SyncService from "../../services/SyncServcie";
import {AccessDenyError} from "../dashboardExpressMiddleware";

@Injectable()
export class SyncAction implements IHttpAction {
  standUpProvider: SlackStandUpProvider

  constructor(
    private connection: Connection,
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(STAND_UP_BOT_STAND_UP_PROVIDER) standUpProvider: IStandUpProvider,
    private syncService: SyncService
  ) {
    if (standUpProvider instanceof SlackStandUpProvider) {
      this.standUpProvider = standUpProvider;
    } else {
      throw new Error('IStandUpProvider is not supported by UI')
    }
  }

  async handle(req, res) {
    const user = (req.context as AuthorizationContext).getUser()
    if (!user) {
      throw new AccessDenyError();
    }

    const teamRepository = this.connection.getRepository(Team)
    let team = await teamRepository.findOne({id: user.team_id})
    if (!team) {
      res.send('Team is not found') // TODO 403
      return;
    }


    if (!this.syncService.inProgress(getSyncSlackTeamKey(team.id))) {
      this.syncService.exec(getSyncSlackTeamKey(team.id), this.standUpProvider.updateData(team))
    } else {
      // flash message
    }

    res.redirect('/');
  }
}
