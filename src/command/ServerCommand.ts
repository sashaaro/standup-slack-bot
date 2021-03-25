import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {
  LOGGER_TOKEN, MIKRO_TOKEN, REDIS_TOKEN, TERMINATE,
} from "../services/token";
import express from 'express'
import 'express-async-errors';
import http from "http";
import {ApiMiddleware} from "../http/ApiMiddleware";
import {Redis} from "ioredis";
import {Logger} from "winston";
import {Observable} from "rxjs";
import {redisReady} from "./QueueConsumeCommand";
import * as fs from "fs";
import {SlackEventListener} from "../slack/slack-event-listener";
import {bind} from "../services/decorators";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";

export class ServerCommand implements yargs.CommandModule {
  static meta: Partial<yargs.CommandModule<any, any>> = {
    command: 'server:run',
    describe: 'Run server',
    builder: ServerCommand.builder
  };

  constructor(
    private injector: Injector,
    @Inject(MIKRO_TOKEN) private mikroORM,
    private slackEventListener: SlackEventListener,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(LOGGER_TOKEN) protected logger: Logger,
    @Inject(TERMINATE) protected terminate$: Observable<void>
  ) {}

  static builder(args: yargs.Argv) {
    return args
      .positional("port", {
        alias: "p",
        describe: "Listen port",
        default: 3001,
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
    let mikroORM: MikroORM<PostgreSqlDriver>;
    mikroORM = await this.mikroORM

    if (!await mikroORM.isConnected()) {
      await mikroORM.connect()
    }

    try {
      await this.redis.connect();
    } catch (e) {
      if (!e.message.startsWith('Redis is already connecting')) {
        throw e;
      }
    }

    await redisReady(this.redis);

    const expressApp = express()

    const apiMiddleware = new ApiMiddleware(this.injector)

    expressApp.use('/api/slack', apiMiddleware.useSlackApi(mikroORM));

    this.slackEventListener.init();

    expressApp.use('/api/doc', express.static('./resources/public'));
    expressApp.use('/api', apiMiddleware.use(mikroORM));

    expressApp.get('/api/health-check', async (request, response) => {
      const redis = this.redis.status === 'connected';
      const postgres = await mikroORM.isConnected()

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
    // TODO mikroorm.close();
    try {
      this.redis.disconnect()
    } catch (e) {
      if (!e.message.startsWith('Connection is closed')) {
        this.logger.error('Close redis error', {error: e})
      }
    }
  }
}
