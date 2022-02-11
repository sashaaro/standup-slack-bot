import {InjectionToken} from 'injection-js';
import {IAppConfig} from "./providers";
import {Redis} from "ioredis";
import {Observable} from "rxjs";
import {Configuration, MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import pino from "pino";

export const CONFIG_TOKEN = new InjectionToken<IAppConfig>('app.config');
export const REDIS_TOKEN = new InjectionToken<Redis>('app.redis');
export const MIKRO_CONFIG_TOKEN = new InjectionToken<Configuration<PostgreSqlDriver>>('app.mikro.config');
export const MIKRO_TOKEN = new InjectionToken<Promise<MikroORM<PostgreSqlDriver>>>('app.mikro');
export const LOG_TOKEN = new InjectionToken<pino.Logger>('app.log');
export const TERMINATE = new InjectionToken<Observable<void>>('terminate')
export const TERMINATE_HANDLER = new InjectionToken<() => {}>('terminate.handler')
