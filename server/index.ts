import "reflect-metadata";
import {Connection, createConnection} from "typeorm";
import Question from "./model/Question";
import Team from "./model/Team";
import User from "./model/User";
import {LogLevel, RTMClient} from '@slack/rtm-api'
import {WebClient} from '@slack/web-api'
import StandUpBotService, {
  STAND_UP_BOT_STAND_UP_PROVIDER,
  STAND_UP_BOT_TRANSPORT
} from './bot/StandUpBotService'

import AnswerRequest from "./model/AnswerRequest";
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
   let connection = await createConnection({
    type: "postgres",
    host: "postgres",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "postgres"
  })

  const isExist = ((await connection.query("SELECT datname FROM pg_database WHERE datname = 'standup' LIMIT 1")) as any[]).length === 1;
  if (!isExist) {
    await connection.query("CREATE DATABASE standup");
  }
  await connection.close()

  connection = await createConnection({
    type: "postgres",
    //host: "localhost",
    host: "postgres",
    //host: "172.17.0.1",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "standup",
    entities: [
      Question,
      Team,
      User,
      AnswerRequest,
      StandUp,
      Channel
    ],
    synchronize: true,
    logging: config.debug
  })

  const rtmClient = new RTMClient(config.botUserOAuthAccessToken, {
    logLevel: config.debug ? LogLevel.DEBUG : undefined
  })
  const webClient = new WebClient(config.botUserOAuthAccessToken, {
    logLevel: config.debug ? LogLevel.DEBUG : undefined
  })

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