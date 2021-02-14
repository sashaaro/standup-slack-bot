import {IHttpAction} from "./index";
import {STAND_UP_BOT_TRANSPORT} from "../../bot/StandUpBotService";
import {Connection} from "typeorm";
import {CONFIG_TOKEN, IQueueFactory, QUEUE_FACTORY_TOKEN} from "../../services/token";
import {ITransport} from "../../bot/models";
import { Injectable, Inject } from 'injection-js';
import {IAppConfig} from "../../services/providers";
import {AccessDenyError} from "../apiExpressMiddleware";
import {SlackBotTransport} from "../../slack/slack-bot-transport.service";

@Injectable()
export class SyncAction {
  transport: SlackBotTransport;

  constructor(
    private connection: Connection,
    @Inject(QUEUE_FACTORY_TOKEN) private queueFactory: IQueueFactory,
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(STAND_UP_BOT_TRANSPORT) transport: ITransport,
  ) {
    if (transport instanceof SlackBotTransport) {
      this.transport = transport;
    } else {
      throw new Error('IStandUpProvider is not supported by UI')
    }
  }

  handle: IHttpAction = async (req, res) => {
    if (!req.context.user) {
      throw new AccessDenyError();
    }

    this.transport.syncData(req.context.user.workspace); // TODO
    // TODO await this.queueFactory(QUEUE_NAME_SLACK_EVENTS).add(QUEUE_SLACK_SYNC_DATA, {teamId: req.context.user.workspace.id})

    res.redirect('/');
  }
}
