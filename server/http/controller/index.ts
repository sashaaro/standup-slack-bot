import {Request, Response} from "express";
import {AuthAction} from "./auth";
import {ChannelsAction} from "./channels";
import {SetChannelAction} from "./setChannel";
import {SettingsAction} from "./settings";
import {StandUpsAction} from "./standUps";
import {SyncAction} from "./sync";
import {UpdateChannelAction} from "./updateChannel";
import {ApiSlackInteractive} from "./apiSlackInteractive";

export const templateDirPath = './resources/templates'

export interface IHttpAction {
  handle(req: Request, res: Response)
}

const actions = [
  ApiSlackInteractive,
  AuthAction,
  ChannelsAction,
  SetChannelAction,
  SettingsAction,
  StandUpsAction,
  SyncAction,
  UpdateChannelAction
]

export default actions.filter((a) => !!a)

