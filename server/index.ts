import "reflect-metadata";
import {Connection} from "typeorm";

import {LogLevel, RTMClient} from '@slack/rtm-api'
import {WebClient} from '@slack/web-api'
import StandUpBotService, {
  STAND_UP_BOT_STAND_UP_PROVIDER,
  STAND_UP_BOT_TRANSPORT
} from './bot/StandUpBotService'

import StandUp from "./model/StandUp";
import {Container} from "typedi";
import {
  SlackStandUpProvider
} from "./slack/SlackStandUpProvider";
import {CONFIG_TOKEN, TIMEZONES_TOKEN} from "./services/token";
import {Channel} from "./model/Channel";
import {getTimezoneList} from "./services/timezones";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";

import parameters from './parameters';
import localParameters from './parameters.local'
import {logError} from "./services/logError";
import {createExpress} from "./http/createExpress";
import {createTypeORMConnection} from "./services/createTypeORMConnection";

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
  const rtmClient = new RTMClient(config.botUserOAuthAccessToken, {
    logLevel: config.debug ? LogLevel.DEBUG : undefined
  })
  const webClient = new WebClient(config.botUserOAuthAccessToken, {
    logLevel: config.debug ? LogLevel.DEBUG : undefined
  })

  const connection = await createTypeORMConnection(config);

  Container.set(RTMClient, rtmClient);
  Container.set(WebClient, webClient);
  Container.set(Connection, connection);
  Container.set(CONFIG_TOKEN, config);
  Container.set(TIMEZONES_TOKEN, getTimezoneList());

  const slackProvider = Container.get(SlackStandUpProvider)

  Container.set(STAND_UP_BOT_STAND_UP_PROVIDER, slackProvider);
  Container.set(STAND_UP_BOT_TRANSPORT, slackProvider);

  await slackProvider.init();
  const standUpBot = Container.get(StandUpBotService)
  standUpBot.start()


  standUpBot.finishStandUp$.subscribe(slackProvider.sendReport.bind(slackProvider));

  setTimeout(async () => {
    standUpBot['finishStandUp'].next(await connection.getRepository(StandUp).findOne(undefined, {
      relations: [
        'channel',
        'answers',
        'answers.user',
        'answers.question',
      ]}))
  }, 5000)


  const expressApp = createExpress()

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
  throw error;
  logError(error)
});