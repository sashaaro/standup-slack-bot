import {InjectionToken} from 'injection-js';
import {ITimezone} from "../bot/models";
import {IAppConfig, RenderFn} from "./providers";

export const CONFIG_TOKEN = new InjectionToken<IAppConfig>('app.config')
export const TIMEZONES_TOKEN = new InjectionToken<Promise<ITimezone[]>>('app.timezones')
export const RENDER_TOKEN = new InjectionToken<RenderFn>('app.render')
