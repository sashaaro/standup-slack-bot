import {Provider} from "injection-js";
import {
  CONFIG_TOKEN, LOG_TOKEN, MIKRO_TOKEN,
  REDIS_TOKEN,
  TERMINATE,
} from "./token";
import StandupNotifier from "../slack/standup-notifier";
import actions from "../http/controller";
import {LogLevel, WebClient} from '@slack/web-api'
import {SlackBotTransport} from "../slack/slack-bot-transport.service";
import {createEventAdapter} from "@slack/events-api";
import * as fs from "fs";
import IOredis from 'ioredis';
import dotenv from "dotenv";
import {commands, devCommands} from "../command";
import {Observable} from "rxjs";
import SlackEventAdapter from "@slack/events-api/dist/adapter";
import {WinstonSlackLoggerAdapter} from "../slack/WinstonSlackLoggerAdapter";
import {SlackEventListener} from "../slack/slack-event-listener";
import {SyncSlackService} from "../slack/sync-slack.service";
import {QueueRegistry} from "./queue.registry";
import pino, {Logger} from "pino";
import {MikroORM} from "@mikro-orm/core";
import {EntityManager, PostgreSqlDriver} from "@mikro-orm/postgresql";
import { AsyncLocalStorage } from "async_hooks";
import * as entities from "../entity";
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

export interface IAppConfig {
  env: string,
  slackClientID: string,
  slackSecret: string,
  slackSigningSecret: string,
  host: string,
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

export const emStorage = new AsyncLocalStorage<EntityManager<PostgreSqlDriver>>();

export const em = () => emStorage.getStore()

// TODO https://github.com/microsoft/tsyringe ?!
export const createProviders = (env = 'dev'): {providers: Provider[], commands: Provider[]} => {
  if (fs.existsSync(`.env.${env}`)) {
    dotenv.config({path: `.env.${env}`})
  }

  let providers: Provider[] = [
    {
      provide: CONFIG_TOKEN,
      useValue: {
        env: env,
        slackClientID: process.env.SLACK_CLIENT_ID,
        slackSecret: process.env.SLACK_SECRET,
        slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
        host: process.env.HOST,
        redisHost: process.env.REDIS_HOST || 'redis',
        db: {
          host: process.env.DB_HOST,
          database: process.env.DB_DATABASE,
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
        },
        logDir: process.env.LOG_DIR,
        debug: process.env.DEBUG !== "false" && !!process.env.DEBUG,
        yandexMetrikaID: process.env.YANDEX_METRIKA_ID,
        rollBarAccessToken: process.env.ROLLBAR_ACCESS_TOKEN,
        supportTelegram: process.env.SUPPORT_TELEGRAM,
      } as IAppConfig
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
      useFactory: (config: IAppConfig) => {
        return pino({
          prettyPrint: config.debug,
          level: config.debug ? 'trace' : undefined
        })
      },
      deps: [CONFIG_TOKEN]
    },
    {
      provide: MIKRO_TOKEN,
      useFactory: async (config: IAppConfig) => {
        return MikroORM.init({
          entities: Object.values(entities),
          highlighter: config.debug ? new SqlHighlighter() : undefined,
          debug: config.debug,
          type: 'postgresql',
          // user: config.db.username,
          // password: config.db.password,
          // host: config.db.host,
          // dbName: config.db.database,
          clientUrl: `postgresql://${config.db.username}:${config.db.password}@${config.db.host}:5432/${config.db.database}`,
          context: () => emStorage.getStore(),
          migrations: {
            transactional: true,
            path: migrationsDir,
            pattern: /^[\w-]+\d+\.js$/,
            disableForeignKeys: false, //?!
            allOrNothing: true,
            dropTables: false,
            emit: 'ts'
          }
        }, false);
      },
      deps: [CONFIG_TOKEN]
    },
    QueueRegistry,
    {
      provide: WebClient,
      useFactory: (config: IAppConfig, logger: Logger) => new WebClient(null,  {
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
  ]

  let commandProviders = [...commands]
  if (env !== "prod") {
    commandProviders = [...commandProviders, ...devCommands]
  }

  providers = [...providers, ...commandProviders]

  return {providers, commands: commandProviders};
}
