import {Provider} from "injection-js";
import {
  CONFIG_TOKEN, LOG_TOKEN, MIKRO_CONFIG_TOKEN, MIKRO_TOKEN,
  REDIS_TOKEN,
  TERMINATE, TERMINATE_HANDLER,
} from "./token";
import StandupNotifier from "../slack/standup-notifier";
import actions from "../http/controller";
import {LogLevel, WebClient} from '@slack/web-api'
import {SlackBotTransport} from "../slack/slack-bot-transport.service";
import {createEventAdapter} from "@slack/events-api";
import IOredis, {Redis} from 'ioredis';
import {commands, devCommands} from "../command";
import {Observable} from "rxjs";
import SlackEventAdapter from "@slack/events-api/dist/adapter";
import {WinstonSlackLoggerAdapter} from "../slack/WinstonSlackLoggerAdapter";
import {SlackEventListener} from "../slack/slack-event-listener";
import {SyncSlackService} from "../slack/sync-slack.service";
import {QueueRegistry} from "./queue.registry";
import pino from "pino";
import {Configuration, LoadStrategy, MigrationsOptions, MikroORM} from "@mikro-orm/core";
import {EntityManager, PostgreSqlDriver} from "@mikro-orm/postgresql";
import { AsyncLocalStorage } from "async_hooks";
import * as entities from "../entity";
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import {reqContext} from "../http/middlewares";

export interface IAppConfig {
  env: string,
  slackClientID: string,
  slackSecret: string,
  slackSigningSecret: string,
  debug: false,
  yandexMetrikaID?: string,
  rollBarAccessToken?: string,
  redisLazyConnect: boolean
  db: {
    host: string,
    database: string,
    username: string,
    password: string,
  },
  supportTelegram?: string
  redisHost?: string
  logDir?: string
}

const migrationsDir = __dirname + '/../migrations';
// const migrationsDir = __dirname + '/../../../src/migrations';// TODO

export const QUEUE_NAME_SLACK_EVENTS = 'slack_events';
export const QUEUE_NAME_SLACK_INTERACTIVE = 'slack_interactive';

export const emStorage: AsyncLocalStorage<EntityManager<PostgreSqlDriver>> = new AsyncLocalStorage<EntityManager<PostgreSqlDriver>>();
export const em = () => emStorage.getStore()

export const createConfFromEnv = (env) => ({
  env,
  slackClientID: process.env.SLACK_CLIENT_ID,
  slackSecret: process.env.SLACK_SECRET,
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
  redisHost: process.env.REDIS_HOST || 'redis',
  db: {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },
  logDir: process.env.LOG_DIR, // TODO remove?
  debug: !!process.env.DEBUG && !["false", "0"].includes(process.env.DEBUG),
  yandexMetrikaID: process.env.YANDEX_METRIKA_ID,
  rollBarAccessToken: process.env.ROLLBAR_ACCESS_TOKEN,
  supportTelegram: process.env.SUPPORT_TELEGRAM,
} as IAppConfig)


export const createLogger = (config: IAppConfig): pino.Logger => {
  const pinoOptions: pino.LoggerOptions = {
    level: 'warn',
    base: null, // https://github.com/pinojs/pino/blob/master/docs/api.md#base-object
    mixin: () => {
      const obj: any = {};
      const reqCx = reqContext();
      if (reqCx?.requestId) {
        obj.requestId = reqCx.requestId
      }
      if (reqCx?.user?.id) {
        obj.userId = reqCx.user.id
      }

      return obj;
    },
    formatters: {
      level: (label, number) => ({level: label}),
    },
  }

  let steam: pino.DestinationStream;
  if (config.debug) {
    pinoOptions.level = 'debug';
    //steam = process.stdout
    pinoOptions.transport = {target: 'pino-pretty'};
  } else {
    steam = pino.destination(`${config.logDir || 'var/log'}/${process.env.APP_CONTEXT || 'app'}.log`);
  }

  return pino(pinoOptions, steam)
}

