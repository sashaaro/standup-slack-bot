import {IHttpAction} from "./index";
import {STAND_UP_BOT_TRANSPORT} from "../../bot/StandUpBotService";
import {Connection} from "typeorm";
import {CONFIG_TOKEN} from "../../services/token";
import DashboardContext from "../../services/DashboardContext";
import {ITransport} from "../../bot/models";
import { Injectable, Inject } from 'injection-js';
import {IAppConfig} from "../../services/providers";
import {AccessDenyError} from "../dashboardExpressMiddleware";
import {QUEUE_SLACK_SYNC_DATA, SlackTransport} from "../../slack/SlackTransport";
import {Queue} from "bullmq";

@Injectable()
export class SyncAction implements IHttpAction {
  transport: SlackTransport;

  constructor(
    private connection: Connection,
    private queue: Queue,
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(STAND_UP_BOT_TRANSPORT) transport: ITransport,
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

    if (!context.user.workspace) {
      res.send('SlackWorkspace is not found') // TODO 403
      return;
    }

    await this.queue.add(QUEUE_SLACK_SYNC_DATA, {teamId: context.user.workspace.id})

    res.redirect('/');
  }
}
