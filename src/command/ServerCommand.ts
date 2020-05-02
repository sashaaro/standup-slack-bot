import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {
  CONFIG_TOKEN,
  EXPRESS_DASHBOARD_TOKEN,
  EXPRESS_SLACK_API_TOKEN,
  IWorkerFactory,
  WORKER_FACTORY_TOKEN
} from "../services/token";
import {Connection} from "typeorm";
import fs from "fs";
import https from "https";
import express from 'express'
import 'express-async-errors';
import http from "http";
import Rollbar from "rollbar";
import {IAppConfig} from "../services/providers";
import {useStaticPublicFolder} from "../http/dashboardExpressMiddleware";
import {SlackTransport} from "../slack/SlackTransport";

export class ServerCommand implements yargs.CommandModule {
  command = 'server:run';
  describe = 'Run server';

  constructor(
    @Inject(WORKER_FACTORY_TOKEN) private workerFactory: IWorkerFactory,
    private injector: Injector,
    private connection: Connection,
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private slackTransport: SlackTransport
  ) {}

  async handler(args: yargs.Arguments<{}>) {
    if (this.config.rollBarAccessToken) {
      const rollbar = new Rollbar({
        accessToken: this.config.rollBarAccessToken,
        captureUncaught: true,
        captureUnhandledRejections: true
      });
    }

    await this.connection.connect();

    const expressApp = express()

    this.slackTransport.initSlackEvents();
    expressApp.use('/api/slack', this.injector.get(EXPRESS_SLACK_API_TOKEN));

    useStaticPublicFolder(expressApp);
    expressApp.use('/', this.injector.get(EXPRESS_DASHBOARD_TOKEN));

    /*const certFolder = './cert';
    const privateKey = certFolder + '/privkey.pem';
    const certificate = certFolder + '/cert.pem';
    const ca = certFolder + '/chain.pem';
    const argv = process.argv.slice(2)

    const ssl = argv.includes('--ssl') && fs.existsSync(privateKey) && fs.existsSync(certificate)
    console.log(`SSL ${ssl ? 'enabled': 'disabled'}`)*/

    const serverCreator = http; //ssl ? https : http
    const options = {} /*ssl ? {
      key: fs.readFileSync(privateKey),
      cert: fs.readFileSync(certificate),
      ca: fs.readFileSync(ca),
    } : {}*/
    const port = 3000///ssl ? 443 : 3000
    serverCreator.createServer(options, expressApp).listen(port);
  }
}
