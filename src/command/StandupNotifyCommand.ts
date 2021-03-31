import * as yargs from "yargs";
import {SlackBotTransport} from "../slack/slack-bot-transport.service";
import StandupNotifier from "../slack/standup-notifier";
import {Inject} from "injection-js";
import {LOG_TOKEN, MIKRO_TOKEN, REDIS_TOKEN, TERMINATE} from "../services/token";
import {forkJoin, Observable} from "rxjs";
import {Redis} from "ioredis";
import {redisReady} from "./QueueConsumeCommand";
import {mapTo, mergeMap, takeUntil} from "rxjs/operators";
import {fromPromise} from "rxjs/internal/observable/fromPromise";
import {UserStandup} from "../entity";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import {bind} from "../decorator/bind";

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
    @Inject(LOG_TOKEN) protected log,
    @Inject(MIKRO_TOKEN) private mikroORM,
  ) {}

  @bind
  async handler(args: yargs.Arguments<{}>) {
    this.log.info('Database connection estimating...');
    let mikroORM: MikroORM<PostgreSqlDriver>;
    mikroORM = await this.mikroORM

    if (!await mikroORM.isConnected()) {
      await mikroORM.connect()
      await mikroORM.em.execute('set application_name to "Standup Bot Notifier";');
    }

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
      mergeMap(standups => forkJoin(
        standups.map(standup =>
          standup.team.users.getItems().map(
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
        return fromPromise(this.mikroORM.em.persist(UserStandup, userStandups)).pipe(mapTo(list))
      }),
      takeUntil(this.terminate$)
    ).subscribe({
      next: list => {
        this.log.info('Start daily meetings', {standups: list.map(({standup}) => standup.id)})
      },
      error: error => this.log.error(error, 'Start daily meeting error')
    });

    end$.pipe(
      mergeMap(standups => fromPromise(
        Promise.all( // TODO allStandup
          standups.map(standup =>
            this.slackTransport.sendReport(standup).then(msg => standup)
          ))
        )
      ),
      takeUntil(this.terminate$)
    ).subscribe({
      next: standups => {
        // TODO insert to slack message table?!
        this.log.info(standups.map(s => s.id), 'Report send');
      },
      error: error => this.log.error(error, 'send report error')
    })

    this.terminate$.subscribe(() => {
      this.mikroORM.close()
    });

    this.log.info('Notifier listen');
  }
}
