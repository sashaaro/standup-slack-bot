import * as yargs from "yargs";
import {SlackBotTransport} from "../slack/slack-bot-transport.service";
import StandupNotifier from "../slack/standup-notifier";
import {Inject} from "injection-js";
import {LOGGER_TOKEN, REDIS_TOKEN, TERMINATE} from "../services/token";
import {Connection} from "typeorm";
import {Observable} from "rxjs";
import {Redis} from "ioredis";
import {redisReady} from "./QueueConsumeCommand";
import {Logger} from "winston";
import {takeUntil} from "rxjs/operators";
import {bind} from "../services/decorators";

export class StandupNotifyCommand implements yargs.CommandModule {
  static meta = {
    command: 'standup:notify',
    describe: 'Notify teams about standup starting'
  }

  constructor(
    private slackTransport: SlackBotTransport,
    private standUpNotifier: StandupNotifier,
    private connection: Connection,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(TERMINATE) protected terminate$: Observable<void>,
    @Inject(LOGGER_TOKEN) protected logger: Logger,
  ) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    this.logger.debug('Database connecting...');
    if (!this.connection.isConnected) {
      await this.connection.connect();
    }
    try {
      await this.redis.connect();
    } catch (e) {
      if (!e.message.startsWith('Redis is already connecting')) {
        throw e;
      }
    }

    await redisReady(this.redis);

    this.logger.debug('Start standup notificator loop...');
    const {start$, end$} = this.standUpNotifier.create()
    start$.pipe(
      takeUntil(this.terminate$)
    ).subscribe({
      next: standups => {
        this.logger.info('Start daily meetings', {standups: standups.map(standUp => standUp.id)})

        standups.forEach(standup => {
          standup.team.users.forEach(user => {
            try {
              this.slackTransport.sendGreetingMessage(user, standup)
            } catch (e) {
              this.logger.error('Start daily meeting error', {standUpId: standup.id, userId: user.id, error: e})
            }
          })
        })
      },
      error: error => this.logger.error({error})
    });

    end$.pipe(
      takeUntil(this.terminate$)
    ).subscribe({
      next: standups => {
        standups.forEach(standup => this.slackTransport.sendReport(standup))
      },
      error: error => this.logger.error({error})
    })

    this.terminate$.subscribe(() => {
      this.close();
    });

    console.log('Notifier listen!');
  }

  private close() {
    this.connection.close()
  }
}
