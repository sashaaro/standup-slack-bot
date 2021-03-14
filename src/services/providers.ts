import {Provider} from "injection-js";
import {
  CONFIG_TOKEN,
  LOGGER_TOKEN,
  REDIS_TOKEN,
  TERMINATE,
} from "./token";
import {Connection, ConnectionOptions, getConnectionManager} from "typeorm";
import StandupNotifier from "../slack/standup-notifier";
import actions from "../http/controller";
import {LogLevel, WebClient} from '@slack/web-api'
import {SlackBotTransport} from "../slack/slack-bot-transport.service";
import {createEventAdapter} from "@slack/events-api";
import entities from "../model";
import * as fs from "fs";
import IOredis from 'ioredis';
import dotenv from "dotenv";
import {commands, devCommands} from "../command";
import {createLogger, format, Logger, transports} from "winston";
import {Observable} from "rxjs";
import SlackEventAdapter from "@slack/events-api/dist/adapter";
import * as Transport from "winston-transport";
import {TransformableInfo} from "logform";
import {WinstonSlackLoggerAdapter} from "../slack/WinstonSlackLoggerAdapter";
import {SlackEventListener} from "../slack/slack-event-listener";
import {SyncSlackService} from "../slack/sync-slack.service";
import {QueueRegistry} from "./queue.registry";
import {enumerateErrorFormat} from "./utils";

export interface IAppConfig {
  env: string,
  slackClientID: string,
  slackSecret: string,
  slackSigningSecret: string,
  botUserOAuthAccessToken: string,
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


const migrationDir = __dirname + '/../migration';
const defaultConnectionOptions: ConnectionOptions = {
  type: "postgres",
  host: "postgres",
  port: 5432,
  migrationsTransactionMode: "all",
  migrationsRun: false,
  migrations: fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.js'))
    .map(f => migrationDir + '/' + f),
  database: "postgres",
  username: "postgres",
  password: "postgres",
  synchronize: false
}


export const initFixtures = async (connection: Connection) => {
  await connection.query(fs.readFileSync('resources/timezone.sql').toString());
}

export const QUEUE_NAME_SLACK_EVENTS = 'slack_events';
export const QUEUE_NAME_SLACK_INTERACTIVE = 'slack_interactive';


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
        botUserOAuthAccessToken: process.env.BOT_USER_OAUTH_ACCESS_TOKEN,
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
      provide: Connection,
      useFactory: (config: IAppConfig) => getConnectionManager().create({
        ...defaultConnectionOptions,
        ...config.db,
        entities,
        logger: config.env === 'prod' ? 'file' : 'advanced-console',
        logging: config.env === 'prod' ? false : ["error", "warn"].concat(config.debug ? ["query"] : []) as any
      }),
      deps: [CONFIG_TOKEN]
    },
    QueueRegistry,
    {
      provide: WebClient,
      useFactory: (config: IAppConfig, logger: Logger) => new WebClient(config.botUserOAuthAccessToken, {
        logger: new WinstonSlackLoggerAdapter(logger),
        logLevel: LogLevel.DEBUG
      }),
      deps: [CONFIG_TOKEN, LOGGER_TOKEN]
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
      provide: LOGGER_TOKEN,
      useFactory: (config: IAppConfig) => {
        let transport: Transport;

        const pretty = env === 'dev';
        const logFormat = format.combine(
            format.timestamp(),
            enumerateErrorFormat(),
            format.json({space: pretty ? 2 : 0})
        );

        if (env === 'prod') {
          const logDir = config.logDir || 'var';
          transport = new transports.File({
            filename: `${logDir}/standup-slack-bot.log`, // TODO depends from channel metadata?!
            format: logFormat,
          })
        } else {
          transport = new transports.Console({
            format: logFormat
          })
        }

        return createLogger({
          level: config.debug ? 'debug' : 'info',
          transports: transport
        });
      },
      deps: [CONFIG_TOKEN]
    },
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
