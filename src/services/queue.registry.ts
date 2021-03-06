import {Inject, Injectable} from "injection-js";
import Queue from "bull";
import {CONFIG_TOKEN, TERMINATE} from "./token";
import {IAppConfig} from "./providers";
import {Observable} from "rxjs";

@Injectable()
export class QueueRegistry {
  queues: {[key: string]: Queue.Queue} = {};

  public constructor(
    @Inject(CONFIG_TOKEN) private config: IAppConfig,
    @Inject(TERMINATE) protected terminate$: Observable<void>
  ) {
    this.terminate$.subscribe(_ => {
      Object.values(this.queues).forEach(q => q.close());
    })
  }

  public create(queueName: string) {
    this.queues[queueName] = this.queues[queueName] || new Queue(queueName, {redis: {host: this.config.redisHost, port: 6379}});
    return this.queues[queueName];
  }
}