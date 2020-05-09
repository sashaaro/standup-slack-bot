import {Request, Response} from "express";
import {ChannelsAction} from "./channels";
import {SettingsAction} from "./settings";
import {SyncAction} from "./sync";
import {OauthAuthorize} from "./oauth-authorize";
import {TeamAction} from "./team";

export const templateDirPath = './resources/templates'

export interface IHttpAction {
  handle(req: Request, res: Response)
}


const actions = [
  OauthAuthorize,
  ChannelsAction,
  TeamAction,
  SettingsAction,
  SyncAction
];

export default actions;
