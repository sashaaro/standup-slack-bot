import "reflect-metadata";
import {ReflectiveInjector} from 'injection-js';
import StandUpBotService from './bot/StandUpBotService'
import StandUp from "./model/StandUp";
import {SlackStandUpProvider} from "./slack/SlackStandUpProvider";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import {logError} from "./services/logError";
import {createExpress} from "./http/createExpress";
import {createProvider, IAppConfig} from "./services/providers";
import * as Rollbar from "rollbar";
import {CONFIG_TOKEN} from "./services/token";

const run = async () => {
  const injector = ReflectiveInjector.resolveAndCreate(await createProvider());

  const config: IAppConfig = injector.get(CONFIG_TOKEN)


  if (config.rollBarAccessToken) {
    const rollbar = new Rollbar({
      accessToken: config.rollBarAccessToken,
      captureUncaught: true,
      captureUnhandledRejections: true
    });
  }

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

run()
  .catch(error => {
    logError(error)
    throw error;
  });