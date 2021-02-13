import * as yargs from "yargs";
import {SlackBotTransport} from "../slack/slack-bot-transport.service";
import StandUpBotService from "../bot/StandUpBotService";
import StandUp from "../model/StandUp";
import {Inject} from "injection-js";
import {LOGGER_TOKEN, REDIS_TOKEN, TERMINATE} from "../services/token";
import {Connection} from "typeorm";
import {Observable} from "rxjs";
import {Redis} from "ioredis";
import {redisReady} from "./QueueConsumeCommand";
import {bind} from "../services/utils";
import {Logger} from "winston";

export class StandupNotifyCommand implements yargs.CommandModule {
  command = 'standup:notify';
  describe = 'Notify teams about standup starting';

  constructor(
    @Inject(SlackBotTransport) private slackTransport: SlackBotTransport,
    @Inject(StandUpBotService) private standUpBotService: StandUpBotService,
    private connection: Connection,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(TERMINATE) protected terminate$: Observable<void>,
    @Inject(LOGGER_TOKEN) protected logger: Logger,
  ) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    this.logger.debug('Database connecting...');
    await this.connection.connect();
    try {
      await this.redis.connect();
    } catch (e) {
      if (!e.message.startsWith('Redis is already connecting')) {
        throw e;
      }
    }

    await redisReady(this.redis);

    this.standUpBotService.finishStandUp$.subscribe((standUp: StandUp) => {
      if (standUp.team.reportSlackChannel) {
        this.slackTransport.sendReport(standUp)
      }
    });

    this.logger.debug('Start standup notificator loop...');
    this.standUpBotService.startStandUpInterval().subscribe({
      error: () => this.close(),
      complete: () => this.close()
    });

    this.terminate$.subscribe(() => {
      this.close();
    });

    console.log('Notifier listen!');
  }

  private close() {
    this.connection.close()
  }
}
