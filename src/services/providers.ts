import {Provider} from "injection-js";
import {CONFIG_TOKEN, RENDER_TOKEN, TIMEZONES_TOKEN} from "./token";
import {Connection, ConnectionOptions, getConnectionManager} from "typeorm";
import Timezone from "../model/Timezone";
import {SlackStandUpProvider} from "../slack/SlackStandUpProvider";
import StandUpBotService, {STAND_UP_BOT_STAND_UP_PROVIDER, STAND_UP_BOT_TRANSPORT} from "../bot/StandUpBotService";
import actions from "../http/controller";
import {WebClient, LogLevel} from '@slack/web-api'
import SyncLocker from "./SyncServcie";
import {RenderEngine} from "./RenderEngine";
import {SLACK_EVENTS, SlackTransport} from "../slack/SlackTransport";
import {createEventAdapter} from "@slack/events-api";
import entities from "../model";
import * as fs from "fs";
import dotenv from "dotenv";

export interface IAppConfig {
  env: string,
  slackClientID: string,
  slackSecret: string,
  slackSigningSecret: string,
  botUserOAuthAccessToken: string,
  host: string,
  debug: false,
  rollBarAccessToken?: string,
  db: {
    database: string,
    username: string,
    password: string,
  },
}

export type RenderFn = (templateName: string, params?: object) => string;

const migrationDir = __dirname + '/../migration';
const defaultConnectionOptions: ConnectionOptions = {
  type: "postgres",
  host: "postgres",
  port: 5432,
  migrationsTransactionMode: "all",
  migrations: fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.js'))
    .map(f => migrationDir + '/' + f),
  username: "postgres",
  password: "postgres",
  database: "postgres",
  synchronize: false
}
export const initFixtures = async (connection: Connection) => {
  await connection.query(fs.readFileSync('fixtures/timezone.sql').toString())
}

export const createProviders = (env = 'dev'): Provider[] => {
  // dotenv.config({path: `.env`})
  dotenv.config({path: `.env.${env}`})

  const providers: Provider[] = [
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
        rollBarAccessToken: process.env.ROLLBAR_ACCESS_TOKEN,
        db: {
          database: process.env.DB_HOST,
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
        }
      } as IAppConfig
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
      provide: TIMEZONES_TOKEN,
      useFactory: (connection: Connection) => {
        return connection.getRepository(Timezone).find()
      },
      deps: [Connection],
    },
    {
      provide: Connection,
      useFactory: (config: IAppConfig) => getConnectionManager().create({
        ...defaultConnectionOptions,
        ...config.db,
        entities,
        logging: config.debug,
      }),
      deps: [CONFIG_TOKEN]
    },
    {
      provide: WebClient,
      useFactory: (config: IAppConfig) => {
        return new WebClient(config.botUserOAuthAccessToken, {logLevel: config.debug ? LogLevel.DEBUG : undefined})
      },
      deps: [CONFIG_TOKEN]
    },
    {
      provide: SLACK_EVENTS,
      useFactory: (config: IAppConfig) => createEventAdapter(config.slackSigningSecret),
      deps: [CONFIG_TOKEN]
    },
    SlackStandUpProvider,
    {
      provide: STAND_UP_BOT_STAND_UP_PROVIDER,
      useExisting: SlackStandUpProvider
    },
    SlackTransport,
    {
      provide: STAND_UP_BOT_TRANSPORT,
      useExisting: SlackTransport
    },
    StandUpBotService,
    SyncLocker,
    ...actions
  ]

  return providers;
}
