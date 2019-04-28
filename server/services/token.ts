import {Token} from "typedi";
import {IAppConfig} from "../index";
import {ITimezone} from "../bot/models";

export const CONFIG_TOKEN = new Token<IAppConfig>('app.config')
export const TIMEZONES_TOKEN = new Token<Promise<ITimezone[]>>('app.timezones')
