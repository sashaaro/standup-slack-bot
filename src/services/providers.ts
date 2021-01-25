import {Injector, Provider} from "injection-js";
import {
  CONFIG_TOKEN, EXPRESS_DASHBOARD_TOKEN, EXPRESS_SLACK_API_TOKEN,
  IQueueFactory, LOGGER_TOKEN,
  QUEUE_FACTORY_TOKEN,
  REDIS_TOKEN,
  RENDER_TOKEN, RETRY_MAIN_QUEUE, TERMINATE,
} from "./token";
import {Connection, ConnectionOptions, getConnectionManager} from "typeorm";
import {SlackStandUpProvider} from "../slack/SlackStandUpProvider";
import StandUpBotService, {STAND_UP_BOT_STAND_UP_PROVIDER, STAND_UP_BOT_TRANSPORT} from "../bot/StandUpBotService";
import actions from "../http/controller";
import {WebClient, LogLevel} from '@slack/web-api'
import {RenderEngine} from "./RenderEngine";
import {SlackTransport} from "../slack/SlackTransport";
import {createEventAdapter} from "@slack/events-api";
import entities from "../model";
import * as fs from "fs";
import IOredis, {Redis} from 'ioredis';
import dotenv from "dotenv";
import {TestTransport} from "../../test/services/transport";
import {commands} from "../command";
import {createLogger, transports, format} from "winston";
import {createSlackApiExpress} from "../http/createExpress";
import {dashboardExpressMiddleware} from "../http/dashboardExpressMiddleware";
import {Observable} from "rxjs";
import SlackEventAdapter from "@slack/events-api/dist/adapter";
import Queue from "bull";
import {DevCommand} from "../command/DevCommand";

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

export const QUEUE_MAIN_NAME = 'main';
export const QUEUE_RETRY_MAIN_NAME = 'retry_main';

export const createProviders = (env = 'dev'): {providers: Provider[], commands: Provider[]} => {
  // dotenv.config({path: `.env`})
  dotenv.config({path: `.env.${env}`})

  const queues = {}
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
        debug: process.env.DEBUG !== "false" && !!process.env.DEBUG,
        yandexMetrikaID: process.env.YANDEX_METRIKA_ID,
        rollBarAccessToken: process.env.ROLLBAR_ACCESS_TOKEN,
        db: {
          host: process.env.DB_HOST,
          database: process.env.DB_DATABASE,
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
        },
        redisHost: process.env.REDIS_HOST || 'redis',
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
      useFactory: (config: IAppConfig) => (new WebClient(config.botUserOAuthAccessToken, {
        logLevel: config.debug ? LogLevel.DEBUG : undefined,
      })),
      deps: [CONFIG_TOKEN]
    },
    {
      provide: SlackEventAdapter,
      useFactory: (config: IAppConfig) => createEventAdapter(config.slackSigningSecret),
      deps: [CONFIG_TOKEN]
    },
    {
      provide: QUEUE_FACTORY_TOKEN,
      useFactory: (config: IAppConfig) => ((queueName: string) => {
        queues[queueName] = queues[queueName] || new Queue(queueName, {redis: {host: config.redisHost, port: 6379}});

        return queues[queueName];
      }) as IQueueFactory,
      deps: [CONFIG_TOKEN]
    },
    {
      provide: RETRY_MAIN_QUEUE,
      useFactory: (factory: IQueueFactory) => factory(QUEUE_RETRY_MAIN_NAME),
      deps: [QUEUE_FACTORY_TOKEN]
    },
    SlackStandUpProvider,
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
      provide: EXPRESS_DASHBOARD_TOKEN,
      useFactory: dashboardExpressMiddleware,
      deps: [Injector]
    },
    {
      provide: LOGGER_TOKEN,
      useFactory: (config: IAppConfig) => {
        const logger = createLogger({})

        let logFormat = format.printf(info => {
          info = {...info};
          let formatted = `${info.timestamp} ${info.level}: ${info.message}`;
          delete info.timestamp
          delete info.level
          delete info.message
          if (info.error) {
            const isError = info.error instanceof Error
            if (Object.getOwnPropertyNames(info.error).length > 0) {
              formatted += `\n${JSON.stringify(info.error)}`;
            }
            if (isError) {
              formatted += `\n${info.error.stack}`
            }
            delete info.error
          }

          if (Object.getOwnPropertyNames(info).length > 0) {
            formatted += `\n${JSON.stringify(info)}`;
          }

          return formatted;
        });

        logFormat = format.combine(format.timestamp(), logFormat);

        if (env === 'prod') {
          logger.add(new transports.File({
            filename: `var/${process.env.APP_CONTEXT || 'logs'}.log`,
            format: logFormat,
          }))
        } else {
          // const prettyPrintFormat = format.prettyPrint({colorize: true});
          const errorStackFormat = format.errors({stack: true});
          const jsonFormat = format.json();

          logger.add(new transports.Console({
            /*format: format.printf((info) => {
              if (info.error instanceof Error) {
                return errorStackFormat.transform({message: info.error})
              } else {
                return jsonFormat.transform(info)
              };
            })*/
            format: logFormat,
          }))
        }

        if (config.debug) {
          logger.level = 'debug'
        }

        return logger;
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
    }
  ]

  providers.push(env === 'test' ? TestTransport : SlackTransport);
  providers.push({
    provide: STAND_UP_BOT_TRANSPORT,
    useExisting: env === 'test' ? TestTransport : SlackTransport
  });

  const commandProviders = [...commands]
  if (env !== "prod") {
    commandProviders.push(DevCommand)
  }

  providers = providers.concat(commandProviders)

  return {providers, commands: commandProviders};
}
