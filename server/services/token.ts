import { ReflectiveInjector, Injectable, InjectionToken } from 'injection-js';import {IAppConfig} from "../index";
import {ITimezone} from "../bot/models";

export const CONFIG_TOKEN = new InjectionToken<IAppConfig>('app.config')
export const TIMEZONES_TOKEN = new InjectionToken<Promise<ITimezone[]>>('app.timezones')
