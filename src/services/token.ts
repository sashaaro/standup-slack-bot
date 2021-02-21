import {InjectionToken} from 'injection-js';
import {IAppConfig} from "./providers";
import {Queue} from "bull";
import {Redis} from "ioredis";
import express from 'express'
import {Logger} from "winston";
import {Observable} from "rxjs";

export interface IQueueFactory {
  (queueName: string): Queue;
}

export const CONFIG_TOKEN = new InjectionToken<IAppConfig>('app.config');
export const REDIS_TOKEN = new InjectionToken<Redis>('app.redis');
export const QUEUE_FACTORY_TOKEN = new InjectionToken<IQueueFactory>('app.queue_factory');
export const QUEUE_LIST = new InjectionToken<Queue[]>('app.queue_list');
export const EXPRESS_SLACK_API_TOKEN = new InjectionToken<express.Router>('app.express_slack_api');
export const LOGGER_TOKEN = new InjectionToken<Logger>('app.logger');
export const TERMINATE = new InjectionToken<Observable<void>>('terminate')
