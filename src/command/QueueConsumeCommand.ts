import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {SlackTransport} from "../slack/SlackTransport";
import {
  IQueueFactory,
  LOGGER_TOKEN, QUEUE_FACTORY_TOKEN,
  REDIS_TOKEN,
  TERMINATE
} from "../services/token";
import {Logger} from "winston";
import {Connection} from "typeorm";
import {Redis} from "ioredis";
import StandUpBotService from "../bot/StandUpBotService";
import {QUEUE_MAIN_NAME, QUEUE_RETRY_MAIN_NAME} from "../services/providers";
import {Observable} from "rxjs";
import {Queue, Job} from "bull";

class HasPreviousError extends Error {
  public previous: Error;
}

class ConsumerError extends HasPreviousError {
  job: Job
}

export const redisReady = (redis: Redis) => {
  return new Promise((resolve, reject) => {
    if (redis.status === 'ready') {
      resolve()
    } else {
      redis.once('ready', (e) => {
        resolve()
      })
      redis.once('error', (e) => {
        reject(e)
      })
    }
  })
}

export class QueueConsumeCommand implements yargs.CommandModule {
  command = 'queue:consume';
  describe = 'Run queue consumers';

  constructor(
    private injector: Injector,
    private slackTransport: SlackTransport,
    private standUpBotService: StandUpBotService,
    @Inject(LOGGER_TOKEN) private logger: Logger,
    private connection: Connection,
    @Inject(REDIS_TOKEN) private redis: Redis,
    @Inject(QUEUE_FACTORY_TOKEN) private queueFactory: IQueueFactory,
    @Inject(TERMINATE) protected terminate$: Observable<void>
  ) {}

  builder(args: yargs.Argv) {
    return args
      .option("q", {
        alias: "queue",
        describe: "Queue name",
        demand: true,
        default: QUEUE_MAIN_NAME
      });
  }

  async handler(args: yargs.Arguments<{}>) {
    const queueName = args.queue as string
    if (![QUEUE_MAIN_NAME, QUEUE_RETRY_MAIN_NAME].includes(queueName)) {
      throw new Error(`Queue ${queueName} is not exists`);
    }

    try {
      await this.redis.connect();
    } catch (e) {
      if (!e.message.startsWith('Redis is already connecting')) {
        throw e;
      }
    }
    await redisReady(this.redis);
    await this.connection.connect();


    this.standUpBotService.listenTransport();

    const worker = this.injector.get(QUEUE_FACTORY_TOKEN)(queueName) as Queue;

    worker.process('*', async (job) => {
      const success = await this.slackTransport.handelJob(job.name, job.data)
      if (success) {
        this.logger.debug('Success handled job', {job: job})
      } else {
        const err = new ConsumerError('Not found handler')
        err.job = job;
        throw err;
      }
    })

    worker.on('process', (job) => {
      this.logger.info(`job process ${job.name} #${job.id}`, {data: job.data})
    });

    worker.on('completed', (job) => {
      this.logger.info(`job complete ${job.name} #${job.id}`)
    });

    const retryQueue = this.queueFactory(QUEUE_RETRY_MAIN_NAME);

    worker.on('failed', async (job, err) => {
      const error = new ConsumerError()
      error.previous = err
      error.job = job
      this.logger.error(`job failed ${job.name} #${job.id}`, {error: err})

      if (queueName === QUEUE_MAIN_NAME) {
        await retryQueue.add(job.name, job.data, {delay: 5000})
      } else if (queueName === QUEUE_RETRY_MAIN_NAME) {
        // todo save to file
      }
    });

    /*worker.on('closed', () => {
      console.log('closed')
      this.logger.info(`Queue ${queueName} worker closed`)

      this.connection.close()
      this.redis.disconnect()
    });*/

    this.terminate$.subscribe(() => {
      worker.close();

      this.connection.close()
      this.redis.disconnect()
    })
  }
}
