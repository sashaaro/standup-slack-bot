import * as yargs from "yargs";
import {SlackTransport} from "../slack/SlackTransport";
import StandUpBotService from "../bot/StandUpBotService";
import StandUp from "../model/StandUp";
import {Inject} from "injection-js";
import {REDIS_TOKEN, TERMINATE} from "../services/token";
import {Connection} from "typeorm";
import {Observable} from "rxjs";
import {Redis} from "ioredis";
import {redisReady} from "./QueueConsumeCommand";

export class StandupNotifyCommand implements yargs.CommandModule {
  command = 'standup:notify';
  describe = 'Notify teams about standup starting';

  constructor(
    @Inject(SlackTransport) private slackTransport: SlackTransport,
    @Inject(StandUpBotService) private standUpBotService: StandUpBotService,
    private connection: Connection,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(TERMINATE) protected terminate$: Observable<void>
  ) {}

  async handler(args: yargs.Arguments<{}>) {
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

    this.standUpBotService.startStandUpInterval().subscribe({
      error: () => this.close(),
      complete: () => this.close()
    });

    this.terminate$.subscribe(() => {
      this.close();
    })
  }

  private close() {
    this.connection.close()
  }
}
