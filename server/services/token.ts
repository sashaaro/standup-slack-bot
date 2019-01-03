import {Token} from "typedi";
import {IAppConfig} from "../index";

export const CONFIG_TOKEN = new Token<IAppConfig>('app.config')