// TODO https://github.com/microsoft/tsyringe ?!
export const createProviders = (config: IAppConfig, logger: pino.Logger): {providers: Provider[], commands: Provider[]} => {
  let providers: Provider[] = [
    {
      provide: CONFIG_TOKEN,
      useValue: config
    },
    {
      provide: REDIS_TOKEN,
      useFactory: (config) => new IOredis({
        host: config.redisHost,
        maxRetriesPerRequest: 5,
        lazyConnect: true
      }),
      deps: [CONFIG_TOKEN]
    },
    {
      provide: LOG_TOKEN,
      useValue: logger
    },
    {
      provide: MIKRO_CONFIG_TOKEN,
      useFactory: (config: IAppConfig): Configuration<PostgreSqlDriver> => {
        const clientUrl =
            `postgresql://${config.db.username}:${config.db.password}@${config.db.host}:5432/${config.db.database}`

        const migrations: MigrationsOptions = {
          transactional: true,
          path: migrationsDir,
          disableForeignKeys: false, //?!
          allOrNothing: true,
          dropTables: false,
          emit: 'ts'
        };

        return new Configuration<PostgreSqlDriver>({
          entities: Object.values(entities),
          highlighter: config.debug ? new SqlHighlighter() : undefined,
          debug: config.debug ? ['query', 'query-params', 'info'] : false,
          type: 'postgresql',
          allowGlobalContext: true,
          loadStrategy: LoadStrategy.JOINED,
          clientUrl,
          context: () => emStorage.getStore(),
          migrations
        });
      },
      deps: [CONFIG_TOKEN]
    },
    {
      provide: MIKRO_TOKEN,
      useFactory: (config: Configuration<PostgreSqlDriver>) => {
        return new MikroORM<PostgreSqlDriver>(config);
      },
      deps: [MIKRO_CONFIG_TOKEN]
    },
    QueueRegistry,
    {
      provide: WebClient,
      useFactory: (config: IAppConfig, logger: pino.Logger) => new WebClient(null,  {
        logger: new WinstonSlackLoggerAdapter(logger.child({channel: 'slack'})),
        logLevel: LogLevel.DEBUG
      }),
      deps: [CONFIG_TOKEN, LOG_TOKEN]
    },
    {
      provide: SlackEventAdapter,
      useFactory: (config: IAppConfig) => createEventAdapter(config.slackSigningSecret),
      deps: [CONFIG_TOKEN]
    },
    SlackBotTransport,
    SlackEventListener,
    SyncSlackService,
    StandupNotifier,
    ...actions,
    {
      provide: TERMINATE,
      useValue: new Observable((observer) => {
        process.on('SIGTERM', () => {
          observer.next();
          observer.complete();
        })
        process.on('SIGINT', () => {
          observer.next();
          observer.complete();
        })
      })
    },
    {
      provide: TERMINATE_HANDLER,
      useFactory: (mikroOrm: MikroORM, redis: Redis) => () => {
        if (mikroOrm) {
          mikroOrm.isConnected().then(isConnected => {
            logger.info('Closing orm connection...')
            if (isConnected) {
              mikroOrm.close().catch(err => {
                this.log.error(e, 'Close mikroORM error')
              });
            }
          })
        }

        if (redis) { // TODO && redis.status === ...
          try {
            redis.disconnect()
          } catch (e) {
            if (!e.message.startsWith('Connection is closed')) {
              logger.error(e, 'Close redis error')
            }
          }
        }
      },
      deps: [MIKRO_TOKEN, REDIS_TOKEN]
    }
  ]

  let commandProviders = [...commands]
  if (config.env !== "prod") {
    commandProviders = [...commandProviders, ...devCommands]
  }


  providers = [...providers, ...commandProviders]

  return {providers, commands: commandProviders};
}
