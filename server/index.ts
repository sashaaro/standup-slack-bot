import "reflect-metadata";
import {Connection} from "typeorm";
import {Provider, ReflectiveInjector} from 'injection-js';

import {LogLevel, RTMClient} from '@slack/rtm-api'
import {WebClient} from '@slack/web-api'
import StandUpBotService, {
  STAND_UP_BOT_STAND_UP_PROVIDER,
  STAND_UP_BOT_TRANSPORT
} from './bot/StandUpBotService'

import StandUp from "./model/StandUp";
import {
  SlackStandUpProvider
} from "./slack/SlackStandUpProvider";
import {CONFIG_TOKEN, TIMEZONES_TOKEN} from "./services/token";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";

import parameters from './parameters';
import localParameters from './parameters.local'
import {logError} from "./services/logError";
import {createExpress} from "./http/createExpress";
import {createTypeORMConnection} from "./services/createTypeORMConnection";
import actions from "./http/controller";
import {AuthAction} from "./http/controller/auth";
import AuthorizationContext from "./services/AuthorizationContext";
import Team from "./model/Team";
import {Channel} from "./model/Channel";
import Timezone from "./model/Timezone";

const config = Object.assign(parameters, localParameters) as IAppConfig;


export interface IAppConfig {
  slackClientID: string,
  slackSecret: string,
  slackSigningSecret: string,
  slackVerificationToken: string,
  botUserOAuthAccessToken: string,
  host: string,
  debug: false
}

const run = async () => {
  const connection = await createTypeORMConnection(config);
  const rtmClient = new RTMClient(config.botUserOAuthAccessToken, {logLevel: config.debug ? LogLevel.DEBUG : undefined});
  const webClient = new WebClient(config.botUserOAuthAccessToken, {logLevel: config.debug ? LogLevel.DEBUG : undefined});

  const providers: Provider[] = [
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

  const injector = ReflectiveInjector.resolveAndCreate(providers);

  const slackProvider: SlackStandUpProvider = injector.get(SlackStandUpProvider);
  await slackProvider.init();
  const standUpBot: StandUpBotService = injector.get(StandUpBotService)
  standUpBot.start()


  standUpBot.finishStandUp$.subscribe((standUp: StandUp) => {
    slackProvider.sendReport(standUp)
  });

  const expressApp = createExpress(injector)

  const certFolder = './cert';
  const privateKey = certFolder + '/privkey.pem';
  const certificate = certFolder + '/cert.pem';
  const ca = certFolder + '/chain.pem';

  const hasSSL = fs.existsSync(privateKey) && fs.existsSync(certificate)
  console.log(`SSL ${hasSSL ? 'enabled': 'disabled'}`)


  const serverCreator = hasSSL ? https : http
  const options = hasSSL ? {
    key: fs.readFileSync(privateKey),
    cert: fs.readFileSync(certificate),
    ca: fs.readFileSync(ca),
  } : {}
  const port = hasSSL ? 443 : 3000
  serverCreator.createServer(options, expressApp).listen(port);
}

run().then(() => {}).catch(error => {
  logError(error)
  throw error;
});