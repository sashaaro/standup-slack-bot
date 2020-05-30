import {IHttpAction} from "./index";
import {STAND_UP_BOT_TRANSPORT} from "../../bot/StandUpBotService";
import {Connection} from "typeorm";
import {CONFIG_TOKEN, IQueueFactory, QUEUE_FACTORY_TOKEN} from "../../services/token";
import DashboardContext from "../../services/DashboardContext";
import {ITransport} from "../../bot/models";
import { Injectable, Inject } from 'injection-js';
import {IAppConfig, QUEUE_MAIN_NAME} from "../../services/providers";
import {AccessDenyError} from "../dashboardExpressMiddleware";
import {QUEUE_SLACK_SYNC_DATA, SlackTransport} from "../../slack/SlackTransport";
import {Queue} from "bullmq";

@Injectable()
export class SyncAction {
  transport: SlackTransport;

  private queue = this.queueFactory(QUEUE_MAIN_NAME)

  constructor(
    private connection: Connection,
    @Inject(QUEUE_FACTORY_TOKEN) private queueFactory: IQueueFactory,
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(STAND_UP_BOT_TRANSPORT) transport: ITransport,
  ) {
    if (transport instanceof SlackTransport) {
      this.transport = transport;
    } else {
      throw new Error('IStandUpProvider is not supported by UI')
    }
  }

  handle: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    await this.queue.add(QUEUE_SLACK_SYNC_DATA, {teamId: req.context.user.workspace.id})

    res.redirect('/');
  }
}
