import * as yargs from "yargs";
import {Inject} from "injection-js";
import {SlackTransport} from "../slack/SlackTransport";
import {IWorkerFactory, LOGGER_TOKEN, REDIS_TOKEN, WORKER_FACTORY_TOKEN} from "../services/token";
import {Logger} from "winston";
import {Connection} from "typeorm";
import {Redis} from "ioredis";

export class QueueConsumeCommand implements yargs.CommandModule {
  command = 'queue:consume';
  describe = 'Run queue consumers';

  constructor(
    @Inject(WORKER_FACTORY_TOKEN) private workerFactory: IWorkerFactory,
    @Inject(SlackTransport) private slackTransport,
    @Inject(LOGGER_TOKEN) private logger: Logger,
    private connection: Connection,
    @Inject(REDIS_TOKEN) private redis: Redis,
  ) {}

  private ready() {
    return new Promise((resolve) => {
      this.redis.once('ready', () => {
        resolve()
      })
    })
  }

  async handler(args: yargs.Arguments<{}>) {
    await this.ready();
    await this.connection.connect();

    const worker = this.workerFactory('main', async (job) => {
      await this.slackTransport.handelJob(job)
    });

    worker.on('process', (job) => {
      this.logger.info(`job process ${job.id}`, {data: job.data})
    });

    worker.on('completed', (job) => {
      this.logger.info(`job complete ${job.id}`)
    });

    worker.on('failed', (job, err) => {
      console.log(err.stack)
      this.logger.info(`job failed ${job.name} #${job.id}`, {error: err})
    });
  }
}
