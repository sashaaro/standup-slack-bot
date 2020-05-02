import * as yargs from "yargs";
import {SlackTransport} from "../slack/SlackTransport";
import StandUpBotService from "../bot/StandUpBotService";
import StandUp from "../model/StandUp";
import {Inject} from "injection-js";
import {IWorkerFactory, WORKER_FACTORY_TOKEN} from "../services/token";
import {Connection} from "typeorm";

export class StandupNotifyCommand implements yargs.CommandModule {
  command = 'standup:notify';
  describe = 'Notify teams about standup starting';

  constructor(
    @Inject(WORKER_FACTORY_TOKEN) private workerFactory: IWorkerFactory,
    @Inject(SlackTransport) private slackTransport: SlackTransport,
    @Inject(StandUpBotService) private standUpBotService: StandUpBotService,
    private connection: Connection,
  ) {}

  async handler(args: yargs.Arguments<{}>) {
    await this.connection.connect();

    this.standUpBotService.finishStandUp$.subscribe((standUp: StandUp) => {
      this.slackTransport.sendReport(standUp)
    });

    this.standUpBotService.startStandUpInterval();
  }
}
