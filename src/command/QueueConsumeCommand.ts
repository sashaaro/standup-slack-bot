import * as yargs from "yargs";
import {Inject} from "injection-js";
import {SlackTransport} from "../slack/SlackTransport";
import {IWorkerFactory, WORKER_FACTORY_TOKEN} from "../services/token";

export class QueueConsumeCommand implements yargs.CommandModule {
  command = 'queue:consume';
  describe = 'Run queue consumers';

  constructor(
    @Inject(WORKER_FACTORY_TOKEN) private workerFactory: IWorkerFactory,
    @Inject(SlackTransport) private slackTransport
  ) {}

  async handler(args: yargs.Arguments<{}>) {
    const worker = this.workerFactory('main', async (job) => {
      await this.slackTransport.handelJob(job)
    });

    worker.on('process', (job) => {
      console.log(`${job.id} has process!`);
    });

    worker.on('completed', (job) => {
      console.log(`${job.id} has completed!`);
    });

    worker.on('failed', (job, err) => {
      console.log(`${job.id} has failed with ${err.message}`);
    });
  }
}
