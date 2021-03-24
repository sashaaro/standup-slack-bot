import * as yargs from "yargs";
import {SlackBotTransport} from "../slack/slack-bot-transport.service";
import StandupNotifier from "../slack/standup-notifier";
import {Inject} from "injection-js";
import {LOGGER_TOKEN, REDIS_TOKEN, TERMINATE} from "../services/token";
import {Connection} from "typeorm";
import {forkJoin, from, Observable, of} from "rxjs";
import {Redis} from "ioredis";
import {redisReady} from "./QueueConsumeCommand";
import {Logger} from "winston";
import {map, mapTo, mergeMap, takeUntil} from "rxjs/operators";
import {bind} from "../services/decorators";
import {fromPromise} from "rxjs/internal/observable/fromPromise";
import {ContextualError} from "../services/utils";
import UserStandup from "../model/UserStandup";
import User from "../model/User";

export class StandupNotifyCommand implements yargs.CommandModule {
  static meta = {
    command: 'standup:notify',
    describe: 'Notify teams about standup starting'
  }

  constructor(
    private slackTransport: SlackBotTransport,
    private standupNotifier: StandupNotifier,
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
    const {start$, end$} = this.standupNotifier.create()
    start$.pipe(
      mergeMap(standups => forkJoin(
        standups.map(standup =>
          standup.team.users.map(
            user => fromPromise(this.slackTransport.sendGreetingMessage(user, standup).then(messageResult => ({
              messageResult, user, standup
            })))
          )
        ).flat(1)
      )),
      mergeMap(list => {
        const userStandups = list.map(({messageResult, standup, user}) => {
          const userStandup = new UserStandup()
          userStandup.standup = standup;
          userStandup.answers = [];
          userStandup.user = user;

          userStandup.slackMessage = messageResult;
          return userStandup;
        })
        return fromPromise(this.connection.manager.insert(UserStandup, userStandups)).pipe(mapTo(list))
      }),
      takeUntil(this.terminate$)
    ).subscribe({
      next: list => {
        this.logger.info('Start daily meetings', {standups: list.map(({standup}) => standup.id)})
      },
      error: error => this.logger.error('Start daily meeting error', {error})
    });

    end$.pipe(
      mergeMap(standups => fromPromise(
        Promise.all(standups.map(standup => this.slackTransport.sendReport(standup))))
      ),
      takeUntil(this.terminate$)
    ).subscribe({
      next: standups => {
        // TODO insert to slack message table?!
      },
      error: error => this.logger.error('send report error', {error})
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
