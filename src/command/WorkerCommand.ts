import * as yargs from "yargs";
import {Inject, Injector} from "injection-js";
import {
  LOG_TOKEN, MIKRO_TOKEN,
  REDIS_TOKEN,
  TERMINATE
} from "../services/token";
import {Redis} from "ioredis";
import {emStorage, QUEUE_NAME_SLACK_EVENTS, QUEUE_NAME_SLACK_INTERACTIVE} from "../services/providers";
import {Observable} from "rxjs";
import {Job} from "bull";
import {SlackEventListener} from "../slack/slack-event-listener";
import {InteractiveResponseTypeEnum} from "../slack/model/InteractiveResponse";
import {QueueRegistry} from "../services/queue.registry";
import {HasPreviousError, initMikroORM} from "../services/utils";
import {bind} from "../decorator/bind";
import pino from "pino";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";


class JobError extends HasPreviousError {
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

export class WorkerCommand implements yargs.CommandModule {
  command = 'worker'
  describe = 'Run queue consumers'

  queueHandlers = {
    [QUEUE_NAME_SLACK_EVENTS]: async (job: Job) => {
      try {
        await this.slackEventListener.handleEventJob(job.name, job.data)
      } catch (error) {
        this.log.error(error, 'Error slack events job handling')
      }
    },
    [QUEUE_NAME_SLACK_INTERACTIVE]: async (job: Job) => {
      const data = job.data;
      try {
        if (data.type === InteractiveResponseTypeEnum.block_actions) {
          await this.slackEventListener.handleAction(data);
        } else if (data.type === InteractiveResponseTypeEnum.view_submission) {
          await this.slackEventListener.handleViewSubmission(data);
        } else {
          this.log.warn(job, 'No handler for job')
        }
      } catch (error) {
        const er = new JobError()
        er.previous = error
        er.job = job
        this.log.error(error, 'Error slack interactive job handling')
      }
    }
  }

  constructor(
    private injector: Injector,
    private slackEventListener: SlackEventListener,
    @Inject(LOG_TOKEN) private log: pino.Logger,
    @Inject(MIKRO_TOKEN) private orm: MikroORM<PostgreSqlDriver>,
    @Inject(REDIS_TOKEN) private redis: Redis,
    private queueRegistry: QueueRegistry,
    @Inject(TERMINATE) protected terminate$: Observable<void>
  ) {

  }

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
    await initMikroORM(this.orm)
    emStorage.enterWith(this.orm.em)

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

    const queues = queueNames.map(q => this.queueRegistry.create(q))

    queues.forEach(queue => {
      const handler = this.queueHandlers[queue.name]

      handler.bind(this)
      queue.process('*',  (job) => {
        handler(job);
      });

      queue.on('process', (job) => {
        this.log.trace({name: job.name, data: job.data}, `job process`)
      });

      queue.on('completed', (job) => {
        this.log.trace({name: job.name, data: job.data}, `job complete`)
      });

      queue.on('failed', async (job, err) => {
        const error = new JobError()
        error.previous = err
        error.job = job
        this.log.error(error, `job failed`)
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
    })
  }
}
