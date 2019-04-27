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
import {
  dashboardExpressMiddleware,
  useBodyParserAndSession,
  useStaticPublicFolder
} from "./http/dashboardExpressMiddleware";
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
import { createMessageAdapter } from "@slack/interactive-messages";

import parameters from './parameters';
import localParameters from './parameters.local'
import {logError} from "./services/logError";
import {InteractiveResponseTypeEnum, InteractiveResponseWithinEnum} from "./slack/model/InteractiveResponse";
import * as express from "express";
import {ApiSlackInteractive} from "./http/controller/apiSlackInteractive";

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

  standUpBot.finishStandUp$.subscribe((standUp: StandUp) => {
    /*if (!standUp instanceof StandUp) {
      console.log('Slack reporter is not supported')
      return;
    }*/

    slackProvider.rtm.sendMessage('Report!!!!!', standUp.channel.id)
  });

  Container.set(SLACK_INTERACTIONS_ADAPTER, createMessageAdapter(config.slackSigningSecret));
  const slackInteractions = Container.get(SLACK_INTERACTIONS_ADAPTER) as any;

  slackInteractions.action({},  async (response) => {
    await Container.get(ApiSlackInteractive).handleResponse(response);
  })

  /*slackInteractions.options({
      //type: InteractiveResponseTypeEnum.message_action
      within: InteractiveResponseWithinEnum.interactive_message
    }, async (response) => {
      try {
        await slackProvider.handleInteractiveAnswers(response)
      } catch (e) {
        logError(e.message)
      }
    }
  )*/

  /*slackInteractions.action({
    type: InteractiveResponseTypeEnum.dialog_submission,
    //type: InteractiveResponseTypeEnum.dialog_submission
  }, async (response, respond) => {
    try {
      await slackProvider.handleInteractiveDialogSubmission(response)
    } catch (e) {
      // TODO if (e instanceof Validation)
      //respond({errors: {}})

      //res.sendStatus(400);
      //res.send();
      logError(e.message)
      return;
    }

    //res.sendStatus(200);

    // respond({text: 'Thanks for submission'})
  })*/

  const expressApp = express()


  expressApp.use((req, res, next) => {
    console.log(`${req.originalUrl} ${req.method}`);
    if (req.method === "POST") {
      console.log(`${req.body}`);
    }

    res.on('finish', () => {
      console.info(`${res.statusCode} ${res.statusMessage}; ${res.get('Content-Length') || 0}b sent`)
    })

    next()
  })

  useStaticPublicFolder(expressApp);

  /*const router = express.Router();
  router.get('/', (req, res) => {
    console.log(req.session)

    return res.send('1');
  })*/

  expressApp.use('/api/slack/interactive', slackInteractions.expressMiddleware());
  // expressApp.use('/sss', router);
  useBodyParserAndSession(expressApp);
  expressApp.use('/', dashboardExpressMiddleware());

  //const apiSlackInteractiveAction = Container.get(ApiSlackInteractive) as ApiSlackInteractive
  //expressApp.post('/api/slack/interactive', apiSlackInteractiveAction.handle.bind(apiSlackInteractiveAction));



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

    https.createServer(options, expressApp).listen(443);
  } else {
    http.createServer(expressApp).listen(3000);
  }
}

run().then(() => {}).catch(error => {
  throw error;
  logError(error)
});