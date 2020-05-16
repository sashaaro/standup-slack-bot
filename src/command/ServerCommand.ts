import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {
  CONFIG_TOKEN,
  EXPRESS_DASHBOARD_TOKEN,
  EXPRESS_SLACK_API_TOKEN,
  IWorkerFactory, LOGGER_TOKEN, REDIS_TOKEN,
  WORKER_FACTORY_TOKEN
} from "../services/token";
import {Connection} from "typeorm";
import express from 'express'
import 'express-async-errors';
import http from "http";
import Rollbar from "rollbar";
import {IAppConfig} from "../services/providers";
import {useStaticPublicFolder} from "../http/dashboardExpressMiddleware";
import {SlackTransport} from "../slack/SlackTransport";
import {Redis} from "ioredis";
import {Logger} from "winston";

export class ServerCommand implements yargs.CommandModule {
  command = 'server:run';
  describe = 'Run server';

  constructor(
    @Inject(WORKER_FACTORY_TOKEN) private workerFactory: IWorkerFactory,
    private injector: Injector,
    private connection: Connection,
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    private slackTransport: SlackTransport,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(LOGGER_TOKEN) protected logger: Logger
  ) {}

  async handler(args: yargs.Arguments<{}>) {
    if (this.config.rollBarAccessToken) {
      const rollbar = new Rollbar({
        accessToken: this.config.rollBarAccessToken,
        captureUncaught: true,
        captureUnhandledRejections: true
      });
    }

    try {
      await this.startServer()
    } catch (e) {
      console.log(e)
      this.logger.error("Start server error", {error: e})
    }
  }

  private async startServer()
  {
    await this.connection.connect();
    if (this.redis.status !== 'ready') {
      await this.redis.connect();
    }

    const expressApp = express()

    this.slackTransport.initSlackEvents();
    expressApp.use('/api/slack', this.injector.get(EXPRESS_SLACK_API_TOKEN));
    useStaticPublicFolder(expressApp);
    expressApp.use('/', this.injector.get(EXPRESS_DASHBOARD_TOKEN));

    const options = {}
    const port = 3000

    this.logger.debug('Start server');
    const server = http.createServer(options, expressApp)
    server.listen(port)
      .on('error', (error) => {
        this.logger.error('Server error', {error});
        this.connection.close()
        this.redis.disconnect()
      })
      .on('close', () => {
        this.logger.debug('Server closed');
        this.connection.close()
        this.redis.disconnect()
      });
  }
}
