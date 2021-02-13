import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
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
import {QUEUE_NAME_SLACK_EVENTS, QUEUE_NAME_SLACK_INTERACTIVE} from "../services/providers";
import {Observable} from "rxjs";
import {Job} from "bull";
import {bind} from "../services/utils";
import {SlackEventListener} from "../slack/SlackEventListener";
import {InteractiveResponseTypeEnum} from "../slack/model/InteractiveResponse";

class HasPreviousError extends Error {
  public previous: Error;
}

class ConsumerError extends HasPreviousError {
  job: Job
}

export const redisReady = (redis: Redis): Promise<void> => {
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

  queueHandlers = {
    [QUEUE_NAME_SLACK_EVENTS]: async (job: Job) => {
      this.slackEventListener.handleEventJob(job.name, job.data)
    },
    [QUEUE_NAME_SLACK_INTERACTIVE]: (job: Job) => {
      const data = job.data;
      if (data.type === InteractiveResponseTypeEnum.block_actions) {
        this.slackEventListener.handleAction(data);
      }
      if (data.type === InteractiveResponseTypeEnum.view_submission) {
        this.slackEventListener.handleViewSubmission(data);
      }
    }
  }

  constructor(
    private injector: Injector,
    private slackEventListener: SlackEventListener,
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
        default: QUEUE_NAME_SLACK_EVENTS
      });
  }

  @bind
  async handler(args: yargs.Arguments<{}>) {
    const queue = args.queue as string;
    const availableQueues = Object.keys(this.queueHandlers);
    if (queue && !availableQueues.includes(queue)) {
      throw new Error(`Queue ${queue} is not exists`);
    }

    let queueNames = queue ? [queue] : availableQueues

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

    const queues = queueNames.map(q => this.injector.get(QUEUE_FACTORY_TOKEN)(q))

    queues.forEach(queue => {
      const handler = this.queueHandlers[queue.name]

      handler.bind(this)
      queue.process('*',  (job) => {
        //try {
          handler(job);
        //} catch (error) {
        //  this.logger.error('Job handle error', {error, job})
        //  job.discard()
        //}
      });

      queue.on('process', (job) => {
        this.logger.info(`job process ${job.name} #${job.id}`, {data: job.data})
      });

      queue.on('completed', (job) => {
        this.logger.info(`job complete ${job.name} #${job.id}`)
      });

      queue.on('failed', async (job, err) => {
        const error = new ConsumerError()
        error.previous = err
        error.job = job
        this.logger.error(`job failed ${job.name} #${job.id}`, {error: err})
        // TODO retry?!
      });
    })

    /*worker.on('closed', () => {
      console.log('closed')
      this.logger.info(`Queue ${queueName} worker closed`)

      this.connection.close()
      this.redis.disconnect()
    });*/

    this.terminate$.subscribe(() => {
      queues.forEach(q => q.close())

      this.connection.close()
      this.redis.disconnect()
    })
  }
}
