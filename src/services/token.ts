import {InjectionToken} from 'injection-js';
import {IAppConfig} from "./providers";
import {Redis} from "ioredis";
import {Observable} from "rxjs";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";
import {Logger as PinoLogger} from "pino";

export const CONFIG_TOKEN = new InjectionToken<IAppConfig>('app.config');
export const REDIS_TOKEN = new InjectionToken<Redis>('app.redis');
export const MIKRO_TOKEN = new InjectionToken<Promise<MikroORM<PostgreSqlDriver>>>('app.mikro');
export const LOG_TOKEN = new InjectionToken<PinoLogger>('app.log');
export const TERMINATE = new InjectionToken<Observable<void>>('terminate')
