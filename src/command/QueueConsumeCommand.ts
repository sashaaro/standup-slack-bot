import * as yargs from "yargs";
import {createProviders} from "../services/providers";
import {ReflectiveInjector} from "injection-js";
import {SlackTransport} from "../slack/SlackTransport";
import {IWorkerFactory, WORKER_FACTORY_TOKEN} from "../services/token";

export class QueueConsumeCommand implements yargs.CommandModule {
  command = 'queue:consume';
  describe = 'Run';

  async handler(args: yargs.Arguments<{}>) {
    const injector = ReflectiveInjector.resolveAndCreate(createProviders(args.env as any))
    const slackTransport = injector.get(SlackTransport) as SlackTransport
    const workerFactory = injector.get(WORKER_FACTORY_TOKEN) as IWorkerFactory;
    const worker = workerFactory('main', async (job) => {
      await slackTransport.handelJob(job)
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
