import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {
  EXPRESS_SLACK_API_TOKEN, IQueueFactory,
  LOGGER_TOKEN, QUEUE_FACTORY_TOKEN, QUEUE_LIST, REDIS_TOKEN, TERMINATE,
} from "../services/token";
import {Connection} from "typeorm";
import express from 'express'
import 'express-async-errors';
import http from "http";
import {apiExpressMiddleware, useStaticPublicFolder} from "../http/apiExpressMiddleware";
import {Redis} from "ioredis";
import {Logger} from "winston";
import {Observable} from "rxjs";
import {redisReady} from "./QueueConsumeCommand";
import * as fs from "fs";
import {bind} from "../services/utils";
import {SlackEventListener} from "../slack/SlackEventListener";

export class ServerCommand implements yargs.CommandModule {
  command = 'server:run';
  describe = 'Run server';

  constructor(
    private injector: Injector,
    private connection: Connection,
    private slackEventListener: SlackEventListener,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(QUEUE_FACTORY_TOKEN) private queueFactory: IQueueFactory,
    @Inject(LOGGER_TOKEN) protected logger: Logger,
    @Inject(TERMINATE) protected terminate$: Observable<void>
  ) {}

  builder(args: yargs.Argv) {
    return args
      .option("p", {
        alias: "port",
        describe: "Listen port",
        demand: false
      })
      ;
  }

  @bind
  async handler(args: yargs.Arguments<{}>) {
    try {
      await this.startServer(args.port as string)
    } catch (e) {
      this.logger.error("Start server error", {error: e})
    }
  }

  private async startServer(port?: string|number)
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

    this.slackEventListener.initSlackEvents();
    expressApp.use('/api/slack', this.injector.get(EXPRESS_SLACK_API_TOKEN));
    expressApp.use('/api/doc', express.static('./resources/public'));
    expressApp.use('/api', apiExpressMiddleware(this.injector));

    expressApp.get('/api/health-check', (request, response) => {
      const redis = this.injector.get(REDIS_TOKEN).status === 'connected';
      const postgres = this.injector.get(Connection).isConnected

      response.status(redis && postgres ? 200 : 500);
      response.setHeader('Content-type', 'application/json')
      response.send({redis, postgres});
    });

    // todo fallback expressApp.use('/', () => {});

    const options = {}
    port = port || 3001

    this.logger.debug(`Start server. Listen ${port}`);
    const server = http.createServer(options, expressApp)

    if (fs.existsSync(port as any)) {
      fs.unlinkSync(port as any);
    }

    server.listen(port)
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
      this.injector.get(QUEUE_LIST).forEach(q => q.close())
      this.redis.disconnect()
    } catch (e) {
      if (!e.message.startsWith('Connection is closed')) {
        this.logger.error('Close redis error', {error: e})
      }
    }
  }
}
