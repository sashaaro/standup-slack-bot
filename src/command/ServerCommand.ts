import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {
  LOG_TOKEN, REDIS_TOKEN, TERMINATE,
} from "../services/token";
import {Connection} from "typeorm";
import express from 'express'
import 'express-async-errors';
import http from "http";
import {ApiMiddleware} from "../http/ApiMiddleware";
import {Redis} from "ioredis";
import {Observable} from "rxjs";
import {redisReady} from "./QueueConsumeCommand";
import * as fs from "fs";
import {SlackEventListener} from "../slack/slack-event-listener";
import {bind} from "../services/decorators";

export class ServerCommand implements yargs.CommandModule {
  static meta: Partial<yargs.CommandModule<any, any>> = {
    command: 'server:run',
    describe: 'Run server',
    builder: ServerCommand.builder
  };

  constructor(
    private injector: Injector,
    private connection: Connection,
    private slackEventListener: SlackEventListener,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(LOG_TOKEN) protected log,
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
      this.log.error(e, "Start server error")
    }
  }

  private async startServer(port?: string|number)
  {
    if (!this.connection.isConnected) {
      await this.connection.connect();
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
    expressApp.use('/api/slack', apiMiddleware.useSlackApi());
    this.slackEventListener.initSlackEvents();

    expressApp.use('/api/doc', express.static('./resources/public'));
    expressApp.use('/api', apiMiddleware.use());

    expressApp.get('/api/health-check', (request, response) => {
      const redis = this.redis.status === 'connected';
      const postgres = this.injector.get(Connection).isConnected

      response.status(redis && postgres ? 200 : 500);
      response.setHeader('Content-type', 'application/json')
      response.send({redis, postgres});
    });

    // todo fallback expressApp.use('/', () => {});

    const options = {}
    port = port || 3001

    this.log.info(`Start server. Listen ${port}`);
    const server = http.createServer(options, expressApp)

    if (fs.existsSync(port as any)) {
      fs.unlinkSync(port as any);
    }

    server.listen(port)
      .on('error', (error) => {
        this.log.error(error, 'Server error');
        this.close();
      })
      .on('close', () => {
        this.log.debug('Server closed');
        this.close();
      });

    this.terminate$.subscribe(() => {
      server.close((error) => {
        if (error) {
          this.log.error(error, 'Sever closing');
        }
      });
    })
  }

  private close() {
    this.connection.close()
    try {
      this.redis.disconnect()
    } catch (e) {
      if (!e.message.startsWith('Connection is closed')) {
        this.log.error(e, 'Close redis error')
      }
    }
  }
}
