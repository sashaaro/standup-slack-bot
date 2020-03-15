import {IHttpAction} from "./index";
import {STAND_UP_BOT_TRANSPORT} from "../../bot/StandUpBotService";
import {Connection} from "typeorm";
import {CONFIG_TOKEN} from "../../services/token";
import {getSyncSlackTeamKey} from "../../slack/SlackStandUpProvider";
import Team from "../../model/Team";
import DashboardContext from "../../services/DashboardContext";
import {ITransport} from "../../bot/models";
import { Injectable, Inject } from 'injection-js';
import {IAppConfig} from "../../services/providers";
import SyncLocker from "../../services/SyncServcie";
import {AccessDenyError} from "../dashboardExpressMiddleware";
import {SlackTransport} from "../../slack/SlackTransport";

@Injectable()
export class SyncAction implements IHttpAction {
  transport: SlackTransport;

  constructor(
    private connection: Connection,
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(STAND_UP_BOT_TRANSPORT) transport: ITransport,
    private syncService: SyncLocker
  ) {
    if (transport instanceof SlackTransport) {
      this.transport = transport;
    } else {
      throw new Error('IStandUpProvider is not supported by UI')
    }
  }

  async handle(req, res) {
    const context = req.context as DashboardContext;

    if (!context.user) {
      throw new AccessDenyError();
    }

    const teamRepository = this.connection.getRepository(Team)
    let team = await teamRepository.findOne({id: context.user.team.id})
    if (!team) {
      res.send('Team is not found') // TODO 403
      return;
    }


    if (!this.syncService.inProgress(getSyncSlackTeamKey(team.id))) {
      this.syncService.exec(getSyncSlackTeamKey(team.id), this.transport.syncData(team))
    } else {
      // flash message
    }

    res.redirect('/');
  }
}
