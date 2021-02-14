import {Injector, Provider} from "injection-js";
import {
  CONFIG_TOKEN,
  EXPRESS_SLACK_API_TOKEN,
  IQueueFactory,
  LOGGER_TOKEN,
  QUEUE_FACTORY_TOKEN, QUEUE_LIST,
  REDIS_TOKEN,
  RENDER_TOKEN,
  TERMINATE,
} from "./token";
import {Connection, ConnectionOptions, getConnectionManager} from "typeorm";
import {SlackStandUpProvider} from "../slack/SlackStandUpProvider";
import StandUpBotService, {STAND_UP_BOT_STAND_UP_PROVIDER, STAND_UP_BOT_TRANSPORT} from "../bot/StandUpBotService";
import actions from "../http/controller";
import {LogLevel, WebClient} from '@slack/web-api'
import {RenderEngine} from "./RenderEngine";
import {SlackBotTransport} from "../slack/slack-bot-transport.service";
import {createEventAdapter} from "@slack/events-api";
import entities from "../model";
import * as fs from "fs";
import IOredis from 'ioredis';
import dotenv from "dotenv";
import {TestTransport} from "../../test/services/transport";
import {commands} from "../command";
import {createLogger, format, Logger, transports} from "winston";
import {createSlackApiExpress} from "../http/createExpress";
import {apiExpressMiddleware} from "../http/apiExpressMiddleware";
import {Observable} from "rxjs";
import SlackEventAdapter from "@slack/events-api/dist/adapter";
import Queue from "bull";
import {DevCommand} from "../command/DevCommand";
import * as Transport from "winston-transport";
import {TransformableInfo} from "logform";
import {WinstonSlackLoggerAdapter} from "../slack/WinstonSlackLoggerAdapter";
import {SlackEventListener} from "../slack/SlackEventListener";

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

export type RenderFn = (templateName: string, params?: object) => string;

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

const enumerateErrorFormat = format((info: TransformableInfo) => {
  if (info.error instanceof Error) {
    info.error = Object.assign({
      message: info.error.message,
      stack: info.error.stack
    }, info.error);
  }

  return info;
});

export const createProviders = (env = 'dev'): {providers: Provider[], commands: Provider[]} => {
  if (fs.existsSync(`.env.${env}`)) {
    dotenv.config({path: `.env.${env}`})
  }

  const queueProviders: Provider[] = [
    {
      provide: QUEUE_FACTORY_TOKEN,
      useFactory: (config: IAppConfig, queues) => ((queueName: string) => {
        queues[queueName] = queues[queueName] || new Queue(queueName, {redis: {host: config.redisHost, port: 6379}});

        return queues[queueName];
      }) as IQueueFactory,
      deps: [CONFIG_TOKEN, QUEUE_LIST]
    },
  ]

  queueProviders.push(
    {
      provide: QUEUE_LIST,
      useFactory: () => []
    }
  )

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
      provide: RenderEngine,
      useFactory: (config) => new RenderEngine(config.env === 'prod'),
      deps: [CONFIG_TOKEN]
    },
    {
      provide: RENDER_TOKEN,
      useFactory: (renderEngine: RenderEngine) =>  {
        return renderEngine.render.bind(renderEngine)
      },
      deps: [RenderEngine]
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
    SlackStandUpProvider,
    SlackEventListener,
    {
      provide: STAND_UP_BOT_STAND_UP_PROVIDER,
      useExisting: SlackStandUpProvider
    },
    StandUpBotService,
    ...actions,
    {
      provide: EXPRESS_SLACK_API_TOKEN,
      useFactory: createSlackApiExpress,
      deps: [CONFIG_TOKEN, QUEUE_FACTORY_TOKEN, SlackEventAdapter, LOGGER_TOKEN]
    },
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
    ...queueProviders
  ]

  providers.push(env === 'test' ? TestTransport : SlackBotTransport);
  providers.push({
    provide: STAND_UP_BOT_TRANSPORT,
    useExisting: env === 'test' ? TestTransport : SlackBotTransport
  });

  const commandProviders = [...commands]
  if (env !== "prod") {
    commandProviders.push(DevCommand)
  }

  providers = providers.concat(commandProviders)

  return {providers, commands: commandProviders};
}
