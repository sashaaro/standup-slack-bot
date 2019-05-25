import "reflect-metadata";
import {ReflectiveInjector} from 'injection-js';
import StandUpBotService from './bot/StandUpBotService'
import StandUp from "./model/StandUp";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import {logError} from "./services/logError";
import {createExpress} from "./http/createExpress";
import {createProvider, IAppConfig} from "./services/providers";
import * as Rollbar from "rollbar";
import {CONFIG_TOKEN} from "./services/token";
import 'express-async-errors';
import {SlackTransport} from "./slack/SlackTransport";

const main = async () => {
  const envParam = process.argv.filter((param) => param.startsWith(`--env=`)).pop();
  let env = 'dev';
  if (envParam) {
    env = envParam.split('=')[1]
  }

  console.log(`Environment: ${env}`)

  const injector = ReflectiveInjector.resolveAndCreate(await createProvider('app', env));
  const config: IAppConfig = injector.get(CONFIG_TOKEN)

  if (config.rollBarAccessToken) {
    const rollbar = new Rollbar({
      accessToken: config.rollBarAccessToken,
      captureUncaught: true,
      captureUnhandledRejections: true
    });
  }

  const slackTransport: SlackTransport = injector.get(SlackTransport);
  await slackTransport.init();
  const standUpBot: StandUpBotService = injector.get(StandUpBotService)
  standUpBot.start()

  standUpBot.finishStandUp$.subscribe((standUp: StandUp) => {
    slackTransport.sendReport(standUp)
  });


  const expressApp = createExpress(injector)

  const certFolder = './cert';
  const privateKey = certFolder + '/privkey.pem';
  const certificate = certFolder + '/cert.pem';
  const ca = certFolder + '/chain.pem';
  const argv = process.argv.slice(2)

  const hasSSL = argv.includes('--ssl') && fs.existsSync(privateKey) && fs.existsSync(certificate)
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

main()
  .catch(error => {
    logError(error)
    throw error;
  });