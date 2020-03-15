import {Provider} from "injection-js";
import {CONFIG_TOKEN, RENDER_TOKEN, TIMEZONES_TOKEN} from "./token";
import {Connection} from "typeorm";
import Timezone from "../model/Timezone";
import {SlackStandUpProvider} from "../slack/SlackStandUpProvider";
import StandUpBotService, {STAND_UP_BOT_STAND_UP_PROVIDER, STAND_UP_BOT_TRANSPORT} from "../bot/StandUpBotService";
import actions from "../http/controller";
import {createTypeORMConnection} from "./createTypeORMConnection";
import {WebClient, LogLevel} from '@slack/web-api'
import parameters from "../parameters";
//import envParameters from "../parameters.local";
import SyncLocker from "./SyncServcie";
import {RenderEngine} from "./RenderEngine";
import {SlackTransport} from "../slack/SlackTransport";
import {createEventAdapter} from "@slack/events-api";
import {SlackEventAdapter} from "@slack/events-api/dist/adapter";

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

export const createProvider = async (context?: string, env = 'dev'): Promise<Provider[]> => {
  //if (fs.existsSync(`../parameters.${env}.js`)) {
  const envParameters = require(`../parameters.${env}.js`).default
  const config = Object.assign(parameters, envParameters) as IAppConfig;
  //}

  config.env = env;

  let providers: Provider[] = [
    {
      provide: CONFIG_TOKEN,
      useValue: config
    }
  ]

  const webClient = new WebClient(config.botUserOAuthAccessToken, {logLevel: config.debug ? LogLevel.DEBUG : undefined});

  if (context !== 'cli') {
    const connection = await createTypeORMConnection(config);
    const slackEvents = createEventAdapter(config.slackSigningSecret) as SlackEventAdapter;

    providers = providers.concat([
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
        useValue: connection
      },
      {
        provide: WebClient,
        useValue: webClient,
      },
      {
        provide: SlackEventAdapter,
        useValue: slackEvents
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
      SyncLocker
    ] as any)

    providers = providers.concat(actions as any)
  }


  return providers;
}
