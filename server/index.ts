import "reflect-metadata";
import {Connection, createConnection} from "typeorm";
import Question from "./model/Question";
import Team from "./model/Team";
import User from "./model/User";
import {LogLevel, RTMClient} from '@slack/rtm-api'
import {WebClient} from '@slack/web-api'
import StandUpBotService, {
  SLACK_INTERACTIONS_ADAPTER,
  STAND_UP_BOT_STAND_UP_PROVIDER,
  STAND_UP_BOT_TRANSPORT
} from './StandUpBotService'
import {createExpressApp} from "./http/createExpressApp";
import AnswerRequest from "./model/AnswerRequest";
import StandUp from "./model/StandUp";
import {Container} from "typedi";
import {
  CALLBACK_PREFIX_SEND_STANDUP_ANSWERS,
  CALLBACK_PREFIX_STANDUP_INVITE,
  SlackStandUpProvider
} from "./slack/SlackStandUpProvider";
import {CONFIG_TOKEN, TIMEZONES_TOKEN} from "./services/token";
import {Channel} from "./model/Channel";
import {getTimezoneList} from "./services/timezones";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import {ApiSlackInteractive} from "./http/controller/apiSlackInteractive";
import { createMessageAdapter } from "@slack/interactive-messages";

import parameters from './parameters';
import localParameters from './parameters.local'
import {logError} from "./services/logError";
import {InteractiveResponseTypeEnum} from "./slack/model/InteractiveResponse";

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

  const questions = [
    'What I worked on yesterday?',
    'What I working on today?',
    'Is anything standing in your way?'
  ]

  if (!await connection.getRepository(Question).count()) {
    let index = 0
    for (const q of questions) {
      const qu = new Question()
      qu.text = q
      qu.index = index
      qu.disabled = false
      await connection.getRepository(Question).insert(qu)
      ++index;
    }
  }

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

  standUpBot.finishStandUp$.subscribe((standUp: StandUp) => {

    console.log(standUp)

    /*if (!standUp instanceof StandUp) {
      console.log('Slack reporter is not supported')
      return;
    }*/

    slackProvider.rtm.sendMessage('Report!!!!!', standUp.channel.id)
  });

  const app = createExpressApp()

  Container.set(SLACK_INTERACTIONS_ADAPTER, createMessageAdapter(config.slackSecret));
  const slackInteractions = Container.get(SLACK_INTERACTIONS_ADAPTER) as any;

  slackInteractions.action({type: InteractiveResponseTypeEnum.interactive_message, callbackId: CALLBACK_PREFIX_STANDUP_INVITE},
    async (response) => {
      await slackProvider.handleInteractiveAnswers(response)
    }
  )

  slackInteractions.action({type: InteractiveResponseTypeEnum.dialog_submission, callbackId: CALLBACK_PREFIX_SEND_STANDUP_ANSWERS}, async (response) => {
    await this.handleInteractiveDialogSubmission(response)
  })

  app.use('/api/slack/interactive', slackInteractions.expressMiddleware());

  //const apiSlackInteractiveAction = Container.get(ApiSlackInteractive) as ApiSlackInteractive
  //app.post('/api/slack/interactive', apiSlackInteractiveAction.handle.bind(apiSlackInteractiveAction));



  const certFolder = './cert';
  const privateKey = certFolder + '/privkey.pem';
  const certificate = certFolder + '/cert.pem';
  const ca = certFolder + '/chain.pem';

  const hasSSL = fs.existsSync(privateKey) && fs.existsSync(certificate)
  console.log(`SSL ${hasSSL ? 'enabled': 'disabled'}`)
  if (hasSSL) {
    const options = {
      key: fs.readFileSync(privateKey),
      cert: fs.readFileSync(certificate),
      ca: fs.readFileSync(ca),
    }

    https.createServer(options, app).listen(443);
  } else {
    http.createServer(app).listen(3000);
  }
}

run().then(() => {}).catch(error => {
  throw error;
  logError(error)
});