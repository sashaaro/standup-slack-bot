import {Request, Response} from "express";
import {MainAction} from "./main";
import {ChannelsAction} from "./channels";
import {UpdateChannelAction} from "./UpdateChannelAction";
import {SettingsAction} from "./settings";
import {StandUpsAction} from "./standUps";
import {SyncAction} from "./sync";
import {ApiSlackInteractive} from "./apiSlackInteractive";
import {OauthAuthrize} from "./oauth-authrize";

export const templateDirPath = './resources/templates'

export interface IHttpAction {
  handle(req: Request, res: Response)
}

const actions = [
  ApiSlackInteractive,
  MainAction,
  OauthAuthrize,
  ChannelsAction,
  UpdateChannelAction,
  SettingsAction,
  StandUpsAction,
  SyncAction
]

export default actions.filter((a) => !!a)

