import * as yargs from "yargs";
import {SlackBotTransport} from "../slack/slack-bot-transport.service";
import StandupNotifier from "../slack/standup-notifier";
import {Inject} from "injection-js";
import {IMikroFactory, LOG_TOKEN, MIKRO_FACTORY_TOKEN, REDIS_TOKEN, TERMINATE} from "../services/token";
import {concat, Observable} from "rxjs";
import {Redis} from "ioredis";
import {redisReady} from "./queue-consume.command";
import {map, mapTo, mergeMap, switchMap, takeUntil} from "rxjs/operators";
import {fromPromise} from "rxjs/internal/observable/fromPromise";
import {UserStandup} from "../entity";
import {bind} from "../decorator/bind";
import {Logger} from "pino";

export class StandupNotifyCommand implements yargs.CommandModule {
  static meta = {
    command: 'standup:notify',
    describe: 'Notify teams about standup starting'
  }

  constructor(
    private slackTransport: SlackBotTransport,
    private standupNotifier: StandupNotifier,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(TERMINATE) protected terminate$: Observable<void>,
    @Inject(LOG_TOKEN) protected log: Logger,
    @Inject(MIKRO_FACTORY_TOKEN) private mikroFactory: IMikroFactory,
  ) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    this.log.info('Database connection estimating...');
    const mikroORM = await this.mikroFactory('Standup Bot Notifier')
    await mikroORM.connect()

    const em = mikroORM.em;

    try {
      await this.redis.connect();
    } catch (e) {
      if (!e.message.startsWith('Redis is already connecting')) {
        throw e;
      }
    }

    await redisReady(this.redis);

    this.log.info('Start standup notificator loop...');
    const {start$, end$} = this.standupNotifier.create(mikroORM)
    start$.pipe(
      mergeMap(standup => {
        return concat(...standup.team.users.getItems().map(
          user => fromPromise(
            this.slackTransport.sendGreetingMessage(user, standup)
          ).pipe(
            switchMap(messageResult => {
              const userStandup = new UserStandup()
              userStandup.standup = standup;
              userStandup.user = user;
              userStandup.slackMessage = messageResult;
              return fromPromise(em.persistAndFlush(userStandup)).pipe(mapTo(userStandup))
            }))
          )
        )
      }),
      takeUntil(this.terminate$)
    ).subscribe({
      next: userStandup => {
        this.log.debug({userStandupId: userStandup.id}, 'Created user standup')
      },
      error: error => this.log.error(error, 'Start daily meeting error')
    });

    end$.pipe(
      mergeMap(standups => fromPromise(
        Promise.all( // TODO allStandup
          standups.map(standup =>
            this.slackTransport.sendReport(standup).then(msg => standup) // TODO save report msg
          ))
        )
      ),
      takeUntil(this.terminate$)
    ).subscribe({
      next: standups => {
        // TODO insert to slack message table?!
        this.log.info({standups: standups.map(s => s.id)}, 'Standups ended and reports were sent');
      },
      error: error => this.log.error(error, 'Send report error')
    })

    this.terminate$.subscribe(() => {
      em.getConnection().close();
    });

    this.log.info('Notifier listen');
  }
}
