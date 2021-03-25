import {InjectionToken} from 'injection-js';
import {IAppConfig} from "./providers";
import {Redis} from "ioredis";
import {Logger} from "winston";
import {Observable} from "rxjs";
import {MikroORM} from "@mikro-orm/core";
import {PostgreSqlDriver} from "@mikro-orm/postgresql";

export const CONFIG_TOKEN = new InjectionToken<IAppConfig>('app.config');
export const REDIS_TOKEN = new InjectionToken<Redis>('app.redis');
export const MIKRO_TOKEN = new InjectionToken<Promise<MikroORM<PostgreSqlDriver>>>('app.mikro');
export const LOGGER_TOKEN = new InjectionToken<Logger>('app.logger');
export const TERMINATE = new InjectionToken<Observable<void>>('terminate')
