import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {
  EXPRESS_DASHBOARD_TOKEN,
  EXPRESS_SLACK_API_TOKEN, IQueueFactory,
  IWorkerFactory, LOGGER_TOKEN, QUEUE_FACTORY_TOKEN, REDIS_TOKEN, TERMINATE,
  WORKER_FACTORY_TOKEN
} from "../services/token";
import {Connection} from "typeorm";
import express from 'express'
import 'express-async-errors';
import http from "http";
import {IAppConfig, QUEUE_MAIN_NAME} from "../services/providers";
import {useStaticPublicFolder} from "../http/dashboardExpressMiddleware";
import {SlackTransport} from "../slack/SlackTransport";
import {Redis} from "ioredis";
import {Logger} from "winston";
import {Observable} from "rxjs";
import {redisReady} from "./QueueConsumeCommand";
import * as fs from "fs";

export class ServerCommand implements yargs.CommandModule {
  command = 'server:run';
  describe = 'Run server';

  constructor(
    @Inject(WORKER_FACTORY_TOKEN) private workerFactory: IWorkerFactory,
    private injector: Injector,
    private connection: Connection,
    private slackTransport: SlackTransport,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(QUEUE_FACTORY_TOKEN) private queueFactory: IQueueFactory,
    @Inject(LOGGER_TOKEN) protected logger: Logger,
    @Inject(TERMINATE) protected terminate$: Observable<void>
  ) {}

  builder(args: yargs.Argv) {
    return args
      .option("t", {
        alias: "type",
        describe: "Type application",
        demand: false
      })
      .option("l", {
        alias: "listen",
        describe: "Listen",
        demand: false
      })
      ;
  }

  async handler(args: yargs.Arguments<{}>) {
    const type = args.type as string

    if (type && !['ui','slack-api'].includes(type)) {
      throw new Error('No application type ' + type)
    }

    try {
      await this.startServer(type, args.listen as string)
    } catch (e) {
      this.logger.error("Start server error", {error: e})
    }
  }

  private async startServer(type?: string, listen?: string|number)
  {
    await this.connection.connect();
    try {
      await this.redis.connect();
    } catch (e) {
      if (!e.message.startsWith('Redis is already connecting')) {
        throw e;
      }
    }
    await redisReady(this.redis);

    const expressApp = express()

    if (!type || type === 'slack-api') {
      this.slackTransport.initSlackEvents();
      expressApp.use('/api/slack', this.injector.get(EXPRESS_SLACK_API_TOKEN));
    }
    if (!type || type === 'ui') {
      useStaticPublicFolder(expressApp);
      expressApp.use('/', this.injector.get(EXPRESS_DASHBOARD_TOKEN));
    }

    const options = {}
    listen = listen || 3000

    this.logger.debug(`Start server. Listen ${listen}`);
    const server = http.createServer(options, expressApp)

    if (fs.existsSync(listen as any)) {
      fs.unlinkSync(listen as any);
    }

    server.listen(listen)
      .on('error', (error) => {
        this.logger.error('Server error', {error});
        this.close();
      })
      .on('close', () => {
        this.logger.debug('Server closed');
        this.close();
      });

    this.terminate$.subscribe(() => {
      server.close((error) => {
        if (error) {
          this.logger.error('Sever closing', {error});
        }
      });
    })
  }

  private close() {
    this.connection.close()
    try {
      this.queueFactory(QUEUE_MAIN_NAME).close()
      this.redis.disconnect()
    } catch (e) {
      if (!e.message.startsWith('Connection is closed')) {
        this.logger.error('Close redis error', {error: e})
      }
    }
  }
}
