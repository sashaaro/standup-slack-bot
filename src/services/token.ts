import {InjectionToken} from 'injection-js';
import {ITimezone} from "../bot/models";
import {IAppConfig, SlackWebClientFactoryFn} from "./providers";

export const CONFIG_TOKEN = new InjectionToken<IAppConfig>('app.config')
export const TIMEZONES_TOKEN = new InjectionToken<Promise<ITimezone[]>>('app.timezones')
export const RENDER_TOKEN = new InjectionToken<Function>('app.render')
export const SLACK_WEB_CLIENT_FACTORY_TOKEN = new InjectionToken<SlackWebClientFactoryFn>('app.render')
