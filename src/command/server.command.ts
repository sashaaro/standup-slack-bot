import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {
  CONFIG_TOKEN,
  IMikroFactory,
  LOG_TOKEN, MIKRO_FACTORY_TOKEN, REDIS_TOKEN, TERMINATE,
} from "../services/token";
import express from 'express'
import 'express-async-errors';
import http from "http";
import {ApiMiddleware} from "../http/api.middleware";
import {Redis} from "ioredis";
import {Observable} from "rxjs";
import {redisReady} from "./WorkerCommand";
import * as fs from "fs";
import {bind} from "../decorator/bind";
import {errorHandler, requestContextMiddleware} from "../http/middlewares";
import {Logger} from "pino";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";

export class ServerCommand implements yargs.CommandModule {
  static meta: Partial<yargs.CommandModule<any, any>> = {
    command: 'server:run',
    describe: 'Run server',
    builder: ServerCommand.builder
  };

  private mikroORM: MikroORM<PostgreSqlDriver>

  constructor(
    private injector: Injector,
    @Inject(MIKRO_FACTORY_TOKEN) private mikroFactory: IMikroFactory,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(LOG_TOKEN) protected log: Logger,
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
    this.mikroORM = await this.mikroFactory('Standup Bot Server')
    await this.mikroORM.connect()

    try {
      await this.redis.connect();
    } catch (e) {
      if (!e.message.startsWith('Redis is already connecting')) {
        throw e;
      }
    }

    await redisReady(this.redis);

    const expressApp = express();
    expressApp.disable('x-powered-by');
    expressApp.use(requestContextMiddleware);

    const apiMiddleware = new ApiMiddleware(this.injector)

    expressApp.use('/api/slack', apiMiddleware.useSlackApi(this.mikroORM));
    expressApp.use('/api/doc', express.static('./resources/public'));
    expressApp.use('/api', apiMiddleware.use(this.mikroORM));

    expressApp.get('/health-check', async (request, response) => {
      const redis = this.redis.status === 'connected';
      const postgres = await this.mikroORM.isConnected()

      response.status(redis && postgres ? 200 : 500);
      response.setHeader('Content-type', 'application/json')
      response.send({redis, postgres});
    });

    expressApp.use('/', (req, res) => res.redirect(301, '/api'));

    expressApp.use(errorHandler(this.injector.get(CONFIG_TOKEN).env !== 'prod', this.log))

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
        this.log.info('Server closed');
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
    this.mikroORM.close().catch(e => {
      this.log.error(e, 'Close mikroORM error')
    });
    try {
      this.redis.disconnect()
    } catch (e) {
      if (!e.message.startsWith('Connection is closed')) {
        this.log.error(e, 'Close redis error')
      }
    }
  }
}
