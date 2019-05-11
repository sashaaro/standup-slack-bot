import {Provider} from "injection-js";
import {CONFIG_TOKEN, TIMEZONES_TOKEN} from "./token";
import {Connection} from "typeorm";
import Timezone from "../model/Timezone";
import {SlackStandUpProvider} from "../slack/SlackStandUpProvider";
import StandUpBotService, {STAND_UP_BOT_STAND_UP_PROVIDER, STAND_UP_BOT_TRANSPORT} from "../bot/StandUpBotService";
import {AuthAction} from "../http/controller/auth";
import AuthorizationContext from "./AuthorizationContext";
import actions from "../http/controller";
import {createTypeORMConnection} from "./createTypeORMConnection";
import {LogLevel, WebClient} from '@slack/web-api'
import parameters from "../parameters";
import localParameters from "../parameters.local";
import {LogLevel, RTMClient} from '@slack/rtm-api'

export interface IAppConfig {
  slackClientID: string,
  slackSecret: string,
  slackSigningSecret: string,
  slackVerificationToken: string,
  botUserOAuthAccessToken: string,
  host: string,
  debug: false
}

const config = Object.assign(parameters, localParameters) as IAppConfig;

export const createProvider = async (): Promise<Provider[]> => {
  const connection = await createTypeORMConnection(config);
  const rtmClient = new RTMClient(config.botUserOAuthAccessToken, {logLevel: config.debug ? LogLevel.DEBUG : undefined});
  const webClient = new WebClient(config.botUserOAuthAccessToken, {logLevel: config.debug ? LogLevel.DEBUG : undefined});

  return [
    {
      provide: CONFIG_TOKEN,
      useValue: config
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
    {
      provide: STAND_UP_BOT_TRANSPORT,
      useExisting: SlackStandUpProvider
    },
    StandUpBotService,
    AuthAction, // TODO remove
    AuthorizationContext
  ].concat(actions as any)
}