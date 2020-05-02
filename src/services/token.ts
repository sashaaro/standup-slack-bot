import {InjectionToken} from 'injection-js';
import {ITimezone} from "../bot/models";
import {IAppConfig, RenderFn} from "./providers";
import {Processor, Queue, Worker} from "bullmq";
import {Redis} from "ioredis";
import express from 'express'

export interface IQueueFactory {
  (queueName: string): Queue;
}

export interface IWorkerFactory {
  (queueName: string, processor: Processor): Worker;
}

export const CONFIG_TOKEN = new InjectionToken<IAppConfig>('app.config')
export const TIMEZONES_TOKEN = new InjectionToken<Promise<ITimezone[]>>('app.timezones')
export const RENDER_TOKEN = new InjectionToken<RenderFn>('app.render')
export const REDIS_TOKEN = new InjectionToken<Redis>('app.redis')
export const QUEUE_FACTORY_TOKEN = new InjectionToken<IQueueFactory>('app.queue_factory')
export const WORKER_FACTORY_TOKEN = new InjectionToken<IWorkerFactory>('app.worker_factory')
export const EXPRESS_DASHBOARD_TOKEN = new InjectionToken<express.Router>('app.express_dashboard')
export const EXPRESS_SLACK_API_TOKEN = new InjectionToken<express.Router>('app.express_slack_api')
