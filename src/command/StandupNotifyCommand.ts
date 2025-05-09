import * as yargs from "yargs";
import {SlackBotTransport} from "../slack/slack-bot-transport.service";
import StandupNotifier from "../slack/standup-notifier";
import {Inject} from "injection-js";
import {LOG_TOKEN, MIKRO_TOKEN, REDIS_TOKEN, TERMINATE} from "../services/token";
import {concat, Observable} from "rxjs";
import {Redis} from "ioredis";
import {redisReady} from "./WorkerCommand";
import {map, mapTo, mergeMap, switchMap, takeUntil} from "rxjs/operators";
import {from} from "rxjs";
import {UserStandup} from "../entity";
import {bind} from "../decorator/bind";
import pino from "pino";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import {initMikroORM} from "../services/utils";

export class StandupNotifyCommand implements yargs.CommandModule {
  command = 'standup:notify'
  describe = 'Notify teams about standup starting'

  constructor(
    private slackTransport: SlackBotTransport,
    private standupNotifier: StandupNotifier,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(TERMINATE) protected terminate$: Observable<void>,
    @Inject(LOG_TOKEN) protected log: pino.Logger,
    @Inject(MIKRO_TOKEN) private orm: MikroORM<PostgreSqlDriver>,
  ) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    this.log.info('Database connection estimating...');
    await initMikroORM(this.orm)

    const em = this.orm.em;

    try {
      await this.redis.connect();
    } catch (e) {
      if (!e.message.startsWith('Redis is already connecting')) {
        throw e;
      }
    }

    await redisReady(this.redis);

    this.log.info('Start standup notificator loop...');
    const {start$, end$} = this.standupNotifier.create(this.orm)
    start$.pipe(
      mergeMap(standup => {
        return concat(...standup.team.users.getItems().map(
          user => from(
            this.slackTransport.sendGreetingMessage(user, standup)
          ).pipe(
            switchMap(messageResult => {
              const userStandup = new UserStandup()
              userStandup.standup = standup;
              userStandup.user = user;
              userStandup.slackMessage = messageResult;
              return from(em.persistAndFlush(userStandup)).pipe(mapTo(userStandup))
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
      mergeMap(standups => from(
        Promise.allSettled( // TODO allStandup
          standups.map(standup =>
            this.slackTransport.sendReport(standup).then(msg => standup) // TODO save report msg
          ))
        )
      ),
      takeUntil(this.terminate$)
    ).subscribe({
      next: standups => {
        // TODO insert to slack message table?!
        // TODO this.log.info({standups: standups.map(s => s.id)}, 'Standups ended and reports were sent');
      },
      error: error => this.log.error(error, 'Send report error')
    })

    this.log.info('Notifier listen');
  }
}
