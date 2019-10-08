import {Provider} from "injection-js";
import {CONFIG_TOKEN, RENDER_TOKEN, TIMEZONES_TOKEN} from "./token";
import {Connection} from "typeorm";
import Timezone from "../model/Timezone";
import {SlackStandUpProvider} from "../slack/SlackStandUpProvider";
import StandUpBotService, {STAND_UP_BOT_STAND_UP_PROVIDER, STAND_UP_BOT_TRANSPORT} from "../bot/StandUpBotService";
import {AuthAction} from "../http/controller/auth";
import actions from "../http/controller";
import {createTypeORMConnection} from "./createTypeORMConnection";
import {WebClient} from '@slack/web-api'
import parameters from "../parameters";
import fs from "fs";
//import envParameters from "../parameters.local";
import {LogLevel, RTMClient} from '@slack/rtm-api'
import SyncService from "./SyncServcie";
import {RenderEngine} from "./RenderEngine";
import {SlackTransport} from "../slack/SlackTransport";

export interface IAppConfig {
  env: string,
  slackClientID: string,
  slackSecret: string,
  slackSigningSecret: string,
  slackVerificationToken: string,
  botUserOAuthAccessToken: string,
  host: string,
  debug: false,
  rollBarAccessToken?: string,
  db: {
    database: string,
    username: string,
    password: string,
  }
}


// TODO move


export const createProvider = async (context?: string, env = 'dev'): Promise<Provider[]> => {
  let config = parameters

  if (fs.existsSync(`../parameters.${env}.js`)) {
    const envParameters = require(`../parameters.${env}.js`).default
    config = Object.assign(config, envParameters) as IAppConfig;
  }

  config.env = env

  let providers: Provider[] = [
    {
      provide: CONFIG_TOKEN,
      useValue: config
    }
  ]

  if (context !== 'cli') {
    const connection = await createTypeORMConnection(config);
    const rtmClient = new RTMClient(config.botUserOAuthAccessToken, {logLevel: config.debug ? LogLevel.DEBUG : undefined});
    const webClient = new WebClient(config.botUserOAuthAccessToken, {logLevel: config.debug ? LogLevel.DEBUG : undefined});

    providers = providers.concat([
      {
        provide: RENDER_TOKEN,
        useFactory: (config: IAppConfig) =>  {
          const renderEngine = new RenderEngine(config.env === 'prod');
          return renderEngine.render.bind(renderEngine)
        },
        deps: [CONFIG_TOKEN]
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
        useValue: connection
      },
      {
        provide: RTMClient,
        useValue: rtmClient
      },
      {
        provide: WebClient,
        useValue: webClient
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
      AuthAction, // TODO remove
      SyncService
    ] as any)

    providers = providers.concat(actions as any)
  }


  return providers;
}