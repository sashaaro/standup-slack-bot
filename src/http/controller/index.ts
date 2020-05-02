import {Request, Response} from "express";
import {ChannelsAction} from "./channels";
import {UpdateChannelAction} from "./UpdateChannelAction";
import {SettingsAction} from "./settings";
import {StandUpsAction} from "./standUps";
import {SyncAction} from "./sync";
import {OauthAuthorize} from "./oauth-authorize";

export const templateDirPath = './resources/templates'

export interface IHttpAction {
  handle(req: Request, res: Response)
}

const actions = [
  OauthAuthorize,
  ChannelsAction,
  UpdateChannelAction,
  SettingsAction,
  StandUpsAction,
  SyncAction
]

export default actions.filter((a) => !!a)

