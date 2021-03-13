import {InjectionToken} from 'injection-js';
import {IAppConfig} from "./providers";
import {Redis} from "ioredis";
import {Logger} from "winston";
import {Observable} from "rxjs";

export const CONFIG_TOKEN = new InjectionToken<IAppConfig>('app.config');
export const REDIS_TOKEN = new InjectionToken<Redis>('app.redis');
export const LOGGER_TOKEN = new InjectionToken<Logger>('app.logger');
export const TERMINATE = new InjectionToken<Observable<void>>('terminate')
